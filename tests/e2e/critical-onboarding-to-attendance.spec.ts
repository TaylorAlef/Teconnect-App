import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { createHmac } from 'node:crypto';
import {
  ADMIN_ACCOUNT,
  DEPARTMENT,
  EMPLOYEE_ACCOUNT,
  OUTSIDE_LOCATION,
  SHIFT,
  WORK_LOCATION,
  today,
} from './support/fixtures';
import {
  assertStagingTenant,
  confirmUser,
  findEmployeeByCode,
  findEmployeeByEmail,
  getAttendanceDay,
  setKnownPassword,
  signInAsEmployee,
  supabaseAdmin,
  waitForUserByEmail,
} from './support/supabase-admin';

function base32Decode(value: string) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = value.replace(/=+$/g, '').replace(/\s+/g, '').toUpperCase();
  let bits = '';
  for (const char of clean) {
    const index = alphabet.indexOf(char);
    if (index < 0) throw new Error(`Invalid base32 TOTP secret: ${char}`);
    bits += index.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function totp(secret: string, timestamp = Date.now()) {
  const counter = Math.floor(timestamp / 1000 / 30);
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac('sha1', base32Decode(secret)).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, '0');
}

async function loginAdminAndCompleteMfa(page: Page) {
  await page.getByRole('button', { name: 'Criar nova empresa' }).click();
  await page.getByLabel('Nome completo').fill(ADMIN_ACCOUNT.fullName);
  await page.getByLabel('Email').fill(ADMIN_ACCOUNT.email);
  await page.getByLabel('Palavra-passe').fill(ADMIN_ACCOUNT.password);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Criar conta e começar' }).click();

  const user = await waitForUserByEmail(ADMIN_ACCOUNT.email);
  await confirmUser(user.id);

  const loginButton = page.getByRole('button', { name: 'Voltar ao acesso' });
  if (await loginButton.isVisible().catch(() => false)) await loginButton.click();

  if (await page.getByRole('button', { name: 'Entrar' }).isVisible().catch(() => false)) {
    await page.getByLabel('Email').fill(ADMIN_ACCOUNT.email);
    await page.getByLabel('Palavra-passe').fill(ADMIN_ACCOUNT.password);
    await page.getByRole('button', { name: 'Entrar' }).click();
  }

  await expect(page.getByRole('heading', { name: 'Configure o autenticador' })).toBeVisible();

  await page.getByText('Não consegue ler o QR Code?').click();
  const secret = (await page.locator('details div').last().innerText()).trim();
  expect(secret).toMatch(/^[A-Z2-7 ]+$/i);

  await page.getByLabel('Código de 6 dígitos').fill(totp(secret));
  await page.getByRole('button', { name: 'Ativar MFA e continuar' }).click();

  await expect(page.getByRole('button', { name: 'Ponto' })).toBeVisible();
}

async function createCompanyThroughOnboarding(page: Page) {
  await expect(page.getByRole('heading', { name: 'Crie o ambiente da empresa' })).toBeVisible();
  await page.getByLabel('Nome da empresa').fill(ADMIN_ACCOUNT.companyName);
  await page.getByRole('button', { name: 'Criar empresa e continuar' }).click();

  await expect(page.getByRole('heading', { name: 'Crie o primeiro departamento' })).toBeVisible();
  await page.getByLabel('Nome do departamento').fill(DEPARTMENT.name);
  await page.getByRole('button', { name: 'Guardar departamento' }).click();

  await expect(page.getByRole('heading', { name: 'Configure o primeiro local' })).toBeVisible();
  await page.getByLabel('Nome do local').fill(WORK_LOCATION.name);
  await page.getByLabel('Morada').fill(WORK_LOCATION.address);
  await page.getByLabel('Latitude').fill(String(WORK_LOCATION.latitude));
  await page.getByLabel('Longitude').fill(String(WORK_LOCATION.longitude));
  await page.getByLabel('Raio de geofence (metros)').fill(String(WORK_LOCATION.gps_radius_m));
  await page.getByRole('button', { name: 'Guardar local' }).click();

  await expect(page.getByRole('heading', { name: 'Defina o primeiro turno' })).toBeVisible();
  await page.getByLabel('Nome do turno').fill(SHIFT.name);
  await page.getByLabel('Entrada').fill(SHIFT.start);
  await page.getByLabel('Saída').fill(SHIFT.end);
  await page.getByLabel('Pausa (minutos)').fill(SHIFT.breakMinutes);
  await page.getByLabel('Tolerância (minutos)').fill(SHIFT.tolerance);
  await page.getByRole('button', { name: 'Guardar turno' }).click();

  await expect(page.getByRole('heading', { name: 'Adicione o primeiro colaborador' })).toBeVisible();
  await page.getByLabel('Código').fill(EMPLOYEE_ACCOUNT.employeeCode);
  await page.getByLabel('Nome completo').fill(EMPLOYEE_ACCOUNT.fullName);
  await page.getByLabel('E-mail').fill(EMPLOYEE_ACCOUNT.email);
  await page.getByRole('button', { name: 'Criar colaborador e concluir setup' }).click();

  await expect(page.getByRole('heading', { name: 'Empresa pronta para operar' })).toBeVisible();
  await page.getByRole('button', { name: 'Entrar no workspace' }).click();
  await expect(page.getByRole('button', { name: 'Ponto' })).toBeVisible();
}

async function openEmployeeAccess(page: Page) {
  await page.getByRole('button', { name: 'Mais áreas' }).click();
  await page.getByRole('button', { name: /Acessos/ }).click();
  await expect(page.getByText('Acesso corporativo')).toBeVisible();

  const row = page.getByText(EMPLOYEE_ACCOUNT.employeeCode).locator('..').locator('..');
  const input = row.getByPlaceholder('colaborador@empresa.pt');
  await input.fill(EMPLOYEE_ACCOUNT.email);
  await row.getByRole('button', { name: 'Convidar' }).click();

  await expect(page.getByText('Convite enviado. O colaborador receberá o acesso por e-mail.')).toBeVisible();
}

async function openAdminAttendance(page: Page) {
  await page.getByRole('button', { name: 'Ponto' }).click();
  await expect(page.getByRole('heading', { name: 'Presença em tempo real' })).toBeVisible();
}

test.describe('TE-Connect critical commercial flow', () => {
  test.describe.configure({ mode: 'serial' });

  test('onboarding → convite → GPS → assiduidade', async ({ page, browser }) => {
    await page.goto('/');
    await loginAdminAndCompleteMfa(page);

    // 1) Empresa nova completa o onboarding real.
    await createCompanyThroughOnboarding(page);

    const employee = await findEmployeeByCode(EMPLOYEE_ACCOUNT.employeeCode);
    expect(employee).toBeTruthy();
    expect(employee?.email).toBe(EMPLOYEE_ACCOUNT.email);
    const companyId = employee!.company_id;
    await assertStagingTenant(companyId);

    // 2) RH/Admin convida o colaborador e o backend cria o vínculo.
    await openEmployeeAccess(page);
    const linked = await findEmployeeByEmail(EMPLOYEE_ACCOUNT.email);
    expect(linked?.user_id).toBeTruthy();
    expect(linked?.company_id).toBe(companyId);

    await setKnownPassword(linked!.user_id, EMPLOYEE_ACCOUNT.password);

    // 3) A camada servidor deve rejeitar explicitamente uma picagem fora do raio.
    const employeeSession = await signInAsEmployee(EMPLOYEE_ACCOUNT.email, EMPLOYEE_ACCOUNT.password);
    const { data: locations, error: locationError } = await employeeSession.client
      .from('work_locations')
      .select('id,name,latitude,longitude,gps_radius_m')
      .eq('company_id', companyId)
      .eq('name', WORK_LOCATION.name)
      .single();
    if (locationError) throw locationError;

    const outside = await employeeSession.client.rpc('register_time_entry', {
      p_event_type: 'CLOCK_IN',
      p_work_location_id: locations.id,
      p_latitude: OUTSIDE_LOCATION.latitude,
      p_longitude: OUTSIDE_LOCATION.longitude,
      p_gps_accuracy: 5,
      p_device: 'Playwright E2E server-negative',
    });
    expect(outside.error).toBeTruthy();
    expect(outside.error?.message || '').toMatch(/FORA_DO_RAIO|fora do raio|dist[aâ]ncia/i);

    // 4) Browser do colaborador: GPS fora é bloqueado; GPS dentro grava no servidor.
    const employeeContext = await browser.newContext({
      baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || process.env.E2E_BASE_URL,
      locale: 'pt-PT',
      timezoneId: 'Europe/Lisbon',
      geolocation: { ...OUTSIDE_LOCATION, accuracy: 5 },
      permissions: ['geolocation'],
    });
    const employeePage = await employeeContext.newPage();

    try {
      await employeePage.goto('/');
      await employeePage.getByLabel('Email').fill(EMPLOYEE_ACCOUNT.email);
      await employeePage.getByLabel('Palavra-passe').fill(EMPLOYEE_ACCOUNT.password);
      await employeePage.getByRole('button', { name: 'Entrar' }).click();
      await expect(employeePage.getByText('Registar presença')).toBeVisible();

      await employeePage.getByRole('button', { name: /Entrada.*Iniciar jornada/ }).click();
      await expect(employeePage.getByText(/Está fora do local autorizado/)).toBeVisible();

      await employeeContext.setGeolocation({ ...WORK_LOCATION, accuracy: 5 });
      await employeePage.getByRole('button', { name: /Entrada.*Iniciar jornada/ }).click();
      await expect(employeePage.getByText(/Entrada registada/)).toBeVisible();

      const attendanceDate = today();
      const recalculated = await employeeSession.client.rpc('recalculate_attendance_day', {
        p_employee_id: linked!.id,
        p_work_date: attendanceDate,
      });
      expect(recalculated.error).toBeFalsy();

      const day = await getAttendanceDay(linked!.id, attendanceDate);
      expect(day).toBeTruthy();
      expect(day?.employee_id).toBe(linked!.id);
      expect(day?.first_clock_in).toBeTruthy();
      expect(Number(day?.worked_minutes || 0)).toBeGreaterThanOrEqual(0);

      // O RH vê o mesmo resultado pela interface, não apenas no banco.
      await openAdminAttendance(page);
      const employeeRow = page.getByText(EMPLOYEE_ACCOUNT.fullName, { exact: true }).first();
      await expect(employeeRow).toBeVisible();
      await expect(page.getByText('Marcações recentes')).toBeVisible();
    } finally {
      await employeeContext.close();
    }
  });
});
