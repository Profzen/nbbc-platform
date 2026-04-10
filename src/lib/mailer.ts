import nodemailer from 'nodemailer';

type SendMailParams = {
  to: string | string[];
  subject: string;
  html: string;
};

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_NAME = process.env.SMTP_FROM_NAME || 'NBBC Platform';

function createTransport() {
  if (!SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

export function isMailerConfigured() {
  return Boolean(SMTP_USER && SMTP_PASS);
}

export async function sendMail({ to, subject, html }: SendMailParams) {
  const transport = createTransport();
  if (!transport) {
    console.warn('[MAILER] SMTP non configure, email non envoye:', subject);
    return { success: false as const, skipped: true as const };
  }

  try {
    await transport.sendMail({
      from: `"${FROM_NAME}" <${SMTP_USER}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
    });
    return { success: true as const, skipped: false as const };
  } catch (error: any) {
    console.error('[MAILER] Echec envoi email:', error?.message || error);
    return { success: false as const, skipped: false as const, error: error?.message || 'Erreur SMTP' };
  }
}
