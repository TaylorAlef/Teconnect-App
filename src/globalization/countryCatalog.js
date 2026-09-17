export const COUNTRY_CATALOG = [
  { code: 'PT', name: 'Portugal', locale: 'pt-PT', currency: 'EUR', timeZone: 'Europe/Lisbon' },
  { code: 'BR', name: 'Brasil', locale: 'pt-BR', currency: 'BRL', timeZone: 'America/Sao_Paulo' },
  { code: 'ES', name: 'Espanha', locale: 'es-ES', currency: 'EUR', timeZone: 'Europe/Madrid' },
  { code: 'FR', name: 'França', locale: 'fr-FR', currency: 'EUR', timeZone: 'Europe/Paris' },
  { code: 'DE', name: 'Alemanha', locale: 'de-DE', currency: 'EUR', timeZone: 'Europe/Berlin' },
  { code: 'IT', name: 'Itália', locale: 'en-US', currency: 'EUR', timeZone: 'Europe/Rome' },
  { code: 'NL', name: 'Países Baixos', locale: 'en-US', currency: 'EUR', timeZone: 'Europe/Amsterdam' },
  { code: 'BE', name: 'Bélgica', locale: 'fr-FR', currency: 'EUR', timeZone: 'Europe/Brussels' },
  { code: 'AT', name: 'Áustria', locale: 'de-DE', currency: 'EUR', timeZone: 'Europe/Vienna' },
  { code: 'CH', name: 'Suíça', locale: 'de-DE', currency: 'CHF', timeZone: 'Europe/Zurich' },
  { code: 'IE', name: 'Irlanda', locale: 'en-US', currency: 'EUR', timeZone: 'Europe/Dublin' },
  { code: 'GB', name: 'Reino Unido', locale: 'en-US', currency: 'GBP', timeZone: 'Europe/London' },
  { code: 'US', name: 'Estados Unidos', locale: 'en-US', currency: 'USD', timeZone: 'America/New_York' },
  { code: 'CA', name: 'Canadá', locale: 'en-US', currency: 'CAD', timeZone: 'America/Toronto' },
  { code: 'MX', name: 'México', locale: 'es-ES', currency: 'MXN', timeZone: 'America/Mexico_City' },
  { code: 'AR', name: 'Argentina', locale: 'es-ES', currency: 'ARS', timeZone: 'America/Argentina/Buenos_Aires' },
  { code: 'CL', name: 'Chile', locale: 'es-ES', currency: 'CLP', timeZone: 'America/Santiago' },
  { code: 'CO', name: 'Colômbia', locale: 'es-ES', currency: 'COP', timeZone: 'America/Bogota' },
  { code: 'AU', name: 'Austrália', locale: 'en-US', currency: 'AUD', timeZone: 'Australia/Sydney' },
  { code: 'NZ', name: 'Nova Zelândia', locale: 'en-US', currency: 'NZD', timeZone: 'Pacific/Auckland' },
  { code: 'SG', name: 'Singapura', locale: 'en-US', currency: 'SGD', timeZone: 'Asia/Singapore' },
  { code: 'JP', name: 'Japão', locale: 'en-US', currency: 'JPY', timeZone: 'Asia/Tokyo' },
  { code: 'AE', name: 'Emirados Árabes Unidos', locale: 'en-US', currency: 'AED', timeZone: 'Asia/Dubai' },
  { code: 'ZA', name: 'África do Sul', locale: 'en-US', currency: 'ZAR', timeZone: 'Africa/Johannesburg' },
];

export const CURRENCY_CODES = [...new Set(COUNTRY_CATALOG.map((country) => country.currency))].sort();
export const COUNTRY_CODES = COUNTRY_CATALOG.map((country) => country.code);
