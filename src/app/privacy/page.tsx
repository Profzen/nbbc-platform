import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Règles de confidentialité – NBBC',
  description: 'Politique de confidentialité de l\'application NBBC Mobile',
};

export default function PrivacyPage() {
  const lastUpdated = '25 avril 2026';
  const contactEmail = 'contact@nbbc.app';
  const appName = 'NBBC';

  return (
    <main className="min-h-screen bg-white text-slate-800">
      <div className="max-w-3xl mx-auto px-6 py-16">

        {/* En-tête */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">Règles de confidentialité</h1>
          <p className="text-slate-500 text-sm">Dernière mise à jour : {lastUpdated}</p>
        </div>

        <div className="space-y-10 text-base leading-relaxed">

          {/* Introduction */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Introduction</h2>
            <p>
              La présente politique de confidentialité décrit la manière dont l&apos;application <strong>{appName}</strong> collecte, utilise et protège
              les données personnelles de ses utilisateurs. Nous nous engageons à traiter vos données avec le plus grand soin,
              dans le strict respect des lois applicables en matière de protection des données.
            </p>
            <p className="mt-3">
              En utilisant l&apos;application {appName}, vous acceptez les pratiques décrites dans la présente politique.
            </p>
          </section>

          {/* Données collectées */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">2. Données collectées</h2>
            <p className="mb-3">Nous collectons les catégories de données suivantes :</p>
            <ul className="list-disc pl-6 space-y-2 text-slate-700">
              <li><strong>Données d&apos;identification :</strong> nom, prénom, numéro de téléphone, adresse e-mail.</li>
              <li><strong>Données de compte :</strong> identifiants de connexion (e-mail + mot de passe haché), rôle utilisateur.</li>
              <li><strong>Données de transactions :</strong> opérations financières, dépôts, retraits, épargne réalisés via l&apos;application.</li>
              <li><strong>Données KYC (Know Your Customer) :</strong> pièces d&apos;identité, documents justificatifs fournis lors de la vérification d&apos;identité.</li>
              <li><strong>Données de signature électronique :</strong> contenu des documents signés et métadonnées de signature.</li>
              <li><strong>Données techniques :</strong> adresse IP, type de navigateur ou d&apos;appareil, journaux d&apos;activité.</li>
            </ul>
            <p className="mt-3">
              Nous ne collectons <strong>pas</strong> de données de géolocalisation en temps réel, ni de contacts téléphoniques.
            </p>
          </section>

          {/* Finalité */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">3. Finalité du traitement</h2>
            <p className="mb-3">Les données collectées sont utilisées aux fins suivantes :</p>
            <ul className="list-disc pl-6 space-y-2 text-slate-700">
              <li>Gestion et sécurisation des comptes utilisateurs.</li>
              <li>Traitement des opérations financières (dépôts, retraits, épargne, tontines).</li>
              <li>Vérification d&apos;identité (procédure KYC) conformément aux obligations légales.</li>
              <li>Signature électronique de contrats et documents officiels.</li>
              <li>Envoi de notifications et communications liées à l&apos;utilisation du service.</li>
              <li>Amélioration continue de l&apos;application et détection des fraudes.</li>
            </ul>
          </section>

          {/* Base légale */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">4. Base légale du traitement</h2>
            <p>Le traitement de vos données repose sur les bases légales suivantes :</p>
            <ul className="list-disc pl-6 space-y-2 text-slate-700 mt-3">
              <li><strong>Exécution du contrat :</strong> pour fournir les services financiers demandés.</li>
              <li><strong>Obligation légale :</strong> pour le respect des obligations KYC et de lutte contre le blanchiment d&apos;argent.</li>
              <li><strong>Consentement :</strong> pour les communications marketing optionnelles.</li>
              <li><strong>Intérêt légitime :</strong> pour la sécurité du service et la prévention de la fraude.</li>
            </ul>
          </section>

          {/* Conservation */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">5. Durée de conservation</h2>
            <p>
              Vos données personnelles sont conservées pendant la durée nécessaire à l&apos;accomplissement des finalités décrites
              ci-dessus, et au minimum :
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-700 mt-3">
              <li>Données de compte : pendant toute la durée de votre relation avec NBBC, puis 3 ans après la clôture du compte.</li>
              <li>Données KYC et transactions financières : 5 ans conformément aux obligations légales.</li>
              <li>Documents signés : 10 ans à des fins probatoires.</li>
              <li>Journaux techniques : 12 mois.</li>
            </ul>
          </section>

          {/* Partage */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">6. Partage des données</h2>
            <p className="mb-3">
              Nous ne vendons pas vos données personnelles. Nous pouvons partager vos données uniquement avec :
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-700">
              <li><strong>Prestataires techniques :</strong> hébergement (Vercel), base de données (MongoDB Atlas), stockage de fichiers (Cloudinary) — liés par des obligations contractuelles de confidentialité.</li>
              <li><strong>Autorités compétentes :</strong> en cas d&apos;obligation légale ou de réquisition judiciaire.</li>
              <li><strong>Partenaires de vérification d&apos;identité :</strong> dans le cadre de la procédure KYC, le cas échéant.</li>
            </ul>
          </section>

          {/* Sécurité */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">7. Sécurité des données</h2>
            <p>
              Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données
              contre tout accès non autorisé, perte, destruction ou divulgation, notamment :
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-700 mt-3">
              <li>Chiffrement des données en transit (HTTPS/TLS).</li>
              <li>Hachage sécurisé des mots de passe (bcrypt).</li>
              <li>Contrôle d&apos;accès basé sur les rôles (RBAC).</li>
              <li>Journalisation des activités sensibles.</li>
            </ul>
          </section>

          {/* Droits */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">8. Vos droits</h2>
            <p className="mb-3">Conformément à la réglementation applicable, vous disposez des droits suivants :</p>
            <ul className="list-disc pl-6 space-y-2 text-slate-700">
              <li><strong>Droit d&apos;accès :</strong> obtenir une copie de vos données personnelles.</li>
              <li><strong>Droit de rectification :</strong> corriger des données inexactes.</li>
              <li><strong>Droit à l&apos;effacement :</strong> demander la suppression de vos données (sous réserve des obligations légales de conservation).</li>
              <li><strong>Droit à la portabilité :</strong> recevoir vos données dans un format structuré.</li>
              <li><strong>Droit d&apos;opposition :</strong> vous opposer à certains traitements.</li>
              <li><strong>Droit de retrait du consentement :</strong> à tout moment pour les traitements fondés sur le consentement.</li>
            </ul>
            <p className="mt-3">
              Pour exercer ces droits, contactez-nous à l&apos;adresse : <a href={`mailto:${contactEmail}`} className="text-blue-600 underline">{contactEmail}</a>
            </p>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">9. Cookies et données de session</h2>
            <p>
              L&apos;application utilise des cookies de session strictement nécessaires au fonctionnement de
              l&apos;authentification (NextAuth.js). Ces cookies ne sont pas utilisés à des fins publicitaires ou de
              suivi comportemental. Aucun cookie tiers n&apos;est déposé sans votre consentement.
            </p>
          </section>

          {/* Mineurs */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">10. Mineurs</h2>
            <p>
              L&apos;application {appName} est destinée à un public adulte. Nous ne collectons pas sciemment de données
              personnelles concernant des enfants de moins de 13 ans. Si vous pensez que nous détenons des informations
              sur un mineur, contactez-nous immédiatement à {contactEmail}.
            </p>
          </section>

          {/* Modifications */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">11. Modifications de la politique</h2>
            <p>
              Nous nous réservons le droit de modifier la présente politique à tout moment. En cas de modification
              substantielle, les utilisateurs seront informés via l&apos;application ou par e-mail. La date de dernière
              mise à jour est indiquée en haut de cette page.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">12. Contact</h2>
            <p>
              Pour toute question relative à la présente politique ou au traitement de vos données personnelles,
              vous pouvez nous contacter :
            </p>
            <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-5 text-slate-700">
              <p className="font-semibold text-slate-900">{appName}</p>
              <p>E-mail : <a href={`mailto:${contactEmail}`} className="text-blue-600 underline">{contactEmail}</a></p>
            </div>
          </section>

        </div>

        {/* Pied de page */}
        <div className="mt-16 pt-8 border-t border-slate-200 text-slate-400 text-sm text-center">
          © {new Date().getFullYear()} {appName}. Tous droits réservés.
        </div>

      </div>
    </main>
  );
}
