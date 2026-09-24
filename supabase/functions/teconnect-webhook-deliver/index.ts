import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const ALLOWED_ORIGINS = new Set([
  "https://app.te-connect.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

function corsHeaders(origin: string | null) {
  const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://app.te-connect.com";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
const supabaseUrl=Deno.env.get("SUPABASE_URL")!;
const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false}});
const json=(body:unknown,status=200,origin:string|null=null)=>new Response(JSON.stringify(body),{
  status,
  headers:{
    ...corsHeaders(origin),
    "Content-Type":"application/json; charset=utf-8",
    "Cache-Control":"no-store",
  },
});

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((x) => x.toString(16).padStart(2, "0")).join("");
}

// --- SSRF protection: block deliveries to private/reserved/internal targets ---
function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const v = Number(p);
    if (v < 0 || v > 255) return null;
    n = (n << 8) | v;
  }
  return n >>> 0;
}

function isPrivateOrReservedIPv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n === null) return false;
  const inRange = (base: string, bits: number) => {
    const baseInt = ipv4ToInt(base)!;
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (n & mask) === (baseInt & mask);
  };
  return (
    inRange("0.0.0.0", 8) ||
    inRange("10.0.0.0", 8) ||
    inRange("100.64.0.0", 10) ||
    inRange("127.0.0.0", 8) ||
    inRange("169.254.0.0", 16) ||
    inRange("172.16.0.0", 12) ||
    inRange("192.0.0.0", 24) ||
    inRange("192.0.2.0", 24) ||
    inRange("192.168.0.0", 16) ||
    inRange("198.18.0.0", 15) ||
    inRange("198.51.100.0", 24) ||
    inRange("203.0.113.0", 24) ||
    inRange("224.0.0.0", 4) ||
    inRange("240.0.0.0", 4)
  );
}

function isPrivateOrReservedIPv6(ip: string): boolean {
  const v = ip.toLowerCase();
  return (
    v === "::1" ||
    v === "::" ||
    v.startsWith("fe80:") ||
    v.startsWith("fc") ||
    v.startsWith("fd") ||
    v.startsWith("::ffff:")
  );
}

function looksLikeIPv4(host: string): boolean {
  return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host);
}

async function assertPublicHttpsUrl(rawUrl: string): Promise<{ ok: true; url: URL } | { ok: false; reason: string }> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "INVALID_URL" };
  }
  if (url.protocol !== "https:") {
    return { ok: false, reason: "HTTPS_REQUIRED" };
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    return { ok: false, reason: "DISALLOWED_HOST" };
  }
  if (looksLikeIPv4(host) && isPrivateOrReservedIPv4(host)) {
    return { ok: false, reason: "DISALLOWED_HOST" };
  }
  if (host.includes(":") && isPrivateOrReservedIPv6(host)) {
    return { ok: false, reason: "DISALLOWED_HOST" };
  }
  try {
    const records = await Deno.resolveDns(host, "A").catch(() => [] as string[]);
    const records6 = await Deno.resolveDns(host, "AAAA").catch(() => [] as string[]);
    for (const ip of records) {
      if (isPrivateOrReservedIPv4(ip)) return { ok: false, reason: "DISALLOWED_HOST" };
    }
    for (const ip of records6) {
      if (isPrivateOrReservedIPv6(ip)) return { ok: false, reason: "DISALLOWED_HOST" };
    }
  } catch {
    // resolveDns unsupported in this runtime — literal-IP/scheme checks above still apply.
  }
  return { ok: true, url };
}
// -------------------------------------------------------------------------

Deno.serve(async(req)=>{
const origin=req.headers.get("Origin");
if(req.method==="OPTIONS")return new Response("ok",{status:204,headers:corsHeaders(origin)});
if(req.method!=="POST")return json({error:"METHOD_NOT_ALLOWED"},405,origin);
const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"").trim();if(!token)return json({error:"AUTH_REQUIRED"},401,origin);const {data:userData,error:userError}=await admin.auth.getUser(token);if(userError||!userData.user)return json({error:"AUTH_REQUIRED"},401,origin);const {data:profile,error:profileError}=await admin.from("profiles").select("id,company_id,role,active").eq("id",userData.user.id).maybeSingle();if(profileError||!profile?.company_id||!profile.active||!["SUPER_ADMIN","COMPANY_ADMIN","RH"].includes(profile.role))return json({error:"FORBIDDEN"},403,origin);let input:{endpoint_id?:string;event_type?:string;payload?:Record<string,unknown>};try{input=await req.json()}catch{return json({error:"INVALID_JSON"},400,origin)}if(!input.endpoint_id||!input.event_type)return json({error:"ENDPOINT_AND_EVENT_REQUIRED"},400,origin);const {data:endpoint,error:endpointError}=await admin.from("webhook_endpoints").select("id,company_id,name,url,events,active").eq("id",input.endpoint_id).eq("company_id",profile.company_id).maybeSingle();if(endpointError||!endpoint||!endpoint.active)return json({error:"ENDPOINT_NOT_FOUND"},404,origin);if(!Array.isArray(endpoint.events)||!endpoint.events.includes(input.event_type))return json({error:"EVENT_NOT_ENABLED"},400,origin);const {data:credential,error:credentialError}=await admin.from("webhook_endpoint_credentials").select("secret").eq("endpoint_id",endpoint.id).eq("company_id",profile.company_id).maybeSingle();if(credentialError||!credential?.secret)return json({error:"WEBHOOK_CREDENTIAL_NOT_FOUND"},500,origin);

const urlCheck = await assertPublicHttpsUrl(endpoint.url);
if (!urlCheck.ok) {
  return json({ error: "ENDPOINT_URL_NOT_ALLOWED", reason: urlCheck.reason }, 400, origin);
}

const payload={id:crypto.randomUUID(),event:input.event_type,occurred_at:new Date().toISOString(),data:input.payload||{}};const body=JSON.stringify(payload);const signature=await hmacSha256Hex(credential.secret, body);const deliveryId=crypto.randomUUID();const insert=await admin.from("webhook_deliveries").insert({id:deliveryId,company_id:profile.company_id,endpoint_id:endpoint.id,event_type:input.event_type,payload,status:"PENDING",attempt:1});if(insert.error)return json({error:"DELIVERY_CREATE_FAILED"},500,origin);let status="FAILED";let httpStatus:number|null=null;let excerpt="";try{const r=await fetch(urlCheck.url.toString(),{method:"POST",headers:{"Content-Type":"application/json","User-Agent":"Te-connect-Webhooks/1.0","X-Teconnect-Event":input.event_type,"X-Teconnect-Signature":`sha256=${signature}`},body,redirect:"manual"});httpStatus=r.status;excerpt=(await r.text()).slice(0,500);status=r.ok?"DELIVERED":"FAILED"}catch(error){excerpt=error instanceof Error?error.message.slice(0,500):"NETWORK_ERROR"}await admin.from("webhook_deliveries").update({status,http_status:httpStatus,response_excerpt:excerpt,delivered_at:status==="DELIVERED"?new Date().toISOString():null}).eq("id",deliveryId);await admin.from("webhook_endpoints").update({last_delivery_at:new Date().toISOString(),last_status:httpStatus}).eq("id",endpoint.id);return json({ok:status==="DELIVERED",delivery_id:deliveryId,status,http_status:httpStatus,response:excerpt},200,origin)});
