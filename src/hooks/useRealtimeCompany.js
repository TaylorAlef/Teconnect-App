import { useEffect, useRef, useState } from 'react';

const TABLES = [
  'employees',
  'time_entries',
  'attendance_days',
  'shifts',
  'shift_assignments',
  'vacation_requests',
  'overtime_records',
  'timesheet_adjustments',
  'absences',
  'timesheets',
  'notifications',
  'hr_alerts',
  'hr_tasks',
  'hr_task_audit',
  'payroll_runs',
  'payroll_items',
  'integration_jobs',
  'picagens',
];

function publishStatus(status) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('teconnect:realtime-status', { detail: { status } }));
}

export function useRealtimeCompany(supabase, companyId, onChange) {
  const callbackRef = useRef(onChange);
  const refreshTimerRef = useRef(null);
  const pendingRef = useRef(null);
  const [status, setStatus] = useState('DISCONNECTED');

  useEffect(() => { callbackRef.current = onChange; }, [onChange]);

  useEffect(() => {
    if (!companyId) {
      publishStatus('DISCONNECTED');
      return undefined;
    }

    const channel = supabase.channel(`teconnect-company-${companyId}`);
    const emit = (table, payload) => {
      pendingRef.current = { table, payload };
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = window.setTimeout(() => {
        refreshTimerRef.current = null;
        const pending = pendingRef.current;
        pendingRef.current = null;
        callbackRef.current?.(pending);
      }, 350);
    };

    TABLES.forEach((table) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `company_id=eq.${companyId}` },
        (payload) => emit(table, payload),
      );
    });

    channel.subscribe((nextStatus) => {
      setStatus(nextStatus);
      publishStatus(nextStatus);
    });

    return () => {
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
      pendingRef.current = null;
      supabase.removeChannel(channel);
      setStatus('DISCONNECTED');
      publishStatus('DISCONNECTED');
    };
  }, [supabase, companyId]);

  return { status };
}

export const realtimeTables = TABLES;
