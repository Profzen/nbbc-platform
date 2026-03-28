import { sendMail } from '@/lib/mailer';

type KycIdentity = {
  prenom: string;
  nom: string;
  email: string;
};

function escapeHtml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function wrapEmail(title: string, content: string) {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px;">
    <tr>
      <td align="center">
        <table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;">
          <tr>
            <td style="background:linear-gradient(135deg,#1e3a5f,#2563eb);border-radius:14px 14px 0 0;padding:24px 28px;text-align:center;">
              <p style="color:#93c5fd;font-size:12px;font-weight:700;letter-spacing:2px;margin:0 0 6px;">NBBC PLATFORM</p>
              <h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:0;">${title}</h1>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:28px;border-radius:0 0 14px 14px;color:#334155;font-size:15px;line-height:1.6;">
              ${content}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendKycSubmissionClientEmail(identity: KycIdentity) {
  const fullName = `${identity.prenom} ${identity.nom}`.trim();
  const subject = 'Votre demande KYC a bien ete recue - NBBC';
  const html = wrapEmail(
    'Demande KYC recue',
    `<p>Bonjour ${escapeHtml(identity.prenom || fullName)},</p>
     <p>Votre demande de verification d'identite a bien ete recue par notre equipe.</p>
     <p>Statut actuel: <strong>En attente de validation</strong>.</p>
     <p>Vous recevrez un nouvel email des qu'une decision sera prise.</p>
     <p style="margin-top:20px;color:#64748b;font-size:13px;">Ce message est automatique, merci de ne pas y repondre directement.</p>`
  );

  return sendMail({ to: identity.email, subject, html });
}

export async function sendKycDecisionClientEmail(identity: KycIdentity, statut: 'VALIDE' | 'REJETE', noteAdmin?: string) {
  const title = statut === 'VALIDE' ? 'Votre KYC est valide' : 'Votre KYC a ete rejete';
  const subject = statut === 'VALIDE'
    ? 'Validation de votre identite - NBBC'
    : 'Mise a jour de votre verification KYC - NBBC';

  const noteBlock = statut === 'REJETE' && noteAdmin
    ? `<p><strong>Motif communique par l'equipe:</strong><br/>${escapeHtml(noteAdmin)}</p>`
    : '';

  const html = wrapEmail(
    title,
    `<p>Bonjour ${escapeHtml(identity.prenom || `${identity.prenom} ${identity.nom}`.trim())},</p>
     <p>Le statut de votre verification d'identite a ete mis a jour:</p>
     <p><strong>${statut === 'VALIDE' ? 'VALIDE' : 'REJETE'}</strong></p>
     ${noteBlock}
     <p>${statut === 'VALIDE' ? 'Votre dossier est maintenant approuve.' : 'Vous pouvez soumettre une nouvelle demande avec des documents plus lisibles.'}</p>`
  );

  return sendMail({ to: identity.email, subject, html });
}

export async function sendKycSubmissionAdminEmail(identity: KycIdentity, requestId: string) {
  const adminEmail = process.env.KYC_ALERT_EMAIL;
  if (!adminEmail) {
    return { success: false as const, skipped: true as const };
  }

  const fullName = `${identity.prenom} ${identity.nom}`.trim();
  const subject = `Nouvelle demande KYC: ${fullName}`;
  const html = wrapEmail(
    'Nouvelle demande KYC',
    `<p>Une nouvelle demande KYC vient d'etre soumise.</p>
     <p><strong>Client:</strong> ${escapeHtml(fullName)}</p>
     <p><strong>Email:</strong> ${escapeHtml(identity.email)}</p>
     <p><strong>ID demande:</strong> ${escapeHtml(requestId)}</p>
     <p>Connectez-vous au back-office pour traiter la demande.</p>`
  );

  return sendMail({ to: adminEmail, subject, html });
}
