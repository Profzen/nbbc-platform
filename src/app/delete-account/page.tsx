import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Suppression de compte – NBBC',
  description: 'Procédure de suppression de compte et de données personnelles pour l\'application NBBC.',
};

export default function DeleteAccountPage() {
  const contactEmail = 'contact@nbbc.app';
  const appName = 'NBBC';
  const lastUpdated = '25 avril 2026';

  return (
    <main className="min-h-screen bg-white text-slate-800">
      <div className="max-w-3xl mx-auto px-6 py-16">

        {/* En-tête */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 bg-red-50 text-red-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <span>Application</span>
            <span className="font-bold">{appName}</span>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-3">Suppression de compte</h1>
          <p className="text-slate-500 text-sm">Dernière mise à jour : {lastUpdated}</p>
        </div>

        {/* Avertissement */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-10">
          <p className="text-red-800 font-medium">
            ⚠️ La suppression de votre compte est irréversible. Toutes vos données personnelles et votre historique
            seront définitivement effacés, sous réserve des obligations légales de conservation décrites ci-dessous.
          </p>
        </div>

        <div className="space-y-10 text-base leading-relaxed">

          {/* Procédure */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Comment demander la suppression de votre compte</h2>
            <p className="mb-5 text-slate-600">
              Pour demander la suppression de votre compte et de vos données associées dans l&apos;application <strong>{appName}</strong>,
              suivez l&apos;une des deux méthodes suivantes :
            </p>

            {/* Option 1 */}
            <div className="border border-slate-200 rounded-xl p-6 mb-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">1</div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Par e-mail (recommandé)</h3>
                  <p className="text-slate-600 mb-3">
                    Envoyez un e-mail à l&apos;adresse suivante avec l&apos;objet <strong>&quot;Demande de suppression de compte&quot;</strong> :
                  </p>
                  <a
                    href={`mailto:${contactEmail}?subject=Demande de suppression de compte NBBC&body=Bonjour,%0A%0AJe souhaite demander la suppression de mon compte NBBC ainsi que l'ensemble des données associées.%0A%0AMon adresse e-mail de compte : [votre email]%0A%0AMerci.`}
                    className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
                  >
                    📧 {contactEmail}
                  </a>
                  <p className="text-slate-500 text-sm mt-3">
                    Indiquez dans votre e-mail : votre adresse e-mail de compte et votre nom complet.
                    Nous traiterons votre demande dans un délai de <strong>30 jours</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Option 2 */}
            <div className="border border-slate-200 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">2</div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Via l&apos;application</h3>
                  <p className="text-slate-600">
                    Connectez-vous à l&apos;application <strong>{appName}</strong>, accédez à <strong>Paramètres → Mon compte → Supprimer mon compte</strong>,
                    puis confirmez votre demande. Un e-mail de confirmation vous sera envoyé.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Données supprimées */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Données supprimées</h2>
            <p className="text-slate-600 mb-4">
              Lors de la suppression de votre compte, les données suivantes seront <strong>définitivement effacées</strong> :
            </p>
            <ul className="space-y-2">
              {[
                'Vos informations de profil (nom, prénom, adresse e-mail, numéro de téléphone)',
                'Vos identifiants de connexion',
                'Vos préférences et paramètres personnels',
                'Vos données de signature électronique (contenu des documents)',
                'Vos messages et communications internes',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-slate-700">
                  <span className="text-red-500 mt-0.5 flex-shrink-0">✕</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Données conservées */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Données conservées (obligations légales)</h2>
            <p className="text-slate-600 mb-4">
              Conformément aux obligations légales en vigueur, certaines données doivent être conservées même après
              la suppression de votre compte :
            </p>
            <div className="overflow-hidden border border-slate-200 rounded-xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-5 py-3 font-semibold text-slate-700">Type de données</th>
                    <th className="text-left px-5 py-3 font-semibold text-slate-700">Durée de conservation</th>
                    <th className="text-left px-5 py-3 font-semibold text-slate-700">Motif légal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="px-5 py-3 text-slate-700">Historique des transactions financières</td>
                    <td className="px-5 py-3 text-slate-700 font-medium">5 ans</td>
                    <td className="px-5 py-3 text-slate-500">Obligations comptables et fiscales</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="px-5 py-3 text-slate-700">Documents KYC (pièces d&apos;identité)</td>
                    <td className="px-5 py-3 text-slate-700 font-medium">5 ans</td>
                    <td className="px-5 py-3 text-slate-500">Lutte anti-blanchiment (LCB-FT)</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-slate-700">Contrats et documents signés</td>
                    <td className="px-5 py-3 text-slate-700 font-medium">10 ans</td>
                    <td className="px-5 py-3 text-slate-500">Valeur probatoire et obligations contractuelles</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="px-5 py-3 text-slate-700">Journaux d&apos;activité (logs de sécurité)</td>
                    <td className="px-5 py-3 text-slate-700 font-medium">12 mois</td>
                    <td className="px-5 py-3 text-slate-500">Sécurité et détection de fraude</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-slate-500 text-sm mt-3">
              Ces données conservées ne seront pas utilisées à d&apos;autres fins que celles mentionnées et seront
              supprimées à l&apos;expiration du délai légal correspondant.
            </p>
          </section>

          {/* Délai de traitement */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Délai de traitement</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
              <p className="text-blue-800">
                Votre demande sera traitée dans un délai maximum de <strong>30 jours calendaires</strong> à compter
                de sa réception. Vous recevrez une confirmation par e-mail une fois la suppression effectuée.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Contact</h2>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-slate-700">
              <p className="font-semibold text-slate-900 mb-1">{appName}</p>
              <p>
                E-mail :{' '}
                <a href={`mailto:${contactEmail}`} className="text-blue-600 underline">
                  {contactEmail}
                </a>
              </p>
            </div>
          </section>

        </div>

        {/* Pied de page */}
        <div className="mt-16 pt-8 border-t border-slate-200 text-slate-400 text-sm text-center">
          © {new Date().getFullYear()} {appName}. Tous droits réservés. •{' '}
          <a href="/privacy" className="underline hover:text-slate-600">
            Règles de confidentialité
          </a>
        </div>

      </div>
    </main>
  );
}
