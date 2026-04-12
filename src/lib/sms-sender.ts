/**
 * SMS Sender
 * - Provider prioritaire: KingSMS Pro (KINGSMS_*)
 * - Fallback: Twilio (TWILIO_*)
 * Les messages SMS utilisent les variables {{prenom}} {{nom}} comme les emails.
 */

import { getCountryDialCode } from '@/lib/countries';

type SendSmsParams = {
  to: string;
  body: string;
  countryHint?: string;
};

type SmsSendResult =
  | { success: true; provider: 'KINGSMS' | 'TWILIO'; messageId?: string }
  | { success: false; skipped: boolean; provider?: 'KINGSMS' | 'TWILIO'; error?: string };

export type KingSmsTraceStatus = 'DELIVERED' | 'ACCEPTED' | 'IN_PROCESS' | 'BLOCKED' | 'FAILED' | 'UNKNOWN';

export type KingSmsTraceResult = {
  success: boolean;
  status: KingSmsTraceStatus;
  rawStatus?: string;
  route?: string;
  messageId?: string;
  error?: string;
};

const KINGSMS_ENDPOINT = process.env.KINGSMS_API_BASE || 'https://edok-api.kingsmspro.com/api/v1/sms/send';
const KINGSMS_TRACE_ENDPOINT = process.env.KINGSMS_TRACE_API_BASE || KINGSMS_ENDPOINT.replace(/\/send$/, '/trace');

/** Indicatif pays par défaut (Togo = 228). Configurable via KINGSMS_DEFAULT_COUNTRY */
const DEFAULT_COUNTRY = process.env.KINGSMS_DEFAULT_COUNTRY || '228';

function normalizeCountryKey(input?: string): string {
  return String(input || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseCountryDialMapFromEnv(): Record<string, string> {
  const raw = process.env.KINGSMS_COUNTRY_DIAL_MAP;
  if (!raw) return {};

  const map: Record<string, string> = {};
  for (const entry of raw.split(',')) {
    const [country, dial] = entry.split(':').map((v) => String(v || '').trim());
    const key = normalizeCountryKey(country);
    if (!key) continue;
    const digits = dial.replace(/\D/g, '');
    if (!digits) continue;
    map[key] = digits;
  }
  return map;
}

const COUNTRY_DIAL_MAP = parseCountryDialMapFromEnv();

function resolveCountryDialCode(countryHint?: string): string {
  const key = normalizeCountryKey(countryHint);
  if (key && COUNTRY_DIAL_MAP[key]) return COUNTRY_DIAL_MAP[key];
  const resolved = getCountryDialCode(countryHint);
  if (resolved) return resolved;
  return DEFAULT_COUNTRY;
}

/**
 * Normalise un numéro au format international sans + ni 00.
 * Ex: +228 90 44 36 79 → 22890443679
 * Ex: 90443679 → 22890443679 (ajout indicatif par défaut)
 */
function normalizePhone(input: string, countryHint?: string): string {
  let phone = (input || '').trim().replace(/[\s\-().]/g, '');
  // Retirer le + ou 00 initial
  phone = phone.replace(/^\+/, '').replace(/^00/, '');
  // Si le numéro ne contient pas d'indicatif explicite, utiliser l'indicatif du pays de résidence
  // (multi-pays), sinon fallback sur l'indicatif par défaut.
  if (/^\d{7,10}$/.test(phone)) {
    phone = resolveCountryDialCode(countryHint) + phone;
  }
  return phone;
}

function isKingSmsConfigured(): boolean {
  return Boolean(process.env.KINGSMS_APIKEY && process.env.KINGSMS_CLIENTID);
}

function normalizeKingSmsTraceStatus(rawStatus: unknown): KingSmsTraceStatus {
  const status = String(rawStatus || '').trim().toUpperCase();

  if (
    status === 'DLV' ||
    status === 'DELIVERED' ||
    status === 'DELIVRD' ||
    status === 'DLVRD' ||
    status === 'DELIVERY_OK'
  ) {
    return 'DELIVERED';
  }

  if (status === 'ACT' || status === 'ACCEPTED' || status === 'SENT' || status === 'SUBMITTED') {
    return 'ACCEPTED';
  }

  if (
    status === 'IPR' ||
    status === 'BUF' ||
    status === 'DLG' ||
    status === 'ITM' ||
    status === 'QUEUED' ||
    status === 'PENDING' ||
    status === 'IN_PROCESS'
  ) {
    return 'IN_PROCESS';
  }

  if (status === 'BLO' || status === 'BLOCKED' || status === 'BLACKLISTED') return 'BLOCKED';

  if (
    status === 'ABS' || status === 'EXP' || status === 'ERD' || status === 'INV' || status === 'NCR' ||
    status === 'NPZ' || status === 'IPV' || status === 'MAX' || status === 'MAP' || status === 'LEN' ||
    status === 'DUP' || status === 'FAILED' || status === 'UNDELIVERED' || status === 'REJECTED'
  ) {
    return 'FAILED';
  }

  if (status.includes('DELIV')) return 'DELIVERED';
  if (status.includes('ACCEPT') || status.includes('SENT')) return 'ACCEPTED';
  if (status.includes('PEND') || status.includes('QUEUE') || status.includes('PROCESS')) return 'IN_PROCESS';
  if (status.includes('BLOCK') || status.includes('BLACK')) return 'BLOCKED';
  if (status.includes('FAIL') || status.includes('REJECT') || status.includes('UNDELIV')) return 'FAILED';

  return 'UNKNOWN';
}

export async function traceKingSmsMessage(messageId: string): Promise<KingSmsTraceResult> {
  const apiKey = process.env.KINGSMS_APIKEY;
  const clientId = process.env.KINGSMS_CLIENTID;

  if (!apiKey || !clientId) {
    return { success: false, status: 'FAILED', messageId, error: 'Provider KingSMS non configure' };
  }

  const formData = new URLSearchParams();
  formData.append('messageId', String(messageId || '').trim());

  try {
    const response = await fetch(KINGSMS_TRACE_ENDPOINT, {
      method: 'POST',
      headers: {
        APIKEY: apiKey,
        CLIENTID: clientId,
      },
      body: formData,
    });

    const rawText = await response.text();
    const parsed = JSON.parse(rawText);
    const trace = parsed?.result || parsed;
    const rawStatus = trace?.status || parsed?.status;
    const status = normalizeKingSmsTraceStatus(rawStatus);

    if (!response.ok) {
      return { success: false, status, rawStatus: String(rawStatus || ''), route: trace?.route, messageId: trace?.messageId || messageId, error: trace?.message || parsed?.message || `KingSMS trace HTTP ${response.status}` };
    }

    return {
      success: true,
      status,
      rawStatus: String(rawStatus || ''),
      route: trace?.route,
      messageId: trace?.messageId || messageId,
    };
  } catch (error: any) {
    return { success: false, status: 'FAILED', messageId, error: error?.message || 'Erreur trace KingSMS' };
  }
}

export function isSmsConfigured(): boolean {
  return isKingSmsConfigured() || Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM
  );
}

async function sendViaKingSms({ to, body, countryHint }: SendSmsParams): Promise<SmsSendResult> {
  const apiKey = process.env.KINGSMS_APIKEY;
  const clientId = process.env.KINGSMS_CLIENTID;
  const sender = (process.env.KINGSMS_SENDER || 'NBBC').replace(/['"]/g, '').slice(0, 11);
  const normalizedTo = normalizePhone(to, countryHint).replace(/^\+/, '');

  if (!apiKey || !clientId) {
    return { success: false, skipped: true, provider: 'KINGSMS', error: 'Provider KingSMS non configure' };
  }

  if (!/^\d{10,15}$/.test(normalizedTo)) {
    return { success: false, skipped: false, provider: 'KINGSMS', error: `Numero invalide: ${normalizedTo} (attendu: format international 10-15 chiffres)` };
  }

  // KingSMS attend du form-data (comme curl CURLOPT_POSTFIELDS), pas du JSON
  const formData = new URLSearchParams();
  formData.append('from', sender);
  formData.append('to', normalizedTo);
  formData.append('message', body);
  formData.append('type', '0');
  formData.append('dlr', 'yes');

  let lastError: string | undefined;
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(KINGSMS_ENDPOINT, {
        method: 'POST',
        headers: {
          APIKEY: apiKey,
          CLIENTID: clientId,
        },
        body: formData,
      });

      const rawText = await response.text();
      let parsed: any;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        lastError = `Reponse non JSON KingSMS (tentative ${attempt})`;
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
          continue;
        }
        return { success: false, skipped: false, provider: 'KINGSMS', error: lastError };
      }

      if (!response.ok) {
        // Extraire le message d'erreur de la réponse
        const errMsg = typeof parsed === 'string' ? parsed
          : parsed?.from?.[0] || parsed?.to?.[0] || parsed?.message || parsed?.error
          || JSON.stringify(parsed);
        lastError = `KingSMS HTTP ${response.status}: ${errMsg}`;
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
          continue;
        }
        return { success: false, skipped: false, provider: 'KINGSMS', error: lastError };
      }

      // Réponse KingSMS en cas de succès (HTTP 201):
      // { successful_sends: [{ messageId, from, to, ... }], failed_sends: [...], successful_count, failed_count }
      // OU format simple: { messageId, sender, to, status }
      if (parsed?.failed_sends?.length > 0 && parsed?.successful_count === 0) {
        const failError = parsed.failed_sends[0]?.error || 'Echec envoi KingSMS';
        return { success: false, skipped: false, provider: 'KINGSMS', error: failError };
      }

      const messageId = parsed?.successful_sends?.[0]?.messageId || parsed?.messageId || parsed?.message_id || parsed?.id;
      return { success: true, provider: 'KINGSMS', messageId: messageId ? String(messageId) : undefined };
    } catch (err: any) {
      lastError = err?.message || 'Erreur reseau KingSMS';
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
        continue;
      }
      return { success: false, skipped: false, provider: 'KINGSMS', error: lastError };
    }
  }

  return { success: false, skipped: false, provider: 'KINGSMS', error: lastError || 'Echec envoi KingSMS' };
}

async function sendViaTwilio({ to, body, countryHint }: SendSmsParams): Promise<SmsSendResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  const normalizedTo = `+${normalizePhone(to, countryHint).replace(/^\+/, '')}`;

  if (!accountSid || !authToken || !from) {
    return { success: false, skipped: true, provider: 'TWILIO', error: 'Provider Twilio non configure' };
  }

  if (!/^\+\d{7,15}$/.test(normalizedTo)) {
    return { success: false, skipped: false, provider: 'TWILIO', error: 'Numero invalide (format E.164 requis)' };
  }

  try {
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: normalizedTo, From: from, Body: body }).toString(),
    });

    const data = await res.json();
    if (data.sid) {
      return { success: true, provider: 'TWILIO', messageId: String(data.sid) };
    }
    return {
      success: false,
      skipped: false,
      provider: 'TWILIO',
      error: data.message || `Erreur Twilio (HTTP ${res.status})`,
    };
  } catch (err: any) {
    return { success: false, skipped: false, provider: 'TWILIO', error: err.message };
  }
}

export async function sendSms(params: SendSmsParams): Promise<SmsSendResult> {
  // KingSMS prioritaire si configure.
  if (isKingSmsConfigured()) {
    return sendViaKingSms(params);
  }

  // Fallback Twilio pour compatibilite.
  return sendViaTwilio(params);
}
