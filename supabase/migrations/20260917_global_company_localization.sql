-- Global foundation: company-level locale, country and currency defaults.
-- Safe/repeatable: existing companies keep Portugal defaults until changed by an authorized admin.

alter table public.company_settings
  add column if not exists country_code text not null default 'PT',
  add column if not exists locale_code text not null default 'pt-PT',
  add column if not exists currency_code text not null default 'EUR',
  add column if not exists week_start_day smallint not null default 1;

alter table public.company_settings
  drop constraint if exists company_settings_country_code_check,
  drop constraint if exists company_settings_locale_code_check,
  drop constraint if exists company_settings_currency_code_check,
  drop constraint if exists company_settings_week_start_day_check;

alter table public.company_settings
  add constraint company_settings_country_code_check
    check (country_code ~ '^[A-Z]{2}$'),
  add constraint company_settings_locale_code_check
    check (locale_code <> '' and length(locale_code) <= 16),
  add constraint company_settings_currency_code_check
    check (currency_code ~ '^[A-Z]{3}$'),
  add constraint company_settings_week_start_day_check
    check (week_start_day between 1 and 7);

comment on column public.company_settings.country_code is 'ISO 3166-1 alpha-2 country used for company localization.';
comment on column public.company_settings.locale_code is 'BCP 47 locale used for company-facing formatting and translations.';
comment on column public.company_settings.currency_code is 'ISO 4217 currency used for company-facing monetary values.';
comment on column public.company_settings.week_start_day is 'ISO weekday number: Monday=1 through Sunday=7.';
