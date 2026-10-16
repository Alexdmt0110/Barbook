# Revues de développement

## L0 — Revue préventive, 16 octobre 2026

Besoin : reprise durable et mécanisme d'écriture réel avant code. Périmètre : documents canoniques, catalogue/audit validés, branche dédiée et handoff. Exclusions : changement applicatif, dépendance, DB, production et branche dossiers. Risques : publication de sources privées/secrets, état Git obsolète, confusion autorisation/catalogue, double écrivain. Mesures : uniquement livrables d'audit sans sources privées, refs distantes contrôlées, champs d'autorisation explicites, publication non forcée et un propriétaire WORK. Tests : cohérence JSON/IDs/liens, scan des fichiers ajoutés, diff --check, lecture des SHA/message/fichiers distants après publication.

## L0 — Review Gate du premier bloc documentaire

Fonctionnel/validation : lots L0–L2 explicites, D1–D8 ouvertes, catalogue 66 IDs conservés. DB/erreurs/sécurité : aucun code ni SQL modifié ; aucun secret ou source normative privée ajouté. Tests : validation documentaire avant publication ; tests applicatifs non relancés pour ce changement documentaire. Maintenabilité/dépendances : chemins canoniques, archive datée séparée du suivi ; aucun paquet changé. Frontend/performance/OPS : sans impact d'exécution. Production readiness : toujours à qualifier dans les lots ultérieurs. BLOCKER/P1 du diff : aucun identifié à la revue documentaire ; nouvelle lecture GitHub et CI requises avant la PR. Les risques applicatifs de phase A ne sont pas présentés comme corrigés.

## L1 création — Revue préventive et Review Gate complet

Portée : fix/cocktail-creation-boundaries depuis main 3f9dfdbd3115380960296db3c7025715d48db55c ; 9 fichiers, sans migration. Choix : nom New conservé, slug new-cocktail réservé à sa génération ; mainAlcoholName:null équivaut à absence, types DTO/API alignés. Aucun changement de session ou de propriété. Cas limites : accents/casse/ponctuation, ingrédients nommés New non affectés, collision canonique toujours 409, noms/alcools habituels conservés. Revue du service, de ses règles, du DTO, des appels Angular et des tests avant changement.

Preuve de régression avant correctif : test ciblé réellement exécuté, 3 échecs (null/normalize, New, NÉW !!!), 24 succès. Après correction : backend npm run verify, 18 suites / 139 tests, lint, build, Prisma validate passés ; frontend npm run verify, 17 fichiers / 110 tests, lint et build passés. git diff origin/main...HEAD --check passé, arbre propre après synchronisation du commit e925cbbe99e2ff3b93d26e32c3d41509726fb0a3.

Revue complète de la branche contre main après publication : fonctionnel/validation (null, mauvais types, slugs, noms usuels) ; DB/transactions/isolations inchangées ; erreurs 400/409 conservées ; auth, secrets et droits inchangés ; tests significatifs, casts supprimés ; responsabilités cohésives et aucune dépendance ajoutée ; frontend utilise le slug renvoyé ; aucune modification visuelle ou coût de requête ajouté ; documentation et absence de migration/VPS confirmées. Aucun BLOCKER/P1 introduit identifié. Les vrais tests HTTP/DB/navigateur restent L2. Les éventuels anciens slugs new nécessitent un contrôle de données avant utilisation sur une base existante ; pas de réécriture de données implicite. PR autorisée, merge non autorisé.

## L0 — Contrôle de la PR réelle

PR #20 : 12 fichiers documentaires conformes au commit publié, base main et head d3bf5138e3c6fffc58bd473377b175ac75940d94 relus. CI run 38904129204 terminé success. Le patch du gros backlog JSON n'est pas rendu par la liste des fichiers GitHub ; son contenu a été validé localement et son blob versionné reste la référence. Aucune modification applicative, SQL ou production.

## L1 dépendances — Revue préventive et Review Gate complet

Branche hardening/dependency-security depuis main ; 8 fichiers. Analyser chaque chaîne runtime/outils, appliquer les corrections compatibles, aligner les peers Angular, migrer Jest pour supprimer braces et tester l'override NYC avant de l'accepter. Pas de changement métier ou de schéma. Choix de regrouper les locks frontend/backend et le gate d'audit dans une branche de sécurité cohérente, plutôt que dupliquer leurs résolutions dans deux branches.

Diff complet ab756e690ee5817f2689c834afe4fdd1b3daf694 contre main relu : manifestes/locks, workflow, test CJS, relevé et guide. Majors transitifs backend liés à Jest 30 (dont Babel/Istanbul/fake timers) exercés par les tests et la couverture ; content-disposition 2 suit Express 5.3 dans les outils Angular, build/serve à requalifier avec L2. Aucun paquet applicatif majeur Angular/Nest/Prisma changé. Provenance registry.npmjs.org et empreintes des 8 blobs distants vérifiées. npm ls --all --omit=optional passe des deux côtés.

Fonctionnel/validation : verify backend 124 tests + compatibilité NYC, frontend 109 tests, lint/build/generate/validate ; couverture Jest 124 tests. DB/transactions/migrations/droits : inchangés, essais PostgreSQL prévus dans L2. Erreurs/sécurité : 4 audits à zéro ; pas de force, downgrade ou check désactivé ; CI contents:read, Actions épinglées, pas de secret. Maintenabilité : override limité, justifié et assorti d'une condition de retrait ; aucun refactor applicatif. Frontend/performance : pas d'UI modifiée, build passé. OPS : aucune production, image finale non auditée à ce stade. Warnings de dépréciation réévalués et tracés, sans avis npm restant. Aucun BLOCKER/P1 du diff identifié.

PR #22 ouverte après Review Gate ; vrai diff et base/head/mergeability relus. Gros lock backend non rendu en patch par l'API GitHub : blob distant exact comparé au fichier contrôlé. CI avant PR run 38909318380 success ; puis Backend Quality, Frontend Quality et Dependency Audit backend/frontend observés success sur le head. #20 et #21 restent ouvertes et vertes, aucun merge.

## L2 — Revue préventive

Besoin : preuves réelles sur les parcours existants. Une branche test/critical-integration-flows basée sur main regroupera le socle PostgreSQL/HTTP et son usage navigateur ; cela évite des copies de bootstrap et des dépendances de branches non mergées. Les commits seront séparés par blocs cohérents.

Plan : partager configureApplication entre le vrai démarrage et les tests ; corriger start:prod (MODULE_NOT_FOUND réellement reproduit, sortie compilée dist/src/main.js). Utiliser PostgreSQL 16 jetable en CI, migrations fraîches/status/upgrade, fixtures synthétiques, transactions et triggers de panne temporaires uniquement dans une DB de test autorisée. Garde-fous : NODE_ENV=test, consentement explicite de fixture, nom barbook_test_*, hôte loopback, base entièrement jetable ; aucun reset/seed propriétaire/VPS. Tester auth/JWT, DTO hostiles, CHECK/uniqueness/FK composites, rollback, isolation et concurrence. E2E Chromium desktop/mobile avec vraie API/DB et traces d'échec. Conserver tous les contrôles existants ; déclencher le workflow d'intégration sur la branche pour obtenir les preuves avant sa PR. Pas de nouveau modèle métier ni de décisions D1–D8 implémentées.

Limites initiales : aucun serveur PostgreSQL/Docker ni navigateur installé dans cette session ; namespace UID uniquement root et création d'une identité système distincte refusée. Les preuves natives seront exécutées et lues dans GitHub Actions. Ne pas annoncer un test local PostgreSQL réussi. Les branches L1 restent indépendantes non mergées ; requalification combinée sur main après les merges autorisés, sans recopier leurs correctifs. La migration dossiers reste exclusivement sur sa branche conservée ; L2 teste les migrations de main, pas une application implicite de L3.

## L2 — Premier checkpoint natif et revue corrective

Commit 9e63d94adcfe0c7a6cdbcd0871d0c5129013f388 : 16 fichiers publiés et blobs distants vérifiés. Local : 124 tests unitaires, 10 tests de garde-fous, lint/build/Prisma validate, tsc --noEmit passés. Les sources compilées produisent dist/main.js ; fixtures et scripts Prisma exclus du serveur compilé. Le smoke de production reste à exécuter.

CI run 38913055230 / job 117013438546 : PostgreSQL 16 réel démarré, migrations fraîches et réapplication/status/drift passés. Tests natifs : 32 passés, 3 échoués ; suite migrations verte. Aucune PR L2 ouverte, smoke non exécuté après l'échec.

Constats : A017 confirmé P1 (deux recettes différentes partagent un ingrédient nouveau : une reçoit 409 à cause d'un P2002 Ingredient) ; A026 P1 (contrat API interdit TOP_UP pour les garnitures, contrainte SQL correspondante absente) ; fixture de rollback organisation invalide (tag de 41 caractères pour une limite de 40), à corriger sans réduire les assertions.

Revue préventive du correctif : reprendre au maximum deux fois la transaction entière après P2002 portant sur Ingredient, pour repartir d'un état PostgreSQL utilisable et réévaluer les ABV contre le catalogue persisté ; ne jamais tenter une lecture dans la transaction déjà avortée. Une collision Cocktail garde 409, les autres erreurs sont propagées. Ajouter tests de reprise/limite et ABV concurrents. Ajouter une nouvelle migration CHECK additive, transactionnelle, avec refus explicite des garnitures historiques TOP_UP, sans suppression/réécriture de données ; tester refus, conservation des lignes, correction contrôlée et relecture de la contrainte sur la DB jetable. Ne pas modifier les migrations déjà partagées. Revue complète de toute la branche à reprendre après correction avant PR.

## L2 — Checkpoint natif vert et navigateur publié

Correctif bae6a3cb6622db221ca1e13bbc7dcc981ba2675f relu après les P1 : nouvelle transaction et maps par tentative, P2002 Ingredient uniquement, trois tentatives maximum puis 503 ; collision Cocktail toujours 409 ; ABV des deux recettes concurrencées conservés. Migration additive sans réparation implicite, refus/rollback/retry prouvés. Run 38914620367 entièrement vert : 126 unitaires, 10 garde-fous, 36 tests natifs et smoke dist/main.js, quatre migrations, réapplication/statut/drift.

Bloc navigateur 688aeacbdbc0de57183408f24d0f9431eb3ce31b : revue préventive déjà définie dans le plan L2. Paquet distinct privé et verrouillé, garde avant serveurs, base indépendante, Chromium ordinateur/mobile, aucune interception HTTP, zéro retry, assertions données et UI, serveur existant non réutilisé. Image PostgreSQL épinglée sur le digest réellement exécuté ; actions à SHA, permissions contents:read et checkout sans identifiants persistés. Rapport/traces synthétiques conservés sept jours. Local npm ci, typage, audit zéro, quatre tests détectés ; blobs distants vérifiés. Run 38916754084 en cours ; Review Gate final de la branche entière et PR attendent son résultat. La compatibilité avec les autres navigateurs et l’accessibilité exhaustive ne sont pas prétendues couvertes.


## L2 — Régression navigateur et revue préventive du correctif UI

Run 38916754084 : les quatre essais ont échoué pour deux causes précises. Le dossier nouvellement créé est bien sélectionné dans le signal mais pas dans le DOM ; affecter la valeur du select avant insertion des options explique le décalage. L'expiration fonctionne avec retour /login?returnUrl=%2Fcocktails ; l'attente sans query string était incorrecte.

Revue préventive : lier selected à chaque option et à Sans dossier, conserver l'événement natif et le modèle existant ; aucune nouvelle dépendance ni règle métier. Conserver les assertions du parcours réel et vérifier le returnUrl exact. Avant correctif, deux assertions DOM sur les tests existants ont réellement échoué (3 autres tests ciblés verts). Après correctif : 17 fichiers/109 tests frontend, lint/build et typage E2E verts. Commit 634dc3d96776a0e4e08881033c6d515b8e49d91e publié et quatre blobs distants vérifiés. Run 38917424000 en cours ; PostgreSQL déjà vert. La revue entière contre main et l'ouverture de PR restent conditionnées au résultat navigateur.
