# Tests d'intégration PostgreSQL, HTTP et navigateur

B4b adapte les transports aux cookies réels et conserve les assertions métier des dossiers/recettes. web-sessions.e2e-spec.ts ajoute les refus CSRF/origine/contexte sans écriture ni prolongation, rotation, logout/rejeu, échéances et rollback de Session. Le scénario navigateur d'expiration appelle seulement le CLI test/expire-browser-session.ts, protégé par requireTestDatabase ; aucune route de fixture n'est compilée dans l'API. Les résultats présents dans les sections L2/L3 ci-dessous sont historiques ; lire le handoff pour le code courant.

Le workflow `Integration` démarre un PostgreSQL 16 jetable, sans volume persistant,
sur chaque PR/main et sur les branches de travail L2 et dossiers. Il conserve les workflows
Backend Quality, Frontend Quality et l'audit des dépendances de leurs branches
respectives. Aucun déploiement n'est déclenché.

## Sécurité des fixtures

Avant toute préparation ou connexion, les tests exigent `NODE_ENV=test`,
`BARBOOK_INTEGRATION_TESTS=1`, un nom `POSTGRES_DB` commençant par
`barbook_test_`, un hôte `127.0.0.1`/`localhost`, des identifiants explicites et
un port valide. Le nom doit désigner une base entièrement jetable. Le script
de préparation refuse les configurations non conformes avant d'appeler Prisma.
Ne pas utiliser la base de développement habituelle, une sauvegarde personnelle
ou une instance de production pour ces fixtures.

Aucun `migrate reset`, `db push` ou seed de démonstration n'est utilisé. Les
tests injectent des données synthétiques uniques et des triggers de panne
temporaires, supprimés dans `finally`. Les essais d'upgrade créent et suppriment
uniquement leurs propres schémas nommés aléatoirement dans cette base de test.
Le service CI est détruit à la fin du job. Les migrations versionnées existantes
ne sont pas modifiées.

## Exécution

Après création explicite de cette base jetable et définition des variables de
connexion et d'authentification synthétiques, depuis `backend` :

```sh
npm ci
npm run verify
npm run test:integration:safety
npm run test:integration:prepare
npm run test:e2e
```

`test:integration:safety` vérifie le refus des configurations dangereuses sans
utiliser PostgreSQL. `test:integration:prepare` applique les migrations,
répète deploy pour vérifier l'idempotence, vérifie leur statut et échoue si
Prisma détecte un écart au schéma attendu. `test:e2e` doit réellement se connecter
à PostgreSQL ; il ne saute aucun test lorsque la base manque.

## Parcours navigateur

Le job distinct `Browser Integration` utilise sa propre base jetable, le serveur
API compilé et Angular. Le paquet privé `e2e` contient quatre essais Chromium :
deux scénarios sur ordinateur et sur une fenêtre mobile tactile de 390 × 844.
Ils vérifient l'inscription, la saisie clavier, la création d'une recette avec
conversion CL/ML, l'échappement du nom, le classement dossier/tag, les filtres,
le rechargement, la reconnexion et le rejet réel d'une session PostgreSQL expirée. Les réponses
HTTP et les données persistées sont contrôlées sans interception ni mock.

Après préparation d'une autre base jetable et des mêmes variables de sécurité :

```sh
npm ci --prefix backend
npm ci --prefix frontend
npm ci --prefix e2e
npm run build --prefix backend
npm run test:integration:prepare --prefix backend
cd e2e
npm run typecheck
npm run audit:security
npx playwright install --with-deps chromium
npm test
```

Playwright refuse de réutiliser un serveur déjà présent sur les ports 3000/4200.
Le garde de configuration est exécuté avant tout lancement. Les données sont
synthétiques ; aucun secret JWT n'est utilisé. La CI
conserve le rapport et, en cas d'échec, traces, vidéos et captures pendant sept
jours. Ces sorties sont ignorées par Git. Aucun retry ne masque un échec.

Ces quatre essais couvrent des parcours représentatifs existants ; ils ne
prouvent pas une accessibilité exhaustive, ni une compatibilité Safari/iOS,
Firefox ou appareil physique. Le scénario mobile utilise Chromium émulé.

Lors de L2, le premier passage navigateur a révélé un décalage du select de dossier : sa
valeur était affectée avant l'insertion des options Angular et restait vide,
alors que l'état du composant contenait le bon identifiant. La sélection est
désormais portée par chaque option, y compris « Sans dossier ». Deux assertions
DOM ont reproduit l'échec au chargement et après création avant correction.
Dans L3, ces sélections sont devenues des cases multiples ; les tests DOM vérifient
les choix cochés au chargement et après création, puis les conflits/rechargements.
Le scénario d'expiration vérifie également le `returnUrl` prévu par le guard.

Avec `--trace-deprecation`, les tests natifs montrent un avertissement de
requêtes concurrentes sur un client pg : la pile passe par `PgTransaction`
dans `@prisma/adapter-pg` et l'interpréteur Prisma. Les tests passent sous pg 8 ;
aucun avertissement n'est filtré. Requalifier cette chaîne avant une montée vers
pg 9, sans conclure à une corruption à partir de cette seule dépréciation.

## Couverture et limites

- Migrations fraîches, historique Prisma, upgrade de données historiques et
  rollback transactionnel du DDL en présence d'une référence inter-workspace.
- Auth réelle (Argon2/session PostgreSQL), validation et préfixe `/api` partagés avec le serveur,
  champs clients interdits, accès anonymes/forgés/expirés, isolation des ressources.
- Persistance complète, précision Decimal, ABV inconnu avec TOP_UP,
  classement/déclassement et filtres croisés, unicité et écritures concurrentes.
- Erreurs de base injectées pour vérifier l'atomicité de l'inscription, de la
  création des recettes et du remplacement des associations.
- CHECK et FK composites exercés directement par SQL, unicités et cascades,
  suppression de références restreinte selon le modèle actuel.

Le socle L0–L2 est intégré et qualifié ensemble. La branche dossiers conserve
les trois commits originaux et ajoute sa qualification multi-dossiers : contrats,
versions/courses, FK hostiles, ajouts/retraits/CRUD, lot de 100/retry/cinq pages et
rollback multiple. Le code b0bb757 y passe 61 natifs et quatre Chromium complets ;
main reste au socle tant que la PR L3 n’est pas mergée.

Le bootstrap HTTP est centralisé dans `src/configure-application.ts`. La
compilation Nest se limite aux sources `src/`, pour produire `dist/main.js`,
conforme à `start:prod`, et ne pas embarquer les scripts Prisma/fixtures dans
le serveur compilé. Le workflow démarre ce point d'entrée et vérifie `/api`.

Une exécution réussie sur la base jetable ne valide ni l'état d'une base réelle,
ni une migration/destruction de production, ni la stratégie de déploiement.
Les résultats effectivement observés restent dans le handoff canonique.

## Contrainte de garniture ajoutée dans L2

La première exécution native a confirmé que PostgreSQL acceptait une garniture
TOP_UP, alors que l'API la refuse déjà. La migration additive
`20261016141503_garnish_unit_integrity` ajoute le CHECK correspondant. Elle ne
supprime ni ne réécrit de ligne. Sa prévalidation interrompt transactionnellement
la migration si une garniture historique TOP_UP existe ; sa réconciliation doit
alors être décidée sur les données concernées avant une nouvelle tentative.

Le test d'upgrade exerce réellement le refus sur données historiques invalides,
leur conservation, une correction de fixture et la tentative suivante. La
migration ne sera appliquée ici que sur des bases CI jetables. Toute base de
propriétaire/VPS reste à inventorier séparément avant application autorisée.

La migration dossiers EXPAND de septembre reste inchangée. Les deux ordres
d’upgrade SQL (main avec cette contrainte puis EXPAND, ou EXPAND puis cette
contrainte) sont qualifiés en CI L3 ; ne pas renommer/réécrire l’ancienne
migration pour modifier artificiellement son ordre.


## Qualification combinée des corrections de création

Après intégration des branches L1, la suite HTTP crée réellement New avec
mainAlcoholName:null, relit new-cocktail, vérifie le nom et l'absence d'alcool,
puis vérifie que New Cocktail conserve le conflit canonique 409 sans doublon.
Le parcours navigateur crée aussi New après reconnexion sur les deux formats,
avec les dépendances corrigées. Il réutilise son compte synthétique pour ne pas
contourner ou dépasser le quota d'inscription ; aucun contrôle n'est relâché.


## L3 : transition et versions d'organisation

La migration additive `20261019073922_folder_organization_versions` complète l'EXPAND partagé.
Elle prend des verrous de table pendant sa prévalidation/backfill pour que les
écritures concurrentes ne changent pas ce snapshot. Elle insère les liens legacy
manquants, puis initialise des compteurs entiers non négatifs sur Cocktail et
Folder. Aucun lien existant n'est supprimé ni champ retiré.

Un lien obsolète ou un ensemble multiple déjà présent et incohérent avec
folderId provoque un refus transactionnel. Ne pas contourner ce refus ou choisir
silencieusement l'une des représentations sur une base réelle. L'inventaire,
la réconciliation de données et la récupération éventuelle des métadonnées
Prisma après échec exigent leur procédure et leur autorisation propres.

Les tests utilisent des schémas jetables : deux ordres EXPAND/contrainte
garniture, lien manquant, refus d'un lien obsolète ou multiple, conservation des
données, absence de colonne partielle, décision corrective de fixture explicite
et retry. Ils attaquent également les FK CocktailFolder, l'unicité/cascade et
les CHECK des versions. La qualification native de ce nouveau bloc doit être
lue dans le handoff ; une compilation locale ne vaut pas exécution PostgreSQL.

Avant une bascule réelle vers des écritures multiples, arrêter tous les anciens
écrivains incompatibles ; la compatibilité du nouveau serveur avec un ancien
payload ne rend pas un ancien binaire compatible. Aucun déploiement, quiescement
ou CONTRACT n'est effectué par ces tests.


## Qualification L3 courante

Le parcours principal, toujours sur desktop/mobile, crée un dossier à catalogue vide
par clavier avant une recette, classe dans deux dossiers, provoque un vrai 409,
filtre chaque dossier et se reconnecte. Douze fixtures API supplémentaires du même
compte permettent deux vraies pages de sélection ; ajout/retrait/réajout/rename
et suppression confirmée gardent recettes/tags/autres liens. Le rejet d'un dossier
absent et d'une session PostgreSQL expirée est vérifié. Quatre inscriptions au total, limite de 5 intacte.

Les trois thèmes utilisent les contrôles réels. Des captures de succès sont
conservées 7 jours ; animations finies désactivées pour ces seules captures,
afin d’inspecter les couleurs stabilisées. Les résultats et inspections réellement
faits sont dans le [checkpoint L3](../project/checkpoint-l3.md), les 61 natifs
comprennent aussi le lot maximal de 100 et cinq pages complètes sans doublon.
