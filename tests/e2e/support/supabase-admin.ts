import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_STAGING_URL || '';
const serviceRoleKey = process.env.SUPABASE_STAGING_SERVICE_ROLE_KEY || '';
const publishableKey = process.env.SUPABASE_STAGING_PUBLISHABLE_KEY || '';

if (!url || !serviceRoleKey || !publishableKey) {
  throw new Error(
    'Missing SUPABASE_STAGING_URL, SUPABASE_STAGING_SERVICE_ROLE_KEY or SUPABASE_STAGING_PUBLISHABLE_KEY.'
  );
}

if (/kegmysndcrytlsuclhsq/i.test(url) || /supabase\.co/i.test(url) && url.includes('kegmysndcrytlsuclhsq')) {
  throw new Error('E2E safety stop: the critical suite refuses to run against the known production Supabase project.');
}

if (process.env.E2E_ALLOW_STAGING !== 'true') {
  throw new Error('E2E safety stop: set E2E_ALLOW_STAGING=true explicitly.');
}

export const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const supabaseAnon = createClient(url, publishableKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function waitForUserByEmail(email: string, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  do {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw error;
    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    await new Promise((resolve) => setTimeout(resolve, 500));
  } while (Date.now() < deadline);
  throw new Error(`Timed out waiting for Supabase Auth user: ${email}`);
}

export async function confirmUser(userId: string) {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    email_confirm: true,
  });
  if (error) throw error;
}

export async function setKnownPassword(userId: string, password: string) {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password,
    email_confirm: true,
  });
  if (error) throw error;
}

export async function findEmployeeByEmail(email: string) {
  const { data, error } = await supabaseAdmin
    .from('employees')
    .select('id,company_id,employee_code,full_name,email,user_id,status')
    .eq('email', email)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function findEmployeeByCode(employeeCode: string) {
  const { data, error } = await supabaseAdmin
    .from('employees')
    .select('id,company_id,employee_code,full_name,email,user_id,status')
    .eq('employee_code', employeeCode)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getAttendanceDay(employeeId: string, workDate: string) {
  const { data, error } = await supabaseAdmin
    .from('attendance_days')
    .select('id,employee_id,work_date,status,first_clock_in,last_clock_out,worked_minutes,overtime_minutes,late_minutes,early_leave_minutes,night_minutes')
    .eq('employee_id', employeeId)
    .eq('work_date', workDate)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function assertStagingTenant(companyId: string) {
  const { data, error } = await supabaseAdmin
    .from('companies')
    .select('id,name')
    .eq('id', companyId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`Staging company not found: ${companyId}`);
  return data;
}

export async function signInAsEmployee(email: string, password: string) {
  const client = createClient(url, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { client, session: data.session };
}

export type { SupabaseClient };
