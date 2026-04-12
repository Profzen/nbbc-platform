import { getCountries, getCountryCallingCode, type CountryCode } from 'libphonenumber-js';

export type CountryOption = {
  code: string;
  name: string;
  dialCode: string;
  label: string;
};

const frNames = typeof Intl !== 'undefined' && 'DisplayNames' in Intl
  ? new Intl.DisplayNames(['fr'], { type: 'region' })
  : null;

const enNames = typeof Intl !== 'undefined' && 'DisplayNames' in Intl
  ? new Intl.DisplayNames(['en'], { type: 'region' })
  : null;

function normalizeKey(value?: string): string {
  return String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const countryCodes = getCountries();

const aliasToCode: Record<string, string> = {
  TOGO: 'TG',
  BENIN: 'BJ',
  NIGERIA: 'NG',
  GHANA: 'GH',
  MALI: 'ML',
  SENEGAL: 'SN',
  COTE_DIVOIRE: 'CI',
  COTE_D_IVOIRE: 'CI',
  IVORY_COAST: 'CI',
  CAMEROUN: 'CM',
  CAMEROON: 'CM',
  USA: 'US',
  UNITED_STATES: 'US',
  UK: 'GB',
  UNITED_KINGDOM: 'GB',
  EAU: 'AE',
  UAE: 'AE',
  RUSSIE: 'RU',
};

const nameToCode = new Map<string, string>();

for (const code of countryCodes) {
  const fr = frNames?.of(code) || '';
  const en = enNames?.of(code) || '';
  const keyCode = normalizeKey(code);
  nameToCode.set(keyCode, code);
  if (fr) nameToCode.set(normalizeKey(fr), code);
  if (en) nameToCode.set(normalizeKey(en), code);
}

Object.entries(aliasToCode).forEach(([alias, code]) => {
  nameToCode.set(normalizeKey(alias), code);
});

const COUNTRY_OPTIONS: CountryOption[] = countryCodes
  .map((code) => {
    const name = frNames?.of(code) || enNames?.of(code) || code;
    const dialCode = getCountryCallingCode(code as CountryCode);
    return {
      code,
      name,
      dialCode,
      label: `${name} (+${dialCode})`,
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));

export function getCountryOptions(): CountryOption[] {
  return COUNTRY_OPTIONS;
}

export function normalizeCountryCode(value?: string): string | null {
  const key = normalizeKey(value);
  if (!key) return null;
  return nameToCode.get(key) || null;
}

export function getCountryDialCode(value?: string): string | null {
  const code = normalizeCountryCode(value);
  if (!code) return null;
  return getCountryCallingCode(code as CountryCode);
}

export function getCountryDisplayName(value?: string): string {
  if (!value) return 'INCONNU';
  const code = normalizeCountryCode(value);
  if (!code) return String(value || 'INCONNU');
  return frNames?.of(code) || enNames?.of(code) || code;
}
