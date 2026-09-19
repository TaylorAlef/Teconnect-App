import { z } from 'zod';

export const attendanceEventSchema = z.enum([
  'CLOCK_IN',
  'BREAK_START',
  'BREAK_END',
  'CLOCK_OUT',
]);

export const attendancePunchSchema = z.object({
  eventType: attendanceEventSchema,
  workLocationId: z.string().uuid(),
  latitude: z.number().finite().gte(-90).lte(90),
  longitude: z.number().finite().gte(-180).lte(180),
  gpsAccuracy: z.number().finite().nonnegative().max(10000).optional().nullable(),
  device: z.string().trim().min(1).max(160),
});

export function validateAttendancePunch(input) {
  const parsed = attendancePunchSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message || 'Dados de picagem inválidos.' };
  }
  return { ok: true, data: parsed.data };
}
