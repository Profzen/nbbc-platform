# MEMOIRE PROJET - NBBC PLATFORM

Ce document est la reference de continuite du projet. Il doit permettre de reprendre le travail sans perte de contexte, aussi bien pour la version web que pour la version APK/iOS (Capacitor).

## 1) Identite du projet

- Nom: NBBC Platform
- Repo: https://github.com/Profzen/nbbc-platform.git
- Stack principale: Next.js App Router + TypeScript + Tailwind + MongoDB (Mongoose) + NextAuth
- Cible produit: gestion clients, cartes/comptes, KYC, signature, marketing, comptabilite, et module tontine/epargne programmee
- Plateformes: Web + Android/iOS via Capacitor

## 2) Principe non negociable

- Parite web/mobile native obligatoire.
- Toute fonctionnalite doit rester synchronisee entre web et APK/iOS.
- Pas de duplication de logique metier par plateforme.
- Une seule source de verite: modeles + routes API + composants responsives.

## 3) Branchement et flux Git (etat reel)

- Branche active: main
- Branche distante detectee: origin/main
- Pratique actuelle observee: commits et push directs sur main
- Implication: verifier fortement avant push (lint/build/tests manuels)

Regles de travail recommandees dans ce contexte:
- Faire de petits commits fonctionnels et atomiques.
- Eviter les refactors larges non demandes.
- Ne jamais casser la parite web/mobile.
- Toujours valider au minimum par build TypeScript/Next avant push.

## 4) Architecture technique (vue rapide)

- Front: Next.js 16 (App Router), React 19, Tailwind v4
- Auth: NextAuth (session + roles)
- DB: MongoDB via Mongoose
- Mobile natif: Capacitor (android/ios)
- UI icons: lucide-react
- PDF/signature/KYC/marketing/comptabilite deja presents

Dossiers structurants:
- src/app: pages et routes API
- src/models: schemas Mongoose
- src/components: composants partages (sidebar, auth provider, etc.)
- src/lib: auth, db, generateurs, utilitaires
- android, ios: wrappers natifs Capacitor
- public-mobile: webDir mobile configure dans Capacitor

## 5) Authentification et roles

Roles metier utilises:
- SUPER_ADMIN
- AGENT
- ANALYSTE
- COMPLIANCE
- TONTINE_CLIENT

Regles importantes:
- Les clients tontine se creent via inscription publique.
- Le role TONTINE_CLIENT est assigne automatiquement a l'inscription client.
- La creation d'utilisateurs par l'admin est reservee aux roles internes (notamment AGENT, selon les ecrans/routes deja ajustes).
- Les endpoints sensibles sont proteges par session.

## 6) Synchronisation web/APK: methode d'uniformisation

Strategie appliquee:
- Meme backend pour tous (meme routes API).
- Meme modeles Mongoose.
- Meme pages React, adaptation uniquement responsive.
- Detection native uniquement pour ajustements de shell/navigation (ex: top bar native), jamais pour dupliquer la logique metier.

Pattern UI mobile/desktop retenu:
- Mobile: cartes + bouton Voir plus (evite le scroll horizontal)
- Desktop: tableau complet
- Technique: combiner classes Tailwind du type md:hidden et hidden md:block

Ce pattern est deja applique sur des sections critiques comme:
- clients
- cartes/comptes
- et doit etre la norme pour les nouveaux ecrans de gestion

## 7) Tontine - socle deja en place

Modeles crees:
- TontineContract
- TontineEcheance
- TontineVersement

Routes API creees:
- /api/tontines (GET/POST)
- /api/tontines/[id] (GET)
- /api/tontines/[id]/echeances (GET/POST)
- /api/tontines/[id]/versements (GET/POST)

Regles de base deja implementees:
- periodicite: JOURNALIERE ou HEBDOMADAIRE
- duree: 3 ou 6 mois
- statut contrat couvrant cycle complet (ACTIVE, LATE, MATURED, etc.)
- rails de paiement (crypto/mobile money/carte/banque selon schema)
- idempotency key sur versements
- controle d'acces: TONTINE_CLIENT voit seulement ses contrats
- journalisation d'activite integree

UI tontine (etat actuel du socle):
- Ecran liste/dashboard tontines
- Ecran creation d'une nouvelle tontine
- Navigation vers la section tontines dans la sidebar
- Concu pour web + mobile avec la meme logique

## 8) Conventions de developpement a respecter

- Conserver les API publiques existantes, sauf demande explicite.
- Eviter de modifier des fichiers hors perimetre de la tache.
- Garder les styles et patterns UI coherents avec les pages existantes.
- Prefere des changements minimaux mais complets (pas de demi-correction).
- Verifier les droits role/session sur toute nouvelle route.
- Ajouter de la journalisation d'activite pour toute action metier sensible.
- Sur mobile, privilegier lisibilite et interactions simples (cartes expandables).

## 9) Commandes de travail utiles

Developpement:
- npm run dev
- npm run lint
- npm run build

Capacitor:
- npm run cap:sync
- npm run cap:add:android
- npm run cap:add:ios
- npm run cap:open:android
- npm run cap:open:ios

Important:
- Le projet contient plusieurs lockfiles dans le workspace parent; Next affiche un warning de root inferree.
- La convention middleware Next est marquee deprecated vers proxy (warning non bloquant, a traiter plus tard proprement).

## 10) Controle qualite avant push

Checklist minimum:
- Build passe sans erreur bloquante.
- Les pages mobile n'imposent pas de scroll horizontal.
- Les formulaires restent utilisables avec clavier mobile (overlay et safe area verifies).
- Les routes API renvoient des erreurs explicites et des codes HTTP coherents.
- Les roles et droits d'acces sont testes (client vs admin).
- La navigation fonctionne sur web et APK (menu/sidebar/top bar).

## 11) Decisions historiques importantes a ne pas perdre

- Le client final ne doit pas dependre d'une creation de compte par admin.
- L'inscription client doit rester simple depuis l'ecran de connexion.
- Les ecrans denses (clients/cartes/tontines) doivent utiliser le pattern carte + Voir plus sur mobile.
- Le haut d'ecran natif peut afficher l'utilisateur connecte (nom + initiale) pour occuper l'espace utile.
- Toute evolution doit garder la coherence entre version web et version APK.

## 11-bis) Ne jamais changer sans validation explicite

Ces points sont verrouilles. Toute modification doit etre validee avant implementation.

- Ne pas casser la parite web + APK/iOS.
- Ne pas dupliquer la logique metier selon la plateforme.
- Ne pas retirer l'inscription publique client ni l'affectation automatique du role TONTINE_CLIENT.
- Ne pas exposer des routes sensibles sans session ni contourner les controles de role.
- Ne pas remplacer le pattern mobile carte + Voir plus par un tableau horizontal sur petit ecran.
- Ne pas modifier les enums/metiers critiques tontine (periodicite, duree, statuts) sans validation metier.
- Ne pas supprimer l'idempotence des versements ou les traces de journalisation d'activite.
- Ne pas changer la branche de livraison (main) ni la strategie de commit/push sans decision explicite.
- Ne pas introduire des refactors massifs hors perimetre d'une demande.
- Ne pas fusionner du code non valide par build minimum.

## 12) Plan de continuation prioritaire (si reprise immediate)

1. Verifier en test manuel complet le flow tontine de bout en bout.
2. Ajouter/finir les vues de detail tontine par contrat.
3. Connecter pleinement les interactions versements/echeances dans l'UI.
4. Completer l'automatisation des echeances selon periodicite/duree.
5. Durcir les scenarios d'erreur payout et fallback manuel.

## 13) Resume executif de reprise rapide

Si contexte oublie, reprendre avec ces regles:
- Toujours penser web + APK comme une seule app logique.
- API/modeles partages, UI responsive adaptee.
- Roles et securite d'abord.
- Mobile sans scroll horizontal.
- Commits petits et verifies sur main.
- Toute fonctionnalite tontine doit rester traçable, auditable et idempotente.

## 14) Procedure d'urgence (hotfix en 5 minutes)

Objectif: corriger vite sans casser la synchro web/APK.

1. Identifier le perimetre exact (page, route, modele, role impacte).
2. Appliquer le correctif minimal (pas de refactor annexe).
3. Verifier localement:
	- npm run build
	- test manuel rapide web (desktop + mobile viewport)
	- test manuel APK (navigation + ecran corrige)
4. Verifier securite:
	- route protegee si necessaire
	- pas de regression role/session
5. Commit atomique clair puis push sur main.

Raccourci de decision:
- Si le fix menace la parite web/APK, stopper et corriger l'approche avant merge.
- Si le fix touche auth/roles/tontine ledger, exiger verification manuelle renforcee.

## 15) Definition of Done (DoD) obligatoire

Une tache est consideree terminee seulement si:

- La fonctionnalite marche sur web et APK avec comportement coherent.
- Aucune casse responsive mobile (pas de scroll horizontal non voulu).
- Les erreurs utilisateur sont explicites (messages clairs, HTTP coherent cote API).
- Les controles d'acces sont valides (client vs roles internes).
- Le build passe sans erreur bloquante.
- Les impacts nav/shell mobile sont verifies si la page est dans le flux principal.

## 16) Protocole de test synchronise web + APK

Toujours tester les memes cas des deux cotes.

Cas minimum front:
- Ouverture page liste
- Recherche/filtre si disponible
- Action primaire (creer, modifier, supprimer, soumettre)
- Etat vide
- Etat erreur
- Etat loading
- Retour navigation (back, menu, onglets)

Cas minimum metier/API:
- Session absente -> acces refuse
- Session valide role client -> acces scope utilisateur
- Session role interne -> acces etendu selon regles
- Validation des champs obligatoires
- Reponses d'erreur stables (format success/error)

Cas minimum mobile natif:
- Header/top bar visible et lisible
- Clavier n'ecrase pas les champs/formulaires critiques
- Boutons d'action accessibles sans debordement
- Scroll vertical fluide, aucun debordement lateral

## 17) Convention de commit et messages

Format recommande:
- feat(scope): ajout fonctionnel
- fix(scope): correction
- refactor(scope): refonte sans changement fonctionnel
- chore(scope): maintenance technique

Exemples:
- feat(tontine): add responsive contracts dashboard web+apk parity
- fix(mobile): prevent horizontal overflow on clients cards
- fix(auth): enforce role guard on register-related route

Regle:
- Un commit = une intention metier principale.
- Eviter les commits melanges (UI + gros backend non lies) quand possible.

## 18) Garde-fous specifiques tontine

Ne jamais perdre ces invariants:

- Chaque versement doit rester traçable (reference, timestamp, acteur/systeme).
- L'idempotency key ne doit pas etre retiree des flux de paiement.
- Les transitions de statut contrat doivent rester coherentes avec le cycle de vie.
- Les montants et penalites doivent etre calculables et auditables a posteriori.
- Toute action sensible doit laisser une trace dans l'activite/audit.

Verification rapide tontine avant livraison:

1. Creation contrat ok.
2. Lecture liste/contrat scopee par role.
3. Versement enregistre sans doublon (idempotence).
4. Echeance mise a jour selon encaissement.
5. UI mobile et desktop lisibles sans scroll horizontal parasite.

## 19) Procedure de reprise apres interruption longue

Quand le contexte est perdu:

1. Lire ce fichier en entier.
2. Confirmer branche et etat git (main + fichiers modifies).
3. Rejouer un build local.
4. Relire les modeles et routes du perimetre vise.
5. Executer un mini test web+APK du flux cible.
6. Reprendre uniquement avec des changements minimaux et verifies.

## 20) Mode operatoire permanent

Ligne directrice finale:

- Concevoir une seule logique produit.
- Exposer cette logique via routes/API/modeles communs.
- Adapter l'UX par responsive, pas par fork metier par plateforme.
- Securiser auth/roles/audit en priorite.
- Livrer petit, verifier fort, pousser propre sur main.

Fin du document memoire.
