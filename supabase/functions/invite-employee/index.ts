import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405)
  try {
    const authorization = req.headers.get('Authorization')
    if (!authorization) return json({ error: 'AUTH_REQUIRED' }, 401)
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } })
    const { data: { user: actor } } = await client.auth.getUser()
    if (!actor) return json({ error: 'AUTH_REQUIRED' }, 401)
    const { data: actorProfile } = await client.from('profiles').select('company_id,role,active').eq('id', actor.id).single()
    if (!actorProfile?.active || !['SUPER_ADMIN', 'COMPANY_ADMIN', 'RH'].includes(actorProfile.role)) return json({ error: 'FORBIDDEN' }, 403)

    const body = await req.json()
    const employeeId = String(body?.employee_id || '')
    const email = String(body?.email || '').trim().toLowerCase()
    if (!employeeId || !email || !email.includes('@')) return json({ error: 'INVALID_REQUEST' }, 400)

    const { data: employee, error: employeeError } = await client.from('employees').select('id,company_id,user_id,email,full_name,status').eq('id', employeeId).eq('company_id', actorProfile.company_id).single()
    if (employeeError || !employee) return json({ error: 'EMPLOYEE_NOT_FOUND' }, 404)
    if (employee.status !== 'ACTIVE') return json({ error: 'EMPLOYEE_INACTIVE' }, 409)
    if (employee.user_id) return json({ error: 'EMPLOYEE_ALREADY_LINKED', user_id: employee.user_id }, 409)

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${Deno.env.get('APP_URL') || 'https://app.te-connect.com'}/`,
      data: { full_name: employee.full_name, company_id: actorProfile.company_id, role: 'EMPLOYEE', employee_id: employee.id },
    })
    if (inviteError) {
      await admin.from('employee_invitations').insert({ company_id: actorProfile.company_id, employee_id: employee.id, email, status: 'ERROR', invited_by: actor.id, last_error: inviteError.message })
      const duplicate = /already registered|already been registered|email.*exists/i.test(inviteError.message || '')
      return json({ error: duplicate ? 'EMAIL_ALREADY_REGISTERED' : 'INVITE_FAILED', details: inviteError.message }, duplicate ? 409 : 502)
    }

    const invitedUser = inviteData.user
    if (!invitedUser?.id) return json({ error: 'INVITE_USER_NOT_RETURNED' }, 502)
    const { error: profileError } = await admin.from('profiles').upsert({ id: invitedUser.id, company_id: actorProfile.company_id, full_name: employee.full_name, role: 'EMPLOYEE', active: true }, { onConflict: 'id' })
    if (profileError) {
      await admin.from('employee_invitations').insert({ company_id: actorProfile.company_id, employee_id: employee.id, email, status: 'ERROR', invited_by: actor.id, last_error: profileError.message })
      return json({ error: 'PROFILE_PROVISION_FAILED' }, 500)
    }

    const { error: linkError } = await admin.from('employees').update({ user_id: invitedUser.id, email }).eq('id', employee.id).eq('company_id', actorProfile.company_id)
    if (linkError) {
      await admin.from('employee_invitations').insert({ company_id: actorProfile.company_id, employee_id: employee.id, email, status: 'ERROR', invited_by: actor.id, last_error: linkError.message })
      return json({ error: 'EMPLOYEE_LINK_FAILED' }, 500)
    }

    const { error: logError } = await admin.from('employee_invitations').insert({ company_id: actorProfile.company_id, employee_id: employee.id, email, status: 'SENT', invited_by: actor.id, expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() })
    if (logError) console.error('invitation log failed', logError)
    return json({ success: true, employee_id: employee.id, user_id: invitedUser.id, email, status: 'SENT' })
  } catch (error) {
    console.error(error)
    return json({ error: 'INTERNAL_ERROR' }, 500)
  }
})
