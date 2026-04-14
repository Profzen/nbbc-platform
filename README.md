# 📊 NBBC Platform - État de l'Avancement (vs DN.txt)

Ce document résume l'évolution du projet NBBC par rapport au cahier des charges initial (`DN.txt`).

## ✅ 1. Gestion des Bases de Données & Clients
- [x] **Base Clients Centrale** : Nom, prénom, email, téléphone, pays, type de client.
- [x] **Catégorisation par Services** : Zelle, Cash App, Wire, PayPal, Crypto, Euro, Wise.
- [x] **Gestion des Cartes Externes** : Base de données dédiée avec titulaire, type, statut.
- [x] **Comptes & IBAN** : Gestion des numéros de comptes et wallets crypto par client.
- [x] **Historique & Documents** : Lien direct entre les clients et leurs pièces/contrats.

## ✅ 2. Module KYC (Conformité)
- [x] **Génération de Liens Sécurisés** : Token unique envoyé au client.
- [x] **Interface Publique** : Formulaire + Upload Photo ID + **Selfie Webcam**.
- [x] **Validation Admin** : Panel de vérification (Validation / Rejet).
- [x] **Reporting** : Génération de certificats KYC en PDF professionnel.

## ✅ 3. E-Signature & Contrats
- [x] **Gestion des Modèles** : Éditeur de modèles de contrat HTML dynamique.
- [x] **Upload de Documents** : Signature sur documents PDF existants.
- [x] **Signature en ligne** : Dessin de la signature à la souris/doigt (react-signature-canvas).
- [x] **Archivage** : Stockage sécurisé des documents signés sur Cloudinary.

## ✅ 4. Marketing & Communication
- [x] **Gestion des Campagnes** : Création et ciblage de segments clients.
- [x] **Envoi d'Emailing** : Intégration avec Resend (Personnalisation `{{prenom}}`).
- [x] **Logs d'Envoi** : Suivi des statistiques d'envoi et erreurs.
- [/] **Canaux Alternatifs** : Prêt pour SMS/WhatsApp (Structure présente).

## ✅ 5. Comptabilité & Finance (V5)
- [x] **Transactions** : Achats, Ventes, Dépenses et Dettes (depuis `indexc.html`).
- [x] **Gestion de Comptes** : Caisse, Banques, Mobile Money avec soldes persistants.
- [x] **Dépôts / Retraits** : Suivi Flooz/TMoney/Virement avec impact sur les soldes.
- [x] **Dashboard KPI** : CA, Bénéfice, Dépenses, Graphique d'évolution mensuelle.

## ✅ 6. Sécurité & Administration
- [x] **Authentification** : Système de session sécurisé (NextAuth).
- [x] **Gestion des Rôles** : Modèle prêt pour SuperAdmin, Compliance, Agent, etc. (actuellement ouvert à tous sur demande).
- [x] **Interface** : Design moderne "Dark Mode" premium et responsive.

---

## 🚀 Prochaines Étapes / Restant
- [ ] **Automatisation des sauvegardes** régulières de la base MongoDB.
- [ ] **Multi-Facteur (2FA)** pour l'accès administrateur.
- [ ] **Intégration API directes**  pour suivi en temps réel.
- [ ] **Relances Automatiques** pour les contrats non signés ou KYC en attente.

---
*Dernière mise à jour : 15 Mars 2026*

## Mobile App (iOS + Android) avec Capacitor

Cette base web reste active (Vercel) et peut etre reutilisee pour une app hybride Android/iOS.

### Prerequis
- Node.js installe
- Android Studio (Android)
- Xcode (iOS, uniquement sur macOS)

### Scripts utiles
- `npm run cap:add:android`
- `npm run cap:add:ios`
- `npm run cap:sync`
- `npm run cap:open:android`
- `npm run cap:open:ios`

### Configuration URL de l'app
Le fichier `capacitor.config.ts` supporte une URL distante via `CAPACITOR_APP_URL`.

Exemple PowerShell:
`$env:CAPACITOR_APP_URL="https://votre-domaine-app.com"; npm run cap:sync`

Ainsi:
- ton site web continue a vivre normalement,
- la meme logique peut etre exposee dans l'app mobile,
- les mises a jour backend/web restent possibles en parallele.

### Publication
- Android: build/signer dans Android Studio puis publication Play Store.
- iOS: build/signer dans Xcode (macOS requis) puis publication App Store.

## Guide Test iOS (TestFlight) - Etape par etape

Ce guide explique comment tester l'app iOS sans publication immediate sur l'App Store public, via TestFlight.

### Prerequis
- Un compte Apple Developer actif.
- Un Mac avec Xcode installe.
- Un iPhone avec l'app TestFlight installee.
- Le projet deja disponible sur GitHub.

### 1. Creer l'application dans App Store Connect
1. Ouvrir App Store Connect.
2. Aller dans Apps puis cliquer sur New App.
3. Renseigner:
	- Nom: NBBC Platform
	- Bundle ID: com.nbbc.platform
	- SKU: par exemple nbbc-platform-ios
4. Valider la creation.

### 2. Preparer le projet iOS sur le Mac
1. Cloner le repository.
2. Dans le dossier du projet, executer:
	- `npm install`
	- `npx cap sync ios`
	- `npm run cap:open:ios`
3. Le projet s'ouvre dans Xcode.

### 3. Configurer la signature dans Xcode
1. Selectionner la target App.
2. Ouvrir Signing & Capabilities.
3. Cocher Automatically manage signing.
4. Choisir la Team Apple Developer.
5. Verifier Bundle Identifier = com.nbbc.platform.
6. Dans General, definir:
	- Version (ex: 1.0.0)
	- Build (ex: 1, puis incrementer a chaque envoi)

### 4. Generer une archive
1. Choisir Any iOS Device (arm64) comme destination.
2. Menu Product > Archive.
3. Attendre l'ouverture de Xcode Organizer.

### 5. Envoyer le build vers TestFlight
1. Dans Organizer, selectionner l'archive.
2. Cliquer sur Distribute App.
3. Choisir App Store Connect.
4. Lancer Upload.
5. Attendre le message de succes.

### 6. Activer les tests TestFlight
1. Retourner dans App Store Connect > app > TestFlight.
2. Attendre le processing Apple (souvent 10 a 30 minutes).
3. Internal Testing:
	- Ajouter les membres de l'equipe.
4. External Testing:
	- Creer un groupe testeurs.
	- Soumettre une Beta App Review (premiere validation Apple requise).

### 7. Installation par les testeurs
1. Le testeur installe TestFlight sur iPhone.
2. Il recoit une invitation (email ou lien public).
3. Il installe la build depuis TestFlight.

### Important
- Un fichier APK Android ne fonctionne pas sur iOS.
- Un build iOS testable doit etre signe avec les certificats Apple.
- Sans macOS (local ou CI macOS), on ne peut pas produire un .ipa iOS valide.

## Tontine / Epargne Programmee - Spec Produit

Objectif: proposer un produit d'epargne programmee transparent, auditable et simple a comprendre, avec une base blockchain-like pour la preuve, sans forcer toutes les operations sensibles directement on-chain.

### Vision produit
- Le client ouvre un contrat d'epargne/tontine depuis son compte.
- Il choisit une periodicite de versement: quotidienne ou hebdomadaire.
- Il choisit une duree fixe: 3 mois ou 6 mois.
- La date de debut reelle est la date de souscription.
- A maturite, le capital cumule est verse vers un compte de destination predefini.
- Le produit accepte en priorite la crypto, avec support mobile money et carte pour les utilisateurs non crypto.

### Rôles et acces
- `TONTINE_CLIENT`: client final qui souscrit, verse, consulte son contrat et ses justificatifs.
- `AGENT`: support, KYC, suivi des incidents, accompagnement des clients.
- `ANALYSTE`: suivi des performances, reporting, pilotage des cohortes.
- `COMPLIANCE`: controle KYC/AML, validation des cas sensibles, audit.
- `SUPER_ADMIN`: configuration globale, parametres de produits, arbitrage manuel.

### Cycle de vie d'un contrat
- `DRAFT`: contrat prepare mais non signe.
- `ACTIVE`: contrat souscrit et ouvert a la collecte.
- `LATE`: au moins un versement est en retard.
- `AT_RISK`: plusieurs retards consecutifs, risque d'exclusion.
- `EVICTED`: contrat cloture pour defaut.
- `WITHDRAWN`: sortie volontaire avant maturite.
- `MATURED`: contrat arrive a terme et pret pour payout.
- `PAID_OUT`: fonds verses au destinataire final.
- `FAILED_PAYOUT`: payout automatique echoue, passage en manuel.

### Regles metier retenues
- Les versements sont journalises comme des mouvements individuels, pas comme un simple solde calcule.
- Les alertes de retard doivent partir avant l'exclusion.
- 3 versements manques consecutifs entrainent l'exclusion du contrat.
- En cas d'exclusion, remboursement avec penalite de 10%.
- La sortie volontaire est autorisee, avec penalite de 10%.
- Le frais plateforme de reference est de 10%.
- Le contrat doit accepter les conditions generales au moment de la souscription.
- Le compte de destination est verrouille apres validation du contrat et ne peut etre modifie que via un flux fortement securise.
- Si le payout automatique echoue, un fallback manuel doit prendre le relais.

### Proposition de regles supplementaires
- Grace period courte: 24 a 72 heures selon la periodicite avant de marquer un versement comme en retard.
- Seuil d'exclusion: 3 echeances consecutives non reglees.
- Duree de traitement apres maturite: tenter l'automatique pendant 24 a 72 heures, puis ouvrir une tache manuelle.
- Changement de destination: autoriser uniquement via verification forte, journalisation, et delai de securite avant prise d'effet.
- Cas de defaut prolonge: si le client ne reagit pas apres exclusion et relances, cloture financiere selon les regles contractuelles et gel de nouvelles souscriptions si necessaire.

### Architecture de securite
- KYC obligatoire avant activation du contrat.
- Journal d'audit complet pour chaque creation, modification, versement, penalite, exclusion et payout.
- Ledger en double entree pour tous les mouvements financiers.
- Webhooks idempotents avec id de transaction unique.
- Verification de signature sur tous les webhooks provider.
- Hachage d'ancrage periodique pour la preuve d'integrite du ledger.
- Separation stricte entre donnees de contrat, mouvements comptables et donnees KYC.
- Acces admin limite par role, avec traces horodatees et IP si disponible.

### Modele de donnees vise
- Contrat tontine: client, periodicite, montant, duree, frais, statut, dates, destination.
- Echeance: date due, statut, montant attendu, montant recu, penalite.
- Versement: source, rail de paiement, reference provider, montant, devise, statut, idempotency key.
- Ledger entry: debit, credit, compte, reference, horodatage, auteur systeme.
- Audit log: action, detail, acteur, role, IP, metadata.
- Payout request: contrat, montant net, destination, statut, raison d'echec si applicable.

### Rails de paiement
- Crypto en priorite pour le financement du contrat.
- Wallet / provider crypto a integrer: Strowallet comme piste principale a etudier.
- Mobile money et carte pour les utilisateurs sans portefeuille crypto: Paygate ou FedaPay comme options a etudier.
- Tous les providers doivent respecter: webhook signe, retry, reconciliation, idempotence, journalisation.

### Transparence "blockchain-like"
- Le systeme reste principalement off-chain pour garder une UX simple et des couts maitrisables.
- Chaque evenement critique est hashé et journalise.
- Un hash de lot peut etre ancre periodiquement sur une chaine publique ou un stockage de preuve immutable.
- La preuve fournie au client doit permettre de verifier l'integrite de son contrat et de ses versements.

### Flux cible
1. Le client complete son KYC.
2. Il accepte les conditions generales.
3. Il choisit periodicite, duree, montant et destination.
4. Le contrat passe a `ACTIVE` apres validation.
5. Les versements sont collectes via crypto, mobile money ou carte.
6. Les retards declenchent des alertes automatiques.
7. A maturite, le moteur calcule le montant net et lance le payout.
8. Si le payout echoue, une tache manuelle est ouverte avec trace complete.

### Payout et destination
- La destination de versement doit etre definie au depart.
- Toute modification de destination doit demander verification renforcee.
- La modification ne doit pas etre instantanee si elle augmente le risque de fraude.
- Il faut conserver l'historique complet des destinations, meme apres changement.

### Anti-fraude et controles
- Detection de doublons de compte, device ou moyen de paiement.
- Contrainte sur la frequence des modifications sensibles.
- Blocage des actions suspectes en cas de mismatch KYC / moyen de paiement.
- Revue humaine pour les cas a fort montant ou a risque eleve.

### Plan d'implementation
- Phase 1: creer les modeles tontine, echeance, versement, payout et audit.
- Phase 2: ajouter le role `TONTINE_CLIENT` dans l'auth et les vues adaptees.
- Phase 3: construire l'API de souscription, versement, suivi et mutation de contrat.
- Phase 4: brancher le moteur de relance, retard, exclusion et remboursement.
- Phase 5: integrer les providers de paiement et les webhooks idempotents.
- Phase 6: ajouter les ecrans admin et client, puis les exports et preuves PDF.
- Phase 7: ajouter l'ancrage de preuve et les controles de reconciliation.

### Points encore a valider avec les providers
- Format exact des webhooks.
- Gestion des remboursements partiels.
- Disponibilite des comptes marchands et des destinations de payout.
- Delais de settlement reel par rail de paiement.
- Capacite a tracer proprement les references et les echanges de statut.

### Decision actuelle
- On part sur une architecture hybride: off-chain pour l'exploitation, ledger interne immuable pour la compta, et preuves hashées pour la transparence.
- Le produit sera concu pour resister aux erreurs de paiement, aux webhooks dupliques, et aux coupures de providers.
- Les integrations Strowallet, Paygate et FedaPay seront ajoutees seulement apres validation de leurs documentations officielles.
- Le role `TONTINE_CLIENT` est deja ajoute au modele utilisateur et alimente par l'inscription publique client; le provisioning super-admin reste reserve aux comptes internes.
