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
