/**
 * SMS Sender
 * - Provider prioritaire: KingSMS Pro (KINGSMS_*)
 * - Fallback: Twilio (TWILIO_*)
 * Les messages SMS utilisent les variables {{prenom}} {{nom}} comme les emails.
 */

type SendSmsParams = {
  to: string;
  body: string;
};

type SmsSendResult =
  | { success: true; provider: 'KINGSMS' | 'TWILIO'; messageId?: string }
  | { success: false; skipped: boolean; provider?: 'KINGSMS' | 'TWILIO'; error?: string };

const KINGSMS_ENDPOINT = process.env.KINGSMS_API_BASE || 'https://edok-api.kingsmspro.com/api/v1/sms/send';

function normalizePhone(input: string): string {
  return (input || '').trim().replace(/[^\d+]/g, '');
}

function isKingSmsConfigured(): boolean {
  return Boolean(process.env.KINGSMS_APIKEY && process.env.KINGSMS_CLIENTID);
}

export function isSmsConfigured(): boolean {
  return isKingSmsConfigured() || Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM
  );
}

async function sendViaKingSms({ to, body }: SendSmsParams): Promise<SmsSendResult> {
  const apiKey = process.env.KINGSMS_APIKEY;
  const clientId = process.env.KINGSMS_CLIENTID;
  const sender = (process.env.KINGSMS_SENDER || 'NBBC').replace(/['"]/g, '').slice(0, 11);
  const normalizedTo = normalizePhone(to).replace(/^\+/, '');

  if (!apiKey || !clientId) {
    return { success: false, skipped: true, provider: 'KINGSMS', error: 'Provider KingSMS non configure' };
  }

  if (!/^\d{7,15}$/.test(normalizedTo)) {
    return { success: false, skipped: false, provider: 'KINGSMS', error: 'Numero invalide pour KingSMS' };
  }

  const payload = {
    from: sender,
    to: normalizedTo,
    message: body,
    type: 0,
    dlr: 'yes',
  };

  let lastError: string | undefined;
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(KINGSMS_ENDPOINT, {
        method: 'POST',
        headers: {
          APIKEY: apiKey,
          CLIENTID: clientId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
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
        lastError = parsed?.message || parsed?.error || `Erreur KingSMS HTTP ${response.status}`;
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
          continue;
        }
        return { success: false, skipped: false, provider: 'KINGSMS', error: lastError };
      }

      const messageId = parsed?.data?.id || parsed?.message_id || parsed?.id;
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

async function sendViaTwilio({ to, body }: SendSmsParams): Promise<SmsSendResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  const normalizedTo = normalizePhone(to);

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
