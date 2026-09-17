import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Globe2, Save, X } from 'lucide-react';
import { COUNTRY_CATALOG, CURRENCY_CODES } from './countryCatalog.js';

const WEEK_DAYS = [
  [1, 'Monday'], [2, 'Tuesday'], [3, 'Wednesday'], [4, 'Thursday'], [5, 'Friday'], [6, 'Saturday'], [7, 'Sunday'],
];

export default function GlobalizationCenter({ profile, localization, onClose }) {
  const { preferences, supportedLocales, loading, t, update } = localization;
  const [form, setForm] = useState({ country: '', locale: 'pt-PT', currency: 'EUR', timeZone: 'Europe/Lisbon', weekStartDay: 1 });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm({
      country: preferences.countryCode || 'PT',
      locale: preferences.locale || 'pt-PT',
      currency: preferences.currency || 'EUR',
      timeZone: preferences.timeZone || 'Europe/Lisbon',
      weekStartDay: preferences.weekStartDay || 1,
    });
  }, [preferences]);

  const selectedCountry = useMemo(() => COUNTRY_CATALOG.find((item) => item.code === form.country), [form.country]);

  const chooseCountry = (value) => {
    const country = COUNTRY_CATALOG.find((item) => item.code === value);
    if (!country) return;
    setForm((current) => ({
      ...current,
      country: country.code,
      locale: country.locale,
      currency: country.currency,
      timeZone: country.timeZone,
    }));
    setSaved(false);
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await update({
        countryCode: form.country,
        locale: form.locale,
        currency: form.currency,
        timeZone: form.timeZone,
        weekStartDay: Number(form.weekStartDay),
      });
      setSaved(true);
    } catch (saveError) {
      setError(saveError?.message || 'Unable to save localization settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section style={{ maxWidth: 980, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 18, marginBottom: 18 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#9aa7ff', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.10em' }}><Globe2 size={14} /> Global People OS</div>
          <h1 style={{ margin: '8px 0 5px', fontSize: 30, letterSpacing: '-.04em' }}>{t('global.title')}</h1>
          <p style={{ margin: 0, color: 'rgba(255,255,255,.52)', fontSize: 13 }}>{t('global.subtitle')} · {profile?.company_name || 'Company'}</p>
        </div>
        <button type="button" className="tc-btn" onClick={onClose}><X size={16} /> {t('global.cancel')}</button>
      </div>

      <form onSubmit={save} style={{ padding: 22, borderRadius: 20, border: '1px solid rgba(255,255,255,.10)', background: 'linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.018))', boxShadow: '0 22px 70px rgba(0,0,0,.22)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 14 }}>
          <label style={{ display: 'grid', gap: 7 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.65)', fontWeight: 700 }}>{t('global.country')}</span>
            <select value={form.country} onChange={(event) => chooseCountry(event.target.value)} disabled={loading || saving} style={fieldStyle}>
              {COUNTRY_CATALOG.map((country) => <option key={country.code} value={country.code}>{country.name} ({country.code})</option>)}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 7 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.65)', fontWeight: 700 }}>{t('global.language')}</span>
            <select value={form.locale} onChange={(event) => { setForm((current) => ({ ...current, locale: event.target.value })); setSaved(false); }} disabled={loading || saving} style={fieldStyle}>
              {supportedLocales.map((locale) => <option key={locale} value={locale}>{locale}</option>)}
            </select>
            <small style={hintStyle}>{t('global.languageHint')}</small>
          </label>
          <label style={{ display: 'grid', gap: 7 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.65)', fontWeight: 700 }}>{t('global.currency')}</span>
            <select value={form.currency} onChange={(event) => { setForm((current) => ({ ...current, currency: event.target.value })); setSaved(false); }} disabled={loading || saving} style={fieldStyle}>
              {CURRENCY_CODES.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
            </select>
            <small style={hintStyle}>{t('global.currencyHint')}</small>
          </label>
          <label style={{ display: 'grid', gap: 7 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.65)', fontWeight: 700 }}>{t('global.timezone')}</span>
            <input value={form.timeZone} onChange={(event) => { setForm((current) => ({ ...current, timeZone: event.target.value })); setSaved(false); }} disabled={loading || saving} style={fieldStyle} spellCheck="false" />
            <small style={hintStyle}>{selectedCountry?.timeZone || 'IANA timezone identifier'}</small>
          </label>
          <label style={{ display: 'grid', gap: 7 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.65)', fontWeight: 700 }}>{t('global.weekStart')}</span>
            <select value={form.weekStartDay} onChange={(event) => { setForm((current) => ({ ...current, weekStartDay: Number(event.target.value) })); setSaved(false); }} disabled={loading || saving} style={fieldStyle}>
              {WEEK_DAYS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>

        {(error || saved) && (
          <div style={{ marginTop: 16, padding: '11px 13px', borderRadius: 12, border: `1px solid ${error ? 'rgba(239,68,68,.22)' : 'rgba(34,197,94,.22)'}`, background: error ? 'rgba(239,68,68,.08)' : 'rgba(34,197,94,.08)', color: error ? '#fca5a5' : '#86efac', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={15} /> {error || t('global.saved')}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button type="button" className="tc-btn" onClick={onClose}>{t('global.cancel')}</button>
          <button type="submit" className="tc-btn tc-btn-primary" disabled={loading || saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Save size={15} /> {saving ? t('global.saving') : t('global.save')}
          </button>
        </div>
      </form>
    </section>
  );
}

const fieldStyle = {
  width: '100%', boxSizing: 'border-box', minHeight: 44, padding: '0 12px', borderRadius: 11,
  border: '1px solid rgba(255,255,255,.10)', background: 'rgba(5,10,22,.72)', color: '#fff', outline: 'none', fontSize: 12,
};

const hintStyle = { color: 'rgba(255,255,255,.38)', fontSize: 10, lineHeight: 1.4 };
