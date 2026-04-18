# MEMOIRE PROJET - NBBC PLATFORM

Ce document est la reference durable pour reprendre le projet sans perte de contexte. Il doit rester vivant et etre enrichi au fur et a mesure des evolutions metier, techniques et operatoires.

## 1) Vision produit

NBBC Platform est une application de gestion interne et client qui couvre:
- CRM clients
- Comptes et moyens de paiement
- Cartes / comptes rattachés
- KYC
- Signature electronique
- Marketing
- Comptabilite
- Tontine / epargne programmee
- Gains & Epargne

Objectif permanent:
- une seule logique metier,
- une seule base de code,
- une experience coherente Web + APK Android + iOS Capacitor.

Principe cle:
- la logique vit dans les modeles, routes API et helpers partages;
- l’UI adapte le rendu selon l’ecran, mais ne duplique pas la regle metier.

## 2) Stack technique

- Frontend: Next.js App Router (Next 16)
- UI: React 19 + Tailwind CSS
- Langage: TypeScript
- Auth: NextAuth credentials
- Base de donnees: MongoDB via Mongoose
- Mobile hybride: Capacitor (Android et iOS)
- Graphiques: Recharts
- PDFs / exports: jsPDF + jspdf-autotable
- Fichiers media: Cloudinary
- Envoi email: helper mailer interne + SMTP / provider configure

## 3) Organisation du depot

Arborescence importante:
- src/app: pages, layouts et routes API
- src/models: schemas Mongoose
- src/lib: helpers metier, auth, db, PDF, mail, activity log
- src/components: composants partages UI
- public: assets web standard
- public-mobile: assets embarques pour Capacitor
- android: projet Android natif Capacitor
- ios: projet iOS natif Capacitor
- docs: guides d’exploitation et release

Regle d’or:
- ne pas creer de fork web/mobile pour la logique metier;
- si un comportement change, il doit etre visible dans le code partage et ensuite synchronise vers le natif si besoin.

## 4) Parite Web / Mobile

Le projet doit etre pense comme une seule application logique servie sur plusieurs cibles.

Cas 1: app mobile charge l’URL web en production
- le deploy web suffit si CAPACITOR_APP_URL pointe vers la version de production;
- l’app mobile affiche alors automatiquement les changements apres mise en ligne.

Cas 2: app mobile embarquee / build natif a reconstruire
- il faut faire un `npm run build`;
- puis `npm run cap:sync`;
- puis reconstruire Android et/ou iOS.

Points importants:
- sur Windows, Android est prepare / compilable localement;
- iOS ne se compile pas localement sur Windows, il faut un Mac pour la compilation Xcode;
- si les assets ou pages changent, il faut verifier `public-mobile` et relancer la synchro Capacitor.

## 5) Capacitor et configuration mobile

Configuration actuelle:
- `capacitor.config.ts` utilise `webDir: 'public-mobile'`;
- `CAPACITOR_APP_URL` peut pointer vers la version web de production;
- en production, l’app mobile peut charger la meme URL que le web si la config le demande.

Guide pratique:
- changer le code web partage -> deploy web;
- si le build natif doit embarquer les changements -> `npm run build` puis `npm run cap:sync`;
- pour Android, ouvrir le projet natif ou lancer la CI;
- pour iOS, passer par un Mac/Xcode.

## 6) Workflow de livraison mobile

Le flux que l’on suit quand les changements doivent remonter sur mobile:
1. Developper la fonctionnalite dans le code partage.
2. Valider TypeScript et le build web.
3. Faire `npm run cap:sync` si le wrapper natif doit etre mis a jour.
4. Laisser GitHub Actions produire les artefacts Android.
5. Recuperer les fichiers de release dans les Actions GitHub.

Artefacts attendus cote GitHub Actions:
- `nbbc-platform-debug-apk`
- `nbbc-platform-release-aab`
- `nbbc-platform-release-apk`

Raccourci mental:
- si c’est seulement du contenu web ou API partagee, le deploy web suffit pour l’app qui charge l’URL distante;
- si le packaging natif doit etre mis a jour, il faut synchro + build Android/iOS.

## 7) Authentification et roles

Roles actuellement utilises:
- SUPER_ADMIN
- AGENT
- ANALYSTE
- COMPLIANCE
- TONTINE_CLIENT

Regles:
- les clients utilisent l’inscription publique;
- `TONTINE_CLIENT` est attribue a l’inscription client;
- les routes sensibles doivent rester proteges par session + role;
- les operations administratives ne doivent pas etre exposées en public.

Flux auth:
- NextAuth credentials;
- mot de passe hashé;
- session JWT avec role, id et nom.

## 8) Securite critique deja durcie

Ancien risque resolu:
- la route de setup admin etait trop exposee.

Etat actuel:
- route `setup-admin` en POST;
- accessible seulement par SUPER_ADMIN connecte;
- plus de retour de mot de passe en clair;
- le middleware ne doit pas laisser cette route accessible en public.

## 9) Tontine - socle metier deja en place

Modeles:
- TontineContract
- TontineEcheance
- TontineVersement

Routes:
- `/api/tontines` (GET/POST)
- `/api/tontines/[id]` (GET)
- `/api/tontines/[id]/echeances` (GET/POST)
- `/api/tontines/[id]/versements` (GET/POST)

Regles deja implantees:
- periodicite: JOURNALIERE ou HEBDOMADAIRE
- duree: 3 ou 6 mois
- rails de paiement: CRYPTO, MOBILE_MONEY, CARTE, BANQUE, MANUEL
- idempotency key sur les versements
- access control par role
- auto-generation des echeances a la creation du contrat

UI tontine presente:
- liste tontines
- creation tontine
- detail contrat
- versement
- historique versements
- progression / echeances

## 10) Comptabilite - structure generale

La comptabilite est centralisee dans:
- `src/app/comptabilite/page.tsx`
- `src/lib/accounting.ts`
- `src/lib/compta-daily-report.ts`
- `src/lib/compta-scheduled-report.ts`

Ce module gere:
- achats
- ventes
- depenses
- dettes
- depots / retraits
- comptes
- Gains & Epargne

Principe:
- les calculs de solde et de total doivent etre faits dans les helpers centraux, pas uniquement dans l’UI.

## 11) Gains & Epargne - regles metier

Ce module appartient a la partie comptabilite.

Types gérés:
- `GAIN`
- `EPARGNE_DEPOT`
- `EPARGNE_RETRAIT`

Règles:
- un gain est un credit simple, sans debit;
- un depot d’epargne debite un compte source;
- le credit principal va sur le compte `Epargne`;
- les frais de 3,4 % s’appliquent uniquement aux depots d’epargne;
- les retraits d’epargne ne portent pas ce frais;
- un retrait d’epargne credite un compte destination choisi;
- tous les montants doivent accepter les decimales et etre arrondis a 2 chiffres.

Comptes standards ajoutes / attendus:
- `Epargne`
- `Frais épargne`

Risque a garder en tete:
- ne pas casser les anciens enregistrements depot/retrait;
- rester compatible avec les donnees existantes en prod.

## 12) Comptabilite - calculs et helper central

Le moteur de calcul central est `src/lib/accounting.ts`.

Ce qu’il fait:
- normalise les comptes;
- enrique les transactions;
- enrique les depots/retraits;
- calcule les soldes par compte;
- produit un resume comptable cumule jusqu’a une date donnee.

Points a retenir:
- les calculs doivent rester a 2 decimales;
- la logique de balance doit rester unique;
- les nouveaux types de depots sont integres sans casser les anciens;
- le compte `Epargne` est utilise comme reference pour le total epargne cumule.

## 13) Exports PDF comptables

Le workflow d’export a deux niveaux:

Exports manuels dans la page comptabilite:
- export des transactions du jour
- export depots / retraits
- export comptes
- export gains cumules
- export epargne cumulee

Exports automatiques / emails:
- etat global
- achats
- ventes
- depenses
- dettes
- depots / retraits
- gestion comptes
- etat materiel
- gains cumules
- epargne cumulee

Important:
- les nouveaux PDFs Gains et Epargne doivent garder le style des autres exports;
- ils doivent etre cumulatifs jusqu’a la date choisie;
- ils doivent aussi etre inclus dans le bundle de l’envoi automatique.

## 14) Dashboard principal

Le dashboard principal affiche:
- total clients
- comptes enregistres
- KYC valides
- KYC en attente
- et maintenant l’`Épargne cumulée`

Il y a un bouton:
- `Envoyer exports`

Ce bouton appelle le flux d’exports comptables automatiques.

## 15) UI comptabilite

La page `src/app/comptabilite/page.tsx` contient:
- dashboard comptable
- onglets metier
- modales creation / edition
- tables desktop
- cartes ou vues simplifiees sur mobile

Regle UI importante:
- ne pas imposer de tableau horizontal sur un petit ecran si une vue carte est plus lisible.

Nouvelle section a garder en tete:
- `Gains & Epargne`

Elle doit permettre:
- creation d’un gain;
- creation d’un depot d’epargne;
- creation d’un retrait d’epargne;
- visualisation du total cumule;
- export PDF cumule.

## 16) Models et routes critiques

Collections principales:
- User
- Client
- Carte
- Compte
- Transaction
- DepotRetrait
- KycRequest
- SignatureRequest
- Campaign
- TontineContract
- TontineEcheance
- TontineVersement

Routes sensibles a ne pas casser:
- `/api/auth/[...nextauth]`
- `/api/auth/register`
- `/api/setup-admin`
- `/api/comptabilite/*`
- `/api/tontines/*`

## 17) Assets et logo

Le logo login doit exister pour web et mobile.

Emplacements importants:
- `public/nbbcl.png`
- `public-mobile/nbbcl.png`

Regle:
- si un logo ou un asset change et que l’app mobile embarque le contenu local, il faut synchroniser `public-mobile` puis lancer Capacitor sync.

## 18) Build, tests et qualite

Commandes utiles:
- `npm run dev`
- `npm run build`
- `npx tsc --noEmit`
- `npm run cap:sync`
- `npm run cap:open:android`
- `npm run cap:open:ios`

Definition of Done minimale:
- TypeScript propre;
- build Next OK;
- pas de regression role/session;
- pas de regression mobile;
- test web valide;
- si necessaire, test mobile ou build natif valide.

## 19) GitHub Actions et recuperation des builds

Le workflow Android passe par GitHub Actions.

Mode operatoire habituel:
- tu pousses le code;
- tu vas dans l’onglet Actions sur GitHub;
- tu attends la fin du build;
- tu telecharges les artefacts generes.

Artefacts a recuperer:
- `nbbc-platform-debug-apk`
- `nbbc-platform-release-aab`
- `nbbc-platform-release-apk`

Regle d’exploitation:
- si une modification web doit aussi exister dans l’app mobile, il faut verifier que la synchro Capacitor et le workflow GitHub Actions ont bien pris la nouvelle version.

## 20) Outils de release mobile

Si le changement est purement web et que l’app mobile pointe vers l’URL de production:
- deploy web suffisant.

Si le changement doit etre embarque dans le natif:
1. `npm run build`
2. `npm run cap:sync`
3. Android: build via Android Studio ou CI
4. iOS: build via Xcode sur Mac

Si un doute existe:
- verifier d’abord si l’app mobile charge l’URL distante ou le bundle embarque.

## 21) Routines de travail

Regles de travail permanentes:
- faire des changements petits et coherents;
- ne pas casser la parite web/mobile;
- ne pas faire de refactor massif hors demande;
- valider au minimum TypeScript avant de considerer la tache terminee;
- si l’app mobile peut etre impactee, penser sync Capacitor ou rebuild native;
- pour toute modification web partagee, exiger `npm run build` puis `npm run cap:sync` avant livraison afin que les builds Android/iOS et les artefacts GitHub Actions restent alignes;
- si la modification doit etre embarquee dans l’application native, verifier ensuite la reconstruction Android/iOS ou les artefacts CI correspondants.

## 22) Checklist de verification rapide

Avant livraison, verifier au minimum:
- login;
- inscription client;
- acces protege;
- navigation responsive;
- comptabilite et exports;
- mobile native / Capacitor si le changement impacte l’interface ou les assets.

## 23) Procedure de reprise apres oubli de contexte

Si le contexte est perdu:
1. Relire ce fichier en entier.
2. Verifier l’arborescence et les fichiers principaux.
3. Relancer TypeScript / build.
4. Rejouer les endpoints et ecrans concernes.
5. Verifier si la partie mobile doit aussi etre synchronisee.
6. Reprendre avec des changements minimaux et verifies.

## 24) Points sensibles a ne pas casser

- auth credentials + roles;
- routes sensibles;
- setup-admin;
- idempotence des versements;
- responsive mobile;
- public-mobile pour les assets natifs;
- calculs comptables a 2 decimales;
- compatibilite des anciens enregistrements.

## 25) Resume executif

NBBC Platform est une seule application logique rendue sur plusieurs cibles. Le web et la partie mobile hybride partagent les memes modeles, les memes routes et la plupart des composants. La release mobile doit etre consideree a chaque changement qui touche le rendu, les assets ou la logique metier. Pour les builds Android, GitHub Actions est le point de recuperation des artefacts de release, et pour iOS il faut passer par un environnement Mac/Xcode. Le fichier memoire doit rester la source de verite pour reprendre le projet rapidement.

Regle operationnelle a garder absolue:
- toute modification web partagee doit etre validee pour le web puis synchronisee vers Capacitor avant de considerer le travail termine.

Fin du document.