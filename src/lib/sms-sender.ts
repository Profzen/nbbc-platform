/**
 * SMS Sender — Twilio-ready via API REST (pas de SDK requis)
 * Pour activer : ajouter TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM dans .env.local
 * Les messages SMS utilisent les variables {{prenom}} {{nom}} comme les emails
 */

type SendSmsParams = {
  to: string;          // Numéro au format E.164 : +33612345678
  body: string;        // Texte du SMS (max 160 chars recommandé)
};

type SmsSendResult =
  | { success: true; sid: string }
  | { success: false; skipped: boolean; error?: string };

export function isSmsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM
  );
}

export async function sendSms({ to, body }: SendSmsParams): Promise<SmsSendResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_FROM;

  if (!accountSid || !authToken || !from) {
    console.warn('[SMS] Twilio non configuré — message non envoyé vers', to);
    return { success: false, skipped: true };
  }

  // Validation basique du numéro E.164
  if (!/^\+\d{7,15}$/.test(to)) {
    return { success: false, skipped: false, error: 'Numéro invalide (format E.164 requis : +33XXXXXXXXX)' };
  }

  try {
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
      }
    );

    const data = await res.json();

    if (data.sid) {
      return { success: true, sid: data.sid };
    }
    return {
      success: false,
      skipped: false,
      error: data.message || `Erreur Twilio (HTTP ${res.status})`,
    };
  } catch (err: any) {
    return { success: false, skipped: false, error: err.message };
  }
}
