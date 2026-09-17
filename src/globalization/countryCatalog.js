export const COUNTRY_CATALOG = [
  { code: 'PT', name: 'Portugal', locale: 'pt-PT', currency: 'EUR', timeZone: 'Europe/Lisbon' },
  { code: 'BR', name: 'Brasil', locale: 'pt-BR', currency: 'BRL', timeZone: 'America/Sao_Paulo' },
  { code: 'ES', name: 'Espanha', locale: 'es-ES', currency: 'EUR', timeZone: 'Europe/Madrid' },
  { code: 'FR', name: 'França', locale: 'fr-FR', currency: 'EUR', timeZone: 'Europe/Paris' },
  { code: 'DE', name: 'Alemanha', locale: 'de-DE', currency: 'EUR', timeZone: 'Europe/Berlin' },
  { code: 'IT', name: 'Itália', locale: 'it-IT', currency: 'EUR', timeZone: 'Europe/Rome' },
  { code: 'NL', name: 'Países Baixos', locale: 'nl-NL', currency: 'EUR', timeZone: 'Europe/Amsterdam' },
  { code: 'BE', name: 'Bélgica', locale: 'fr-BE', currency: 'EUR', timeZone: 'Europe/Brussels' },
  { code: 'AT', name: 'Áustria', locale: 'de-AT', currency: 'EUR', timeZone: 'Europe/Vienna' },
  { code: 'CH', name: 'Suíça', locale: 'de-CH', currency: 'CHF', timeZone: 'Europe/Zurich' },
  { code: 'IE', name: 'Irlanda', locale: 'en-IE', currency: 'EUR', timeZone: 'Europe/Dublin' },
  { code: 'GB', name: 'Reino Unido', locale: 'en-GB', currency: 'GBP', timeZone: 'Europe/London' },
  { code: 'US', name: 'Estados Unidos', locale: 'en-US', currency: 'USD', timeZone: 'America/New_York' },
  { code: 'CA', name: 'Canadá', locale: 'en-CA', currency: 'CAD', timeZone: 'America/Toronto' },
  { code: 'MX', name: 'México', locale: 'es-MX', currency: 'MXN', timeZone: 'America/Mexico_City' },
  { code: 'AR', name: 'Argentina', locale: 'es-AR', currency: 'ARS', timeZone: 'America/Argentina/Buenos_Aires' },
  { code: 'CL', name: 'Chile', locale: 'es-CL', currency: 'CLP', timeZone: 'America/Santiago' },
  { code: 'CO', name: 'Colômbia', locale: 'es-CO', currency: 'COP', timeZone: 'America/Bogota' },
  { code: 'AU', name: 'Austrália', locale: 'en-AU', currency: 'AUD', timeZone: 'Australia/Sydney' },
  { code: 'NZ', name: 'Nova Zelândia', locale: 'en-NZ', currency: 'NZD', timeZone: 'Pacific/Auckland' },
  { code: 'SG', name: 'Singapura', locale: 'en-SG', currency: 'SGD', timeZone: 'Asia/Singapore' },
  { code: 'JP', name: 'Japão', locale: 'ja-JP', currency: 'JPY', timeZone: 'Asia/Tokyo' },
  { code: 'AE', name: 'Emirados Árabes Unidos', locale: 'ar-AE', currency: 'AED', timeZone: 'Asia/Dubai' },
  { code: 'ZA', name: 'África do Sul', locale: 'en-ZA', currency: 'ZAR', timeZone: 'Africa/Johannesburg' },
];

export const CURRENCY_CODES = [...new Set(COUNTRY_CATALOG.map((country) => country.currency))].sort();
export const COUNTRY_CODES = COUNTRY_CATALOG.map((country) => country.code);
