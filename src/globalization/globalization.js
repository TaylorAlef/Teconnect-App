const STORAGE_KEY = 'teconnect.global.preferences';

export const SUPPORTED_LOCALES = ['pt-PT', 'en-US', 'es-ES', 'fr-FR', 'de-DE'];

export const COUNTRY_DEFAULTS = {
  PT: { locale: 'pt-PT', currency: 'EUR', timeZone: 'Europe/Lisbon' },
  BR: { locale: 'pt-BR', currency: 'BRL', timeZone: 'America/Sao_Paulo' },
  ES: { locale: 'es-ES', currency: 'EUR', timeZone: 'Europe/Madrid' },
  FR: { locale: 'fr-FR', currency: 'EUR', timeZone: 'Europe/Paris' },
  DE: { locale: 'de-DE', currency: 'EUR', timeZone: 'Europe/Berlin' },
  AT: { locale: 'de-DE', currency: 'EUR', timeZone: 'Europe/Vienna' },
  CH: { locale: 'de-DE', currency: 'CHF', timeZone: 'Europe/Zurich' },
  GB: { locale: 'en-US', currency: 'GBP', timeZone: 'Europe/London' },
  IE: { locale: 'en-US', currency: 'EUR', timeZone: 'Europe/Dublin' },
  US: { locale: 'en-US', currency: 'USD', timeZone: 'America/New_York' },
  CA: { locale: 'en-US', currency: 'CAD', timeZone: 'America/Toronto' },
  AU: { locale: 'en-US', currency: 'AUD', timeZone: 'Australia/Sydney' },
  MX: { locale: 'es-ES', currency: 'MXN', timeZone: 'America/Mexico_City' },
};

const LOCALE_ALIASES = {
  'pt': 'pt-PT',
  'pt-br': 'pt-BR',
  'en': 'en-US',
  'en-gb': 'en-US',
  'es': 'es-ES',
  'fr': 'fr-FR',
  'de': 'de-DE',
};

function normalizeLocale(value) {
  if (!value) return null;
  const raw = String(value).trim();
  const lower = raw.toLowerCase();
  if (LOCALE_ALIASES[lower]) return LOCALE_ALIASES[lower];
  if (SUPPORTED_LOCALES.includes(raw)) return raw;
  return SUPPORTED_LOCALES.find((locale) => locale.toLowerCase() === lower) || null;
}

export function detectBrowserLocale() {
  const candidates = Array.isArray(navigator?.languages) ? navigator.languages : [];
  for (const candidate of [...candidates, navigator?.language]) {
    const normalized = normalizeLocale(candidate);
    if (normalized) return normalized;
  }
  return 'pt-PT';
}

export function getStoredPreferences() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
}

export function savePreferences(preferences) {
  const next = { ...getStoredPreferences(), ...preferences };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function clearPreferences() {
  localStorage.removeItem(STORAGE_KEY);
}

export function resolveGlobalPreferences(input = {}) {
  const stored = getStoredPreferences();
  const countryCode = String(input.countryCode || stored.countryCode || '').toUpperCase() || null;
  const countryDefaults = COUNTRY_DEFAULTS[countryCode] || {};
  const locale = normalizeLocale(input.locale) || normalizeLocale(stored.locale) || countryDefaults.locale || detectBrowserLocale();
  const timeZone = input.timeZone || stored.timeZone || countryDefaults.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const currency = input.currency || stored.currency || countryDefaults.currency || 'EUR';
  return { locale, countryCode, currency, timeZone };
}

function safeIntl(factory, fallback) {
  try {
    return factory();
  } catch {
    return fallback;
  }
}

export function formatNumber(value, preferences = {}, options = {}) {
  const { locale } = resolveGlobalPreferences(preferences);
  return safeIntl(() => new Intl.NumberFormat(locale, options).format(value ?? 0), String(value ?? 0));
}

export function formatCurrency(value, preferences = {}, options = {}) {
  const { locale, currency } = resolveGlobalPreferences(preferences);
  return safeIntl(
    () => new Intl.NumberFormat(locale, { style: 'currency', currency, ...options }).format(value ?? 0),
    `${currency} ${value ?? 0}`,
  );
}

export function formatDate(value, preferences = {}, options = {}) {
  const { locale, timeZone } = resolveGlobalPreferences(preferences);
  return safeIntl(
    () => new Intl.DateTimeFormat(locale, { timeZone, dateStyle: 'medium', ...options }).format(new Date(value)),
    String(value ?? ''),
  );
}

export function formatTime(value, preferences = {}, options = {}) {
  const { locale, timeZone } = resolveGlobalPreferences(preferences);
  return safeIntl(
    () => new Intl.DateTimeFormat(locale, { timeZone, timeStyle: 'short', ...options }).format(new Date(value)),
    String(value ?? ''),
  );
}

export function formatDateTime(value, preferences = {}, options = {}) {
  const { locale, timeZone } = resolveGlobalPreferences(preferences);
  return safeIntl(
    () => new Intl.DateTimeFormat(locale, { timeZone, dateStyle: 'medium', timeStyle: 'short', ...options }).format(new Date(value)),
    String(value ?? ''),
  );
}

export function getLocalePreferences(input = {}) {
  const preferences = resolveGlobalPreferences(input);
  return {
    ...preferences,
    decimalSeparator: formatNumber(1.1, preferences).replace(/1/g, ''),
    currencyFormatter: (value, options) => formatCurrency(value, preferences, options),
    dateFormatter: (value, options) => formatDate(value, preferences, options),
    timeFormatter: (value, options) => formatTime(value, preferences, options),
    dateTimeFormatter: (value, options) => formatDateTime(value, preferences, options),
  };
}

export function applyDocumentLocale(input = {}) {
  const preferences = resolveGlobalPreferences(input);
  if (typeof document !== 'undefined') {
    document.documentElement.lang = preferences.locale;
    document.documentElement.dir = 'ltr';
    document.documentElement.dataset.locale = preferences.locale;
    document.documentElement.dataset.country = preferences.countryCode || '';
    document.documentElement.dataset.currency = preferences.currency;
  }
  return preferences;
}

export function getStorageKey() {
  return STORAGE_KEY;
}
