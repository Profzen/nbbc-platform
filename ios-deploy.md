# Guide de déploiement iOS — NBBC Platform sur l'App Store

---

## Informations importantes à connaître avant de commencer

| Champ | Valeur |
|---|---|
| Bundle ID | `com.nbbc.mobile` |
| Nom de l'app | `NBBC Platform` |
| Version actuelle | `1.0` |
| Build number | `1` |
| Repo GitHub | `https://github.com/Profzen/nbbc-platform.git` |

**Ce dont tu as besoin avant de commencer :**
- Un Mac (macOS 13 Ventura ou plus récent recommandé)
- Un compte Apple Developer (99 USD/an) — à créer sur [developer.apple.com/programs/enroll](https://developer.apple.com/programs/enroll)
- Le code source du projet (on va le cloner depuis GitHub)
- Les identifiants GitHub pour cloner le repo

---

## PARTIE 1 — Installation des outils

### Étape 1.0 — Vérifier la version macOS (OBLIGATOIRE en premier)

Avant tout, vérifie que ton Mac est compatible avec la dernière version de Xcode.

1. Ouvre le **Terminal** (Spotlight : `Cmd+Espace` → tape "Terminal" → Entrée)
2. Tape :
   ```bash
   sw_vers
   ```
3. Note la valeur **ProductVersion** (ex : `15.4.1` ou `26.0`)

**Tableau de compatibilité :**

| macOS | Nom | Xcode disponible |
|---|---|---|
| 26.x | Tahoe | Xcode 26.x (via App Store) |
| 15.x | Sequoia | Xcode 16.x (via App Store) |
| 14.x | Sonoma | Xcode 16.0 ou 15.x |
| 13.x | Ventura | Xcode 15.x |
| 12.x ou moins | Monterey / plus vieux | ⚠️ Pas compatible — mettre à jour macOS obligatoire |

**Si le Mac App Store dit "nécessite macOS XX minimum" → tu dois d'abord mettre à jour macOS :**

1. Clique sur le menu **Apple** (coin haut gauche) → **System Settings**
2. Clique sur **General** → **Software Update**
3. Si une mise à jour est disponible → clique **Update Now**
4. ⚠️ Ça peut prendre **1 à 2 heures** et redémarrer plusieurs fois — laisse le Mac branché
5. Après le redémarrage, recommence depuis cette étape

**Ou — télécharger une version Xcode compatible avec la macOS actuelle (si tu ne peux pas mettre à jour) :**

1. Va sur [developer.apple.com/download/more](https://developer.apple.com/download/more/)
2. Connecte-toi avec l'Apple ID Developer
3. Dans la barre de recherche, tape **Xcode**
4. Télécharge la version compatible avec ta macOS (tableau ci-dessus)
5. Le fichier `.xip` fait ~10-15 Go — double-clique dessus pour le décompresser
6. Glisse **Xcode.app** dans le dossier **Applications**
7. Passe à l'étape 1.2 directement (skip l'App Store)

---

### Étape 1.1 — Installer Xcode (depuis le Mac App Store)

> ⚠️ **Skip cette étape si tu as téléchargé Xcode manuellement à l'étape 1.0**

1. Ouvre le **Mac App Store** (cherche dans Launchpad ou Spotlight avec `Cmd+Espace`, tape "App Store")
2. Dans la barre de recherche en haut à gauche, tape **Xcode**
3. Clique sur **Obtenir** puis **Installer**
4. ⚠️ Xcode fait environ **15 Go** — l'installation peut prendre 30 à 60 minutes selon la connexion
5. Une fois installé, **ouvre Xcode** (dans Applications ou Spotlight)
6. Au premier lancement, il te demande d'installer les "Additional Components" → clique **Install**
7. Accepte les termes de licence → clique **Agree**
8. Attends la fin de l'installation des composants (quelques minutes)
9. Ferme Xcode pour l'instant

### Étape 1.2 — Installer les Xcode Command Line Tools

1. Ouvre l'application **Terminal** (Spotlight : `Cmd+Espace` → tape "Terminal" → Entrée)
2. Tape la commande suivante et appuie sur Entrée :
   ```bash
   xcode-select --install
   ```
3. Une fenêtre pop-up apparaît → clique **Install**
4. Attends la fin (2-5 minutes)
5. Vérifie que l'installation a réussi en tapant :
   ```bash
   xcode-select -p
   ```
   Tu dois voir quelque chose comme `/Applications/Xcode.app/Contents/Developer`

### Étape 1.3 — Installer Homebrew (gestionnaire de paquets pour Mac)

1. Dans le Terminal, tape exactement cette commande et appuie sur Entrée :
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
2. Il te demande ton mot de passe Mac → tape-le (les caractères ne s'affichent pas, c'est normal) → Entrée
3. Il te demande de confirmer → appuie sur **Entrée**
4. Attends la fin (5-10 minutes)
5. À la fin, Homebrew affiche parfois des instructions pour ajouter une variable d'environnement. Si tu vois un message du genre :
   ```
   Run these two commands in your terminal to add Homebrew to your PATH:
   ```
   Copie et colle exactement les deux lignes `echo` et `eval` qu'il indique, puis appuie sur Entrée après chacune.
6. **Ferme le Terminal et réouvre-le** pour que les changements prennent effet
7. Vérifie que Homebrew fonctionne :
   ```bash
   brew --version
   ```
   Tu dois voir quelque chose comme `Homebrew 4.x.x`

### Étape 1.4 — Installer Git

1. Dans le Terminal, tape :
   ```bash
   brew install git
   ```
2. Attends la fin
3. Vérifie :
   ```bash
   git --version
   ```
   Tu dois voir `git version 2.x.x`
4. Configure ton identité Git (remplace les valeurs entre guillemets) :
   ```bash
   git config --global user.name "Ton Prénom Nom"
   git config --global user.email "tonemail@exemple.com"
   ```

### Étape 1.5 — Installer Node.js

1. Dans le Terminal, tape :
   ```bash
   brew install node@22
   ```
2. Attends la fin
3. Homebrew peut afficher un message pour ajouter Node au PATH. Si c'est le cas, copie-colle les lignes indiquées. Sinon, tape manuellement :
   ```bash
   echo 'export PATH="/opt/homebrew/opt/node@22/bin:$PATH"' >> ~/.zshrc
   source ~/.zshrc
   ```
4. Vérifie :
   ```bash
   node --version
   npm --version
   ```
   Tu dois voir `v22.x.x` et `10.x.x`

### Étape 1.6 — Installer CocoaPods

CocoaPods est le gestionnaire de dépendances utilisé par les projets iOS Capacitor.

1. Dans le Terminal, tape :
   ```bash
   brew install cocoapods
   ```
2. Attends la fin
3. Vérifie :
   ```bash
   pod --version
   ```
   Tu dois voir un numéro de version comme `1.x.x`

---

## PARTIE 2 — Cloner et préparer le projet

### Étape 2.1 — Créer un dossier de travail

1. Dans le Terminal, crée un dossier sur le Bureau :
   ```bash
   mkdir ~/Desktop/nbbc
   cd ~/Desktop/nbbc
   ```

### Étape 2.2 — Cloner le repo GitHub

1. Tape la commande suivante :
   ```bash
   git clone https://github.com/Profzen/nbbc-platform.git
   ```
2. Si le repo est privé, GitHub te demandera tes identifiants. Dans ce cas :
   - Soit utilise un **Personal Access Token** (à créer sur github.com → Settings → Developer Settings → Personal access tokens → Generate new token → coche `repo`) à la place du mot de passe
   - Soit configure SSH (plus complexe, non nécessaire ici)
3. Attends que le clonage soit terminé. Tu verras `done.` à la fin
4. Entre dans le dossier du projet :
   ```bash
   cd nbbc-platform
   ```

### Étape 2.3 — Installer les dépendances JavaScript

1. Dans le Terminal (dans le dossier `nbbc-platform`) :
   ```bash
   npm install
   ```
2. Attends la fin (peut prendre 2-5 minutes)

### Étape 2.4 — Builder le projet web

1. Toujours dans le même dossier :
   ```bash
   npm run build
   ```
2. Attends la fin — tu dois voir à la fin :
   ```
   ✓ Compiled successfully
   ✓ Generating static pages (49/49)
   ```
   S'il y a une erreur, contacte le développeur principal.

### Étape 2.5 — Synchroniser Capacitor avec iOS

1. Toujours dans le même dossier :
   ```bash
   npx cap sync ios
   ```
2. Tu dois voir à la fin :
   ```
   √ Sync finished
   ```

### Étape 2.6 — Installer les pods iOS (dépendances natives)

1. Entre dans le dossier iOS :
   ```bash
   cd ios/App
   ```
2. Installe les dépendances :
   ```bash
   pod install
   ```
3. Attends la fin (peut prendre 3-10 minutes la première fois)
4. Tu dois voir à la fin :
   ```
   Pod installation complete!
   ```
5. Retourne à la racine du projet :
   ```bash
   cd ../..
   ```

---

## PARTIE 3 — Configurer l'app dans Xcode

### Étape 3.1 — Ouvrir le projet dans Xcode

1. Dans le Terminal (dans le dossier `nbbc-platform`) :
   ```bash
   npx cap open ios
   ```
   Cela ouvre automatiquement Xcode avec le bon fichier de projet.
   
   ⚠️ Si Xcode n'ouvre pas, fais-le manuellement :
   - Ouvre Xcode
   - Menu **File → Open**
   - Navigue vers `~/Desktop/nbbc/nbbc-platform/ios/App/`
   - Sélectionne le fichier **`App.xcworkspace`** (pas `App.xcodeproj`)
   - Clique **Open**

### Étape 3.2 — Ajouter ton compte Apple Developer dans Xcode

1. Dans Xcode, menu en haut : **Xcode → Settings** (ou `Cmd+,`)
2. Clique sur l'onglet **Accounts**
3. Clique sur le bouton **+** en bas à gauche
4. Sélectionne **Apple ID** → clique **Continue**
5. Entre ton Apple ID et mot de passe → **Sign in**
6. Une fois connecté, tu vois ton compte avec "Apple Developer Program" en dessous
7. Ferme la fenêtre Settings

### Étape 3.3 — Créer l'App ID sur developer.apple.com

Avant de signer dans Xcode, l'App ID doit exister chez Apple.

1. Ouvre Safari et va sur [developer.apple.com/account](https://developer.apple.com/account)
2. Connecte-toi avec ton Apple Developer account
3. Dans le menu de gauche, clique sur **Identifiers**
4. Clique sur le bouton **+** (en haut à droite)
5. Sélectionne **App IDs** → clique **Continue**
6. Sélectionne **App** → clique **Continue**
7. Remplis les champs :
   - **Description** : `NBBC Platform`
   - **Bundle ID** : sélectionne **Explicit** et tape exactement : `com.nbbc.mobile`
8. Ne coche rien de spécial dans "Capabilities" pour l'instant
9. Clique **Continue** → **Register**

### Étape 3.4 — Configurer la signature dans Xcode

1. Dans Xcode, dans le panneau de gauche (Project Navigator), clique sur **App** tout en haut de la liste (l'icône bleue)
2. Au centre, tu vois les onglets : General, Signing & Capabilities, etc.
3. Clique sur **Signing & Capabilities**
4. En haut, assure-toi que **All** est sélectionné (ou **Release** pour le build final)
5. Dans la section **Signing** :
   - Coche **Automatically manage signing** si ce n'est pas déjà coché
   - **Team** : clique sur le menu déroulant et sélectionne ton équipe (ton nom ou le nom de l'organisation)
   - **Bundle Identifier** : vérifie qu'il est `com.nbbc.mobile`
6. Si tu vois un message d'erreur rouge, c'est souvent parce que l'App ID n'existait pas encore → l'étape 3.3 devrait avoir réglé ça. Clique sur **Try Again** si un bouton apparaît.

### Étape 3.5 — Vérifier la version et le numéro de build

1. Clique sur l'onglet **General**
2. Dans la section **Identity** :
   - **Version** : doit être `1.0` (ou la version que tu veux afficher aux utilisateurs)
   - **Build** : doit être `1` (un entier qui s'incrémente à chaque upload — pour le premier upload, laisse `1`)
3. Si tu dois changer : clique sur le champ, efface, tape la nouvelle valeur

---

## PARTIE 4 — Préparer l'app sur App Store Connect

> Cette partie peut être faite en parallèle pendant que Xcode tourne, depuis n'importe quel navigateur.

### Étape 4.1 — Créer la fiche de l'app

1. Va sur [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Connecte-toi avec le même Apple ID que dans Xcode
3. Clique sur **Apps** (grande icône bleue)
4. Clique sur le bouton **+** en haut à gauche
5. Sélectionne **New App**
6. Remplis le formulaire :
   - **Platforms** : coche **iOS**
   - **Name** : `NBBC Platform`
   - **Primary Language** : French
   - **Bundle ID** : sélectionne `com.nbbc.mobile` dans le menu déroulant (doit apparaître car on l'a créé à l'étape 3.3)
   - **SKU** : tape `nbbc-platform-001` (c'est un identifiant interne, les utilisateurs ne le voient pas)
   - **User Access** : laisse **Full Access**
7. Clique **Create**

### Étape 4.2 — Remplir les métadonnées de l'app

Tu arrives dans la fiche de la version 1.0. Remplis les sections suivantes :

**App Information** (onglet à gauche) :
- **Subtitle** : (optionnel) ex. `Gestion financière`
- **Category** : `Finance`

**Version 1.0** (section principale) :

**Promotional Text** (optionnel, peut changer sans soumettre une nouvelle version) :
> ex. `Gérez vos finances, épargnes et clients en un seul endroit.`

**Description** (obligatoire) :
> Décris l'app en quelques phrases. Ex. :
> `NBBC Platform est une application de gestion financière permettant aux agents et clients de gérer les comptes, l'épargne, les dépôts, les retraits et les tontines.`

**Keywords** (mots-clés séparés par des virgules, max 100 caractères) :
> ex. `finance,épargne,gestion,tontine,dépôt`

**Support URL** (obligatoire — URL d'une page de support) :
> `https://nbbc-platform.vercel.app` ou tout site web valide

**Marketing URL** (optionnel)

**Copyright** :
> `2025 NBBC Solutions`

### Étape 4.3 — Préparer les captures d'écran

Apple exige des captures d'écran dans des tailles spécifiques. **Tailles obligatoires :**

- **iPhone 6.5"** : 1284 × 2778 pixels (ou 1242 × 2688) — minimum 1 capture, max 10
- **iPhone 5.5"** : 1242 × 2208 pixels

**Comment faire les captures d'écran :**
- Option A : Prendre des screenshots sur un vrai iPhone
- Option B : Utiliser le Simulateur iOS dans Xcode (Étape ci-dessous)

**Utiliser le Simulateur pour les captures :**
1. Dans Xcode, en haut à gauche, clique sur le menu de sélection d'appareil (là où il est écrit "App > iPhone xx" ou similaire)
2. Sélectionne **iPhone 16 Plus** (qui fait 6.5")
3. Menu **Product → Run** (ou bouton ▶ en haut)
4. Le simulateur se lance — navigue dans l'app
5. Pour prendre une capture : menu **Device → Screenshot** (`Cmd+S`) → ça sauvegarde sur le Bureau
6. Répète pour avoir les écrans principaux (connexion, tableau de bord, comptabilité, etc.)

**Uploader les captures sur App Store Connect :**
1. Dans la fiche de l'app sur App Store Connect
2. Clique sur la section **iPhone 6.5" Display**
3. Glisse-dépose les images ou clique **Choose File**

---

## PARTIE 5 — Builder l'archive et l'uploader

### Étape 5.1 — Sélectionner la destination "Any iOS Device"

1. Dans Xcode, en haut à gauche, tu vois un menu qui dit quelque chose comme :
   `App > iPhone Simulator` ou `App > Mon iPhone`
2. Clique dessus
3. Dans la liste qui apparaît, cherche la section **Destination** et sélectionne **Any iOS Device (arm64)**
   - ⚠️ Si tu sélectionnes un simulateur, le menu Archive sera grisé — ça ne marchera pas !
   - Si tu ne vois pas "Any iOS Device", scrolle vers le haut de la liste

### Étape 5.2 — Créer l'archive

1. Dans Xcode, menu en haut : **Product → Archive**
2. ⚠️ Ce processus peut prendre **5 à 15 minutes**
3. Un message de compilation s'affiche en haut au centre de Xcode — attends qu'il devienne vert avec une coche
4. Quand c'est terminé, une fenêtre **Organizer** s'ouvre automatiquement avec l'archive listée
5. Si l'Organizer ne s'ouvre pas tout seul : menu **Window → Organizer**

### Étape 5.3 — Distribuer (uploader) sur App Store Connect

1. Dans l'Organizer, sélectionne l'archive que tu viens de créer (elle apparaît avec la date d'aujourd'hui)
2. Clique sur le bouton **Distribute App** à droite
3. Une série de questions apparaît :

   **Première fenêtre — méthode de distribution :**
   - Sélectionne **App Store Connect**
   - Clique **Next**

   **Deuxième fenêtre — destination :**
   - Sélectionne **Upload**
   - Clique **Next**

   **Troisième fenêtre — options de distribution :**
   - Laisse tout coché par défaut (Strip Swift symbols, Upload symbols, Manage Version & Build Number)
   - Clique **Next**

   **Quatrième fenêtre — signature (Re-sign) :**
   - Sélectionne **Automatically manage signing**
   - Clique **Next**

   **Cinquième fenêtre — résumé :**
   - Vérifie que le Bundle ID est `com.nbbc.mobile` et la version est correcte
   - Clique **Upload**

4. L'upload commence — ça peut prendre **2 à 10 minutes** selon la connexion
5. À la fin tu vois **"App "App" successfully uploaded."** → clique **Done**

---

## PARTIE 6 — Soumettre sur App Store Connect

### Étape 6.1 — Attendre que le build soit traité

1. Va sur [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **Apps** → **NBBC Platform**
2. Clique sur l'onglet **TestFlight** en haut
3. Tu verras le build avec le statut **"Processing"** — attends qu'il passe à **"Ready to Submit"**
4. Ce traitement prend généralement **5 à 30 minutes**
5. Tu recevras un email d'Apple quand le build est prêt

### Étape 6.2 — Associer le build à la version

1. Va sur l'onglet **App Store** en haut
2. Dans la section **iOS App**, clique sur **1.0 Prepare for Submission**
3. Scrolle jusqu'à la section **Build**
4. Clique sur le bouton **+** à côté de "Build"
5. Sélectionne le build `1.0 (1)` qui apparaît
6. Clique **Done**

### Étape 6.3 — Remplir les informations manquantes

Avant de pouvoir soumettre, Apple exige :

**Age Rating (Classification) :**
1. Dans la barre de gauche, clique sur **App Information**
2. Clique sur **Edit** à côté de "Age Rating"
3. Réponds aux questions (violence, contenu adulte, etc.) — pour une app financière, tout doit être **None** ou **No**
4. Clique **Done** → la classification sera probablement **4+**

**Privacy Policy URL (obligatoire) :**
- Dans **App Information**, cherche **Privacy Policy URL**
- Entre : `https://nbbc-platform.vercel.app/privacy`

**App Privacy (obligatoire) :**
1. Dans la barre de gauche, clique sur **App Privacy**
2. Clique sur **Get Started**
3. La question "Does this app collect data?" → réponds honnêtement. Pour une app avec comptes utilisateurs : **Yes**
4. Coche les types de données collectées (ex. : Email Address, Name si tu collectes des infos de connexion)
5. Pour chaque type, indique l'usage (Account Management, App Functionality)
6. Clique **Publish**

### Étape 6.4 — Soumettre pour review

1. Reviens sur la version **1.0 Prepare for Submission**
2. Vérifie que toutes les sections ont une coche verte (pas de rouge)
3. En haut à droite, clique sur le bouton **Add for Review**
4. Une fenêtre apparaît — clique **Submit to App Review**

🎉 **C'est fait !** L'app est maintenant en attente de review.

---

## PARTIE 7 — Après la soumission

### Ce qui se passe ensuite

| Délai | Statut |
|---|---|
| Immédiat | **Waiting for Review** |
| ~24-48h | **In Review** (Apple examine l'app) |
| ~1-3 jours | **Approved** ou **Rejected with feedback** |

- Si **Approved** → clique **Release This Version** pour la mettre en ligne
- Si **Rejected** → Apple envoie un email détaillant le problème. Corrige, resoumets.

### Comment vérifier le statut

- Va sur [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **Apps** → **NBBC Platform**
- Le statut apparaît en haut de la page
- Tu recevras aussi des emails à chaque changement de statut

---

## Problèmes fréquents et solutions

| Problème | Solution |
|---|---|
| "No accounts found" dans Signing | Aller dans Xcode → Settings → Accounts → ajouter Apple ID |
| "Failed to create provisioning profile" | Vérifier que l'App ID `com.nbbc.mobile` existe sur developer.apple.com → Identifiers |
| "Archive" est grisé dans le menu Product | Vérifier que la destination sélectionnée est "Any iOS Device (arm64)" et non un simulateur |
| Erreur `pod install` : "CocoaPods is not installed" | Relancer `brew install cocoapods` dans le Terminal |
| Build en statut "Processing" bloqué depuis >1h | Généralement un problème Apple — attendre ou recontacter |
| Erreur "Missing compliance" | Dans App Store Connect, aller dans la fiche du build et répondre aux questions sur l'export de cryptographie (pour une app web standard : Non) |
| `npm run build` échoue | Contacter le développeur principal — il faut probablement le fichier `.env.local` avec les variables d'environnement |

---

## Récapitulatif des commandes Terminal (dans l'ordre)

```bash
# Étape 1 — Ouvrir Terminal et installer les outils
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install git node@22 cocoapods
echo 'export PATH="/opt/homebrew/opt/node@22/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Étape 2 — Cloner et préparer
mkdir ~/Desktop/nbbc
cd ~/Desktop/nbbc
git clone https://github.com/Profzen/nbbc-platform.git
cd nbbc-platform
npm install
npm run build
npx cap sync ios

# Étape 3 — Installer les pods iOS
cd ios/App
pod install
cd ../..

# Étape 4 — Ouvrir dans Xcode
npx cap open ios
```

> Après cette dernière commande, tout se passe dans Xcode (interface graphique) — voir Parties 3, 4, 5, 6.

---

*Guide préparé pour le déploiement de NBBC Platform sur l'App Store iOS.*
*Bundle ID : `com.nbbc.mobile` 
