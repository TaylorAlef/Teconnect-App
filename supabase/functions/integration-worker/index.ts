import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const workerSecret = Deno.env.get('INTEGRATION_WORKER_SECRET')
const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })

type Provider = 'SAP' | 'PHC' | 'PRIMAVERA' | 'ORACLE' | 'WEBHOOK'
type Job = {
  id: string
  company_id: string
  provider: Provider
  operation: string
  entity_type: string
  entity_id: string | null
  status: string
  payload: Record<string, unknown>
  attempts: number
  next_attempt_at: string
  idempotency_key: string
}

const MAX_ATTEMPTS = 5
const MAX_BATCH = 25
const RETRYABLE_HTTP = new Set([408, 425, 429, 500, 502, 503, 504])

function endpointFor(provider: Provider) {
  const map: Record<Provider, string | undefined> = {
    SAP: Deno.env.get('SAP_WEBHOOK_URL'),
    PHC: Deno.env.get('PHC_WEBHOOK_URL'),
    PRIMAVERA: Deno.env.get('PRIMAVERA_WEBHOOK_URL'),
    ORACLE: Deno.env.get('ORACLE_WEBHOOK_URL'),
    WEBHOOK: Deno.env.get('DEFAULT_WEBHOOK_URL'),
  }
  return map[provider]
}

function secretFor(provider: Provider) {
  const map: Record<Provider, string | undefined> = {
    SAP: Deno.env.get('SAP_WEBHOOK_SECRET'),
    PHC: Deno.env.get('PHC_WEBHOOK_SECRET'),
    PRIMAVERA: Deno.env.get('PRIMAVERA_WEBHOOK_SECRET'),
    ORACLE: Deno.env.get('ORACLE_WEBHOOK_SECRET'),
    WEBHOOK: Deno.env.get('DEFAULT_WEBHOOK_SECRET'),
  }
  return map[provider]
}

function retryAt(attempt: number) {
  const seconds = Math.min(15 * 2 ** Math.max(attempt - 1, 0), 15 * 60)
  return new Date(Date.now() + seconds * 1000).toISOString()
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function sign(secret: string, body: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  return toHex(new Uint8Array(signature))
}

async function claim(job: Job) {
  const { data, error } = await supabase
    .from('integration_jobs')
    .update({ status: 'PROCESSING', attempts: job.attempts + 1 })
    .eq('id', job.id)
    .eq('status', 'PENDING')
    .select('id,company_id,provider,operation,entity_type,entity_id,status,payload,attempts,next_attempt_at,idempotency_key')
    .maybeSingle()
  if (error) throw error
  return data as Job | null
}

async function recordAttempt(job: Job, status: string, httpStatus: number | null, error: string | null, responseExcerpt: string | null) {
  const { error: insertError } = await supabase.from('integration_job_attempts').insert({
    job_id: job.id,
    company_id: job.company_id,
    attempt_no: job.attempts,
    status,
    http_status: httpStatus,
    error,
    response_excerpt: responseExcerpt?.slice(0, 1000) || null,
  })
  if (insertError) console.error('integration attempt audit failed', insertError)
}

async function processJob(job: Job) {
  const claimed = await claim(job)
  if (!claimed) return { id: job.id, status: 'SKIPPED', reason: 'Already claimed' }

  const endpoint = endpointFor(claimed.provider)
  const secret = secretFor(claimed.provider)
  if (!endpoint || !secret) {
    const message = !endpoint ? 'Endpoint não configurado para este provider.' : 'Secret não configurado para este provider.'
    await recordAttempt(claimed, 'SKIPPED', null, message, null)
    await supabase.from('integration_jobs').update({
      status: 'SKIPPED',
      last_error: message,
      processed_at: new Date().toISOString(),
    }).eq('id', claimed.id)
    return { id: claimed.id, status: 'SKIPPED', reason: message }
  }

  const timestamp = new Date().toISOString()
  const body = JSON.stringify({
    source: 'teconnect',
    job_id: claimed.id,
    company_id: claimed.company_id,
    provider: claimed.provider,
    operation: claimed.operation,
    entity_type: claimed.entity_type,
    entity_id: claimed.entity_id,
    idempotency_key: claimed.idempotency_key,
    payload: claimed.payload,
    sent_at: timestamp,
  })

  try {
    const signature = await sign(secret, body)
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-teconnect-job-id': claimed.id,
        'x-teconnect-timestamp': timestamp,
        'x-teconnect-signature': `sha256=${signature}`,
        'idempotency-key': claimed.idempotency_key,
      },
      body,
      signal: AbortSignal.timeout(15000),
    })

    const responseText = await response.text()
    if (response.ok) {
      await recordAttempt(claimed, 'PROCESSED', response.status, null, responseText)
      await supabase.from('integration_jobs').update({
        status: 'PROCESSED',
        last_error: null,
        last_http_status: response.status,
        processed_at: new Date().toISOString(),
      }).eq('id', claimed.id)
      return { id: claimed.id, status: 'PROCESSED', http_status: response.status }
    }

    const retryable = RETRYABLE_HTTP.has(response.status)
    const exhausted = claimed.attempts >= MAX_ATTEMPTS
    const nextStatus = retryable && !exhausted ? 'PENDING' : 'FAILED'
    const message = `HTTP ${response.status}: ${responseText.slice(0, 500)}`
    await recordAttempt(claimed, nextStatus, response.status, message, responseText)
    await supabase.from('integration_jobs').update({
      status: nextStatus,
      last_error: message,
      last_http_status: response.status,
      next_attempt_at: nextStatus === 'PENDING' ? retryAt(claimed.attempts) : claimed.next_attempt_at,
      processed_at: nextStatus === 'FAILED' ? new Date().toISOString() : null,
    }).eq('id', claimed.id)
    return { id: claimed.id, status: nextStatus, http_status: response.status }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const exhausted = claimed.attempts >= MAX_ATTEMPTS
    const nextStatus = exhausted ? 'FAILED' : 'PENDING'
    await recordAttempt(claimed, nextStatus, null, message, null)
    await supabase.from('integration_jobs').update({
      status: nextStatus,
      last_error: message,
      next_attempt_at: nextStatus === 'PENDING' ? retryAt(claimed.attempts) : claimed.next_attempt_at,
      processed_at: nextStatus === 'FAILED' ? new Date().toISOString() : null,
    }).eq('id', claimed.id)
    return { id: claimed.id, status: nextStatus, error: message }
  }
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers: { 'content-type': 'application/json' } })
  }

  try {
    let companyId: string | null = null

    if (workerSecret) {
      if (request.headers.get('x-teconnect-worker-secret') !== workerSecret) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'content-type': 'application/json' } })
      }
    } else {
      // Development/fallback mode: require a signed-in HR/admin and constrain
      // processing to that actor's company. This prevents cross-tenant queue access.
      const authorization = request.headers.get('Authorization')
      if (!authorization) {
        return new Response(JSON.stringify({ error: 'AUTH_REQUIRED' }), { status: 401, headers: { 'content-type': 'application/json' } })
      }
      const client = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authorization } },
        auth: { persistSession: false, autoRefreshToken: false },
      })
      const { data: { user } } = await client.auth.getUser()
      if (!user) {
        return new Response(JSON.stringify({ error: 'AUTH_REQUIRED' }), { status: 401, headers: { 'content-type': 'application/json' } })
      }
      const { data: profile, error: profileError } = await client
        .from('profiles')
        .select('company_id,role,active')
        .eq('id', user.id)
        .maybeSingle()
      if (profileError || !profile?.active || !['SUPER_ADMIN', 'COMPANY_ADMIN', 'RH'].includes(profile.role)) {
        return new Response(JSON.stringify({ error: 'FORBIDDEN' }), { status: 403, headers: { 'content-type': 'application/json' } })
      }
      companyId = profile.company_id
    }

    let query = supabase
      .from('integration_jobs')
      .select('id,company_id,provider,operation,entity_type,entity_id,status,payload,attempts,next_attempt_at,idempotency_key')
      .eq('status', 'PENDING')
      .lte('next_attempt_at', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(MAX_BATCH)

    if (companyId) query = query.eq('company_id', companyId)

    const { data: jobs, error } = await query
    if (error) throw error

    const results = []
    for (const job of (jobs ?? []) as Job[]) results.push(await processJob(job))
    return new Response(JSON.stringify({ processed: results.length, results }), { status: 200, headers: { 'content-type': 'application/json' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { 'content-type': 'application/json' } })
  }
})
