import { randomUUID } from 'node:crypto';

const runId = randomUUID().slice(0, 8);

export const WORK_LOCATION = {
  name: `E2E Sede ${runId}`,
  address: 'Praça Marquês de Pombal, Lisboa',
  latitude: 38.7253,
  longitude: -9.1500,
  gps_radius_m: 200,
};

export const OUTSIDE_LOCATION = {
  latitude: 38.7500,
  longitude: -9.1500,
};

export const ADMIN_ACCOUNT = {
  fullName: `E2E Admin ${runId}`,
  email: `e2e-admin-${runId}@te-connect.test`,
  password: `E2eAdmin!${runId}`,
  companyName: `E2E Empresa ${runId}`,
};

export const EMPLOYEE_ACCOUNT = {
  fullName: `E2E Colaborador ${runId}`,
  employeeCode: `E2E-${runId}`,
  email: `e2e-employee-${runId}@te-connect.test`,
  password: `E2eEmployee!${runId}`,
};

export const SHIFT = {
  name: `Turno E2E ${runId}`,
  start: '09:00',
  end: '18:00',
  breakMinutes: '60',
  tolerance: '5',
};

export const DEPARTMENT = {
  name: `RH E2E ${runId}`,
};

export const today = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Lisbon',
}).format(new Date());

export { runId };
