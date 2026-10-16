# Tests d'intégration PostgreSQL et HTTP

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
