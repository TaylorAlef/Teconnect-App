(() => {
  const KEY = 'teconnect.global.preferences';
  const aliases = { pt: 'pt-PT', 'pt-br': 'pt-BR', en: 'en-US', 'en-gb': 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE' };

  const normalize = (value) => {
    const raw = String(value || '').trim();
    const lower = raw.toLowerCase();
    if (aliases[lower]) return aliases[lower];
    if (/^(pt-PT|pt-BR|en-US|es-ES|fr-FR|de-DE)$/i.test(raw)) return raw;
    return null;
  };

  let preferences = {};
  try { preferences = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch {}

  const browserCandidates = navigator.languages || [navigator.language];
  const locale = normalize(preferences.locale) || browserCandidates.map(normalize).find(Boolean) || 'pt-PT';
  const country = String(preferences.countryCode || '').toUpperCase();
  const currency = preferences.currency || 'EUR';
  const timeZone = preferences.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  document.documentElement.lang = locale;
  document.documentElement.dir = 'ltr';
  document.documentElement.dataset.locale = locale;
  document.documentElement.dataset.country = country;
  document.documentElement.dataset.currency = currency;
  document.documentElement.dataset.timezone = timeZone;
})();
