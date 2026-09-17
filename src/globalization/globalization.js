const STORAGE_KEY = 'teconnect.global.preferences';

export const SUPPORTED_LOCALES = [
  'pt-PT', 'pt-BR', 'en-US', 'en-GB', 'en-IE', 'en-CA', 'en-AU', 'en-NZ', 'en-SG', 'en-ZA',
  'es-ES', 'es-MX', 'es-AR', 'es-CL', 'es-CO',
  'fr-FR', 'fr-BE', 'de-DE', 'de-AT', 'de-CH', 'it-IT', 'nl-NL', 'ja-JP', 'ar-AE',
];

export const COUNTRY_DEFAULTS = {
  PT: { locale: 'pt-PT', currency: 'EUR', timeZone: 'Europe/Lisbon' },
  BR: { locale: 'pt-BR', currency: 'BRL', timeZone: 'America/Sao_Paulo' },
  ES: { locale: 'es-ES', currency: 'EUR', timeZone: 'Europe/Madrid' },
  FR: { locale: 'fr-FR', currency: 'EUR', timeZone: 'Europe/Paris' },
  DE: { locale: 'de-DE', currency: 'EUR', timeZone: 'Europe/Berlin' },
  IT: { locale: 'it-IT', currency: 'EUR', timeZone: 'Europe/Rome' },
  NL: { locale: 'nl-NL', currency: 'EUR', timeZone: 'Europe/Amsterdam' },
  BE: { locale: 'fr-BE', currency: 'EUR', timeZone: 'Europe/Brussels' },
  AT: { locale: 'de-AT', currency: 'EUR', timeZone: 'Europe/Vienna' },
  CH: { locale: 'de-CH', currency: 'CHF', timeZone: 'Europe/Zurich' },
  IE: { locale: 'en-IE', currency: 'EUR', timeZone: 'Europe/Dublin' },
  GB: { locale: 'en-GB', currency: 'GBP', timeZone: 'Europe/London' },
  US: { locale: 'en-US', currency: 'USD', timeZone: 'America/New_York' },
  CA: { locale: 'en-CA', currency: 'CAD', timeZone: 'America/Toronto' },
  AU: { locale: 'en-AU', currency: 'AUD', timeZone: 'Australia/Sydney' },
  NZ: { locale: 'en-NZ', currency: 'NZD', timeZone: 'Pacific/Auckland' },
  MX: { locale: 'es-MX', currency: 'MXN', timeZone: 'America/Mexico_City' },
  AR: { locale: 'es-AR', currency: 'ARS', timeZone: 'America/Argentina/Buenos_Aires' },
  CL: { locale: 'es-CL', currency: 'CLP', timeZone: 'America/Santiago' },
  CO: { locale: 'es-CO', currency: 'COP', timeZone: 'America/Bogota' },
  SG: { locale: 'en-SG', currency: 'SGD', timeZone: 'Asia/Singapore' },
  JP: { locale: 'ja-JP', currency: 'JPY', timeZone: 'Asia/Tokyo' },
  AE: { locale: 'ar-AE', currency: 'AED', timeZone: 'Asia/Dubai' },
  ZA: { locale: 'en-ZA', currency: 'ZAR', timeZone: 'Africa/Johannesburg' },
};

const LOCALE_ALIASES = {
  pt: 'pt-PT', 'pt-br': 'pt-BR', en: 'en-US', 'en-gb': 'en-GB', es: 'es-ES', fr: 'fr-FR', de: 'de-DE',
  it: 'it-IT', nl: 'nl-NL', ja: 'ja-JP', ar: 'ar-AE',
};

function normalizeLocale(value) {
  if (!value) return null;
  const raw = String(value).trim();
  const lower = raw.toLowerCase();
  if (LOCALE_ALIASES[lower]) return LOCALE_ALIASES[lower];
  const known = SUPPORTED_LOCALES.find((locale) => locale.toLowerCase() === lower);
  if (known) return known;
  try {
    return Intl.getCanonicalLocales(raw)[0] || null;
  } catch {
    return null;
  }
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

export function resolveGlobalPreferences(input = {}, options = {}) {
  const stored = options.useStored === false ? {} : getStoredPreferences();
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

export function applyDocumentLocale(input = {}, options = {}) {
  const preferences = resolveGlobalPreferences(input, options);
  if (typeof document !== 'undefined') {
    document.documentElement.lang = preferences.locale;
    document.documentElement.dir = 'ltr';
    document.documentElement.dataset.locale = preferences.locale;
    document.documentElement.dataset.country = preferences.countryCode || '';
    document.documentElement.dataset.currency = preferences.currency;
    document.documentElement.dataset.timezone = preferences.timeZone;
  }
  return preferences;
}

export function getStorageKey() {
  return STORAGE_KEY;
}
