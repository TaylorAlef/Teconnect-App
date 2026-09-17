# Te-connect — Global Foundation V1

A base layer for launching Te-connect across countries without coupling the product to Portugal-specific formatting or infrastructure.

## Implemented in V1

- Locale, country, currency and timezone are treated as separate company preferences.
- Browser locale is detected before the React application starts.
- Preferences can be persisted under `teconnect.global.preferences`.
- `Intl.NumberFormat` and `Intl.DateTimeFormat` helpers are available for monetary, numeric, date and time values.
- The country catalog contains country defaults for Europe, the Americas, APAC, Middle East and Africa.
- Base UI translation keys exist for Portuguese, English, Spanish, French and German.
- Company settings schema now has country, locale, currency and first-day-of-week fields.
- CI has a globalization readiness guard.

## Design rules

1. Never infer country from currency. They are separate settings.
2. Never store formatted dates, numbers or currency strings in the database.
3. Store timestamps as `timestamptz` and format using the company's timezone at the UI boundary.
4. Use ISO 3166-1 alpha-2 for country codes and ISO 4217 for currency codes.
5. Use BCP 47 locale identifiers for language/region formatting.
6. Translation locale and formatting locale can differ when required by a customer.
7. The database migration changes only company configuration; no synthetic production data is introduced.

## Next implementation layer

The next UI pass should consume `company_settings.country_code`, `locale_code`, `currency_code` and `timezone` through a single application provider. The provider will then drive:

- translated navigation and system messages;
- dates and times;
- currency and numeric formatting;
- week start and calendar presentation;
- localized emails and notifications;
- country-specific HR configuration modules.

Country-specific legal rules must remain configuration modules rather than hard-coded assumptions in the shared People OS core.
