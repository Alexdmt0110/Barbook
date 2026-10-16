# Tests d'intégration PostgreSQL, HTTP et navigateur

Le workflow `Integration` démarre un PostgreSQL 16 jetable, sans volume persistant,
sur chaque PR/main et sur la branche de travail L2. Il conserve les workflows
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
le rechargement, la reconnexion et le rejet réel d'un JWT expiré. Les réponses
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
synthétiques et le secret JWT doit être propre à cette base de test. La CI
conserve le rapport et, en cas d'échec, traces, vidéos et captures pendant sept
jours. Ces sorties sont ignorées par Git. Aucun retry ne masque un échec.

Ces quatre essais couvrent des parcours représentatifs existants ; ils ne
prouvent pas une accessibilité exhaustive, ni une compatibilité Safari/iOS,
Firefox ou appareil physique. Le scénario mobile utilise Chromium émulé.

Le premier passage navigateur a révélé un décalage du select de dossier : sa
valeur était affectée avant l'insertion des options Angular et restait vide,
alors que l'état du composant contenait le bon identifiant. La sélection est
désormais portée par chaque option, y compris « Sans dossier ». Deux assertions
DOM ont reproduit l'échec au chargement et après création avant correction.
Le scénario d'expiration vérifie également le `returnUrl` prévu par le guard.

Avec `--trace-deprecation`, les tests natifs montrent un avertissement de
requêtes concurrentes sur un client pg : la pile passe par `PgTransaction`
dans `@prisma/adapter-pg` et l'interpréteur Prisma. Les tests passent sous pg 8 ;
aucun avertissement n'est filtré. Requalifier cette chaîne avant une montée vers
pg 9, sans conclure à une corruption à partir de cette seule dépréciation.

## Couverture et limites

- Migrations fraîches, historique Prisma, upgrade de données historiques et
  rollback transactionnel du DDL en présence d'une référence inter-workspace.
- Auth réelle (Argon2/JWT), validation et préfixe `/api` partagés avec le serveur,
  champs clients interdits, accès anonymes/forgés/expirés, isolation des ressources.
- Persistance complète, précision Decimal, ABV inconnu avec TOP_UP,
  classement/déclassement et filtres croisés, unicité et écritures concurrentes.
- Erreurs de base injectées pour vérifier l'atomicité de l'inscription, de la
  création des recettes et du remplacement des associations.
- CHECK et FK composites exercés directement par SQL, unicités et cascades,
  suppression de références restreinte selon le modèle actuel.

Ces tests portent sur le modèle actuel de main (un dossier facultatif). La
migration EXPAND et les trois commits de la branche dossiers restent préservés
pour L3. Leurs nouvelles associations devront recevoir leurs propres tests au
moment de la reprise autorisée. Les PR L1 sont indépendantes : les contrôles
combinés seront rejoués après les merges approuvés.

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

La migration dossiers EXPAND de septembre reste inchangée sur sa branche. Lors
de L3, qualifier les deux ordres d'upgrade (main avec cette contrainte puis
EXPAND, ou branche dossiers puis cette contrainte) ; ne pas renommer ou réécrire
l'ancienne migration pour modifier artificiellement son ordre.
