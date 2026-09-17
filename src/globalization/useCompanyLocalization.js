import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { applyDocumentLocale, resolveGlobalPreferences, SUPPORTED_LOCALES } from './globalization.js';
import { translate } from './messages.js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: true, autoRefreshToken: true } },
);

const EMPTY = { countryCode: 'PT', locale: 'pt-PT', currency: 'EUR', timeZone: 'Europe/Lisbon', weekStartDay: 1 };

function assertValidTimeZone(timeZone) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format();
  } catch {
    throw new Error('Invalid IANA timezone.');
  }
}

export function useCompanyLocalization(companyId) {
  const [companySettings, setCompanySettings] = useState(EMPTY);
  const [loading, setLoading] = useState(Boolean(companyId));

  const refresh = useCallback(async () => {
    if (!companyId) {
      setCompanySettings(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('country_code,locale_code,currency_code,timezone,week_start_day')
        .eq('company_id', companyId)
        .maybeSingle();
      if (!error && data) {
        setCompanySettings({
          countryCode: data.country_code,
          locale: data.locale_code,
          currency: data.currency_code,
          timeZone: data.timezone,
          weekStartDay: data.week_start_day || 1,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { refresh(); }, [refresh]);

  const preferences = useMemo(
    () => resolveGlobalPreferences(companySettings, { useStored: false }),
    [companySettings],
  );

  useEffect(() => {
    applyDocumentLocale(preferences, { useStored: false });
  }, [preferences]);

  const t = useCallback((key, fallback) => translate(preferences.locale, key, fallback), [preferences.locale]);

  const update = useCallback(async (patch) => {
    if (!companyId) throw new Error('Company context is required.');
    const normalized = {
      countryCode: patch.countryCode ?? companySettings.countryCode,
      locale: patch.locale ?? companySettings.locale,
      currency: patch.currency ?? companySettings.currency,
      timeZone: patch.timeZone ?? companySettings.timeZone,
      weekStartDay: patch.weekStartDay ?? companySettings.weekStartDay ?? 1,
    };
    assertValidTimeZone(normalized.timeZone);

    const payload = {
      country_code: normalized.countryCode,
      locale_code: normalized.locale,
      currency_code: normalized.currency,
      timezone: normalized.timeZone,
      week_start_day: Number(normalized.weekStartDay),
    };

    let { error } = await supabase.from('company_settings').update(payload).eq('company_id', companyId);
    if (error) {
      const fallback = await supabase.from('company_settings').insert({ company_id: companyId, ...payload });
      error = fallback.error;
    }
    if (error) throw error;

    setCompanySettings(normalized);
    applyDocumentLocale(normalized, { useStored: false });
    return normalized;
  }, [companyId, companySettings]);

  return {
    companyId,
    preferences: { ...preferences, weekStartDay: companySettings.weekStartDay || 1 },
    supportedLocales: SUPPORTED_LOCALES,
    loading,
    t,
    update,
    refresh,
  };
}
