# Sécurité des dépendances

## Contrôle du 21 octobre 2026 — CI B4b

L'audit de2b7b924 a signalé quatre paquets hauts, runtime zéro : SDK MCP1.31.0 épinglé par Angular CLI21.2.27 et Vite7.3.6 épinglé par Angular build21.2.27. Ce sont des outils de développement, pas des modules du navigateur compilé. Leurs chemins MCP/serveur/éditeur restent néanmoins à corriger ; aucune exception d'audit n'est ajoutée.

Revue préventive : conserver Angular21, ne pas exécuter audit fix --force (qui propose22). Le registre ne propose pas de patch CLI/build21 ultérieur. Override SDK **limité au parent @angular/cli** vers1.32.0 (mineure, Node>=18) et Vite7.3.7 (patch, Node24 compatible), commun aux consommateurs build/Vitest déjà en7.3.6. Aucun ajout de service MCP ni usage métier de ces outils. Les imports réels CLI SDK mcp/server/stdio/types et l'absence de taskStore dans le CLI ont été inspectés ; aucun serveur HTTP MCP n'est démarré par Barbook.

Sources des correctifs : [MCP SDK GHSA-22jm-h49p-29qw](https://github.com/modelcontextprotocol/typescript-sdk/security/advisories/GHSA-22jm-h49p-29qw), [Vite/launch-editor GHSA-698v-4r3x-3vcv](https://github.com/vitejs/launch-editor/security/advisories/GHSA-698v-4r3x-3vcv). Les quatre avis SDK et trois avis Vite signalés par npm sont éliminés par ces versions ; le résultat npm après résolution est vérifié, pas déduit des seules versions.

Après npm ci : audits complet/runtime zéro. Vérifier aussi lint/build/Vitest, le serveur Angular réel en E2E, et le test de compatibilité inclus dans verify : véritable handshake initialize puis tools/list du CLI MCP en lecture seule/local-only sur stdio, sans appeler d'outil ni de service externe. Une simple importation ne prouverait pas que les API d'enregistrement de ses outils fonctionnent avec l'override.

Ces overrides sont temporaires : les retirer quand les versions compatibles de CLI/build emploient nativement les correctifs, après npm ci/audits/verify/compatibilité/E2E verts. Aucun upgrade majeur, changement runtime applicatif, migration ou déploiement. Les résultats L1 ci-dessous restent historiques.

## Contrôle du 16 octobre 2026 — L1

Revue préventive : corriger les chaînes signalées sans changer de version majeure Angular/Nest/Prisma, conserver les contrôles et les overrides Prisma existants, puis vérifier les lockfiles, l'installation reproductible et les chemins affectés. Le passage Jest 29 → 30 est limité aux outils de tests et justifié par la suppression de la chaîne braces non corrigée ; Node 24 et TypeScript 5.9 satisfont ses prérequis. Aucun changement métier, API, schéma ou migration.

Résultat observé après npm ci et vérifications :

| Application | Audit complet initial phase A | Complet après correction | Production après correction |
| --- | --- | --- | --- |
| Backend | 38 paquets signalés (2 critiques, 34 hauts, 2 modérés) | 0 | 0 |
| Frontend | 13 paquets signalés (3 critiques, 8 hauts, 2 modérés) | 0 | 0 |

Ces nombres comptent des paquets signalés, pas des failles indépendantes. Ils sont datés, issus du registre npm et des lockfiles ; ils ne prouvent pas l'absence de faille ni l'état d'une image déployée. Les commandes, compteurs et versions sont dans [le relevé JSON](security-audit-2026-10-16.json).

- Angular framework/compilateur/router : 21.2.25 ; CLI/build : 21.2.27, versions de patch compatibles. Les peers exacts du framework sont alignés.
- Nest platform-express : 11.2.7 ; multer 2.4.0, proxy-addr 2.0.8, fast-uri 3.1.8, handlebars 4.7.10 et autres correctifs transitifs compatibles verrouillés.
- Jest : 30.5.2, @types/jest 30.0.0 et ts-jest 29.4.15 (peer Jest 29/30). Les signatures et assertions des tests existants n'ont pas été amputées pour compiler.
- Prisma/client/adapter-pg restent à 7.10.0 ; les overrides deepmerge-ts/mysql2 restent inchangés.

Exposition analysée : Barbook ne fait pas de SSR, n'a pas d'endpoint upload et configure trust proxy avec un nombre de sauts, alors que certains avis supposent SSR, upload ou un sous-réseau IPv6 mal configuré. Ces préconditions n'ont pas été démontrées dans l'application. Les correctifs disponibles sont néanmoins appliqués ; les dépendances de build/test sont aussi traitées. La future image de production reste à auditer séparément.

### Override NYC / js-yaml

@istanbuljs/load-nyc-config 1.1.0 exige encore js-yaml 3, qui entraîne argparse 1 et sprintf-js sans correctif publié pour GHSA-hp3w-g68c-fv3c. Son unique appel au parseur est load(), conservé en js-yaml 4. Un override **limité à ce parent** impose js-yaml 4.3.2 et retire cette chaîne. Ne pas accepter le downgrade vers un ancien ts-jest suggéré par audit fix --force.

Le script npm run test:dependency-compatibility vérifie réellement le chargement d'une configuration YAML avec héritage, CommonJS et le refus des balises JavaScript. Il est inclus dans npm run verify. npm ls js-yaml sprintf-js --all confirme l'override effectif et l'absence de sprintf-js ; un simple ajout à package.json ne suffisait pas tant que le lockfile conservait le parseur 3.

Retirer cet override lorsque le lecteur NYC utilise nativement js-yaml corrigé sans argparse 1/sprintf-js, puis rejouer le test dédié, la couverture Jest et les deux audits.

### Vérifications et CI

Depuis chaque application : npm ci, npm run verify, npm run audit:security. Backend : 18 suites/124 tests, validation Prisma et test de compatibilité ; frontend : 17 fichiers/109 tests, lint/build. Les régressions de création de la PR distincte #21 ne sont pas dupliquées dans cette branche basée sur main.

La CI Dependency Security exécute les audits complet et production des deux lockfiles ; seuil bloquant moderate, aucune exception ni continue-on-error. Les contrôles Backend Quality et Frontend Quality existants sont conservés. Les checks supplémentaires devront être ajoutés aux règles de protection de main après validation du propriétaire ; cette branche ne modifie aucune protection ni autorisation de merge.

Sources : [Jest 30](https://jestjs.io/docs/upgrading-to-jest30), [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), [proxy-addr](https://github.com/advisories/GHSA-jqcg-44mw-7w3h), [sprintf-js](https://github.com/advisories/GHSA-hp3w-g68c-fv3c), code publié de @istanbuljs/load-nyc-config 1.1.0 et peerDependencies de ts-jest 29.4.15.

Les sections suivantes conservent l'historique des choix antérieurs. Les commandes seed/migrate qui y sont citées ne sont pas annoncées comme exécutées dans ce bloc L1.

## Objectif

Ce document décrit les décisions de sécurité liées aux dépendances de Barbook qui ne sont pas évidentes à la seule lecture des fichiers `package.json` et `package-lock.json`.

Les overrides documentés ici sont des contournements temporaires de dépendances transitives vulnérables. Ils doivent être supprimés dès que les versions upstream utilisées par Barbook n'en ont plus besoin.

## Politique générale

Les dépendances doivent être corrigées avec la modification compatible la plus petite possible.

Il ne faut pas utiliser aveuglément :

```powershell
npm audit fix --force
```

Cette commande peut introduire des changements majeurs ou des downgrades incompatibles uniquement pour satisfaire l'audit npm.

Pour chaque advisory :

1. identifier la dépendance responsable ;
2. déterminer si elle est directe ou transitive ;
3. vérifier si elle est présente dans l'installation de production ;
4. privilégier une mise à jour compatible ;
5. utiliser un override uniquement lorsque le correctif upstream n'est pas encore disponible dans la chaîne dépendante ;
6. tester explicitement les chemins concernés par l'override ;
7. documenter la condition de suppression de l'override.

## Suppression de SWC

Les dépendances suivantes ont été supprimées du backend :

```text
@swc/cli
@swc/core
```

Le backend Barbook utilise le compilateur standard de NestJS et aucune configuration du projet n'active SWC.

Leur présence ajoutait donc une chaîne de dépendances inutilisée et exposait notamment des advisories transitifs liés à `file-type`.

La suppression de SWC a également réduit significativement la taille de l'arbre de dépendances de développement.

## Mise à jour de qs

La dépendance transitive `qs` a été mise à jour vers une version corrigée :

```text
qs 6.16.0
```

Aucune dépendance directe vers `qs` n'a été ajoutée au projet.

## Overrides Prisma

Le backend utilise Prisma ORM 7 avec PostgreSQL.

Les packages Prisma applicatifs doivent rester alignés sur la même version mineure :

```text
prisma
@prisma/client
@prisma/adapter-pg
```

### deepmerge-ts

`@prisma/config` dépend d'une version de `deepmerge-ts` affectée par l'advisory :

```text
GHSA-ggr8-5vv4-36mx
```

Les versions de `deepmerge-ts` antérieures à `8.0.0` peuvent provoquer un épuisement de pile lors de la fusion de graphes d'objets récursifs.

Le correctif n'existe que dans la version majeure 8 de `deepmerge-ts`.

Barbook applique donc temporairement :

```json
{
  "overrides": {
    "@prisma/config": {
      "deepmerge-ts": "8.0.1"
    }
  }
}
```

Ce changement traverse une frontière de version majeure et doit donc rester explicitement surveillé.

Dans le contexte Prisma concerné, `deepmerge-ts` est utilisé par le chargement de la configuration Prisma. Le projet Barbook utilise une configuration simple construite à partir des variables d'environnement de connexion PostgreSQL.

L'override a été validé avec :

```powershell
npx prisma generate
npx prisma validate
npx prisma migrate status
npm run verify
npm run db:seed -- --email <email-utilisateur-local>
```

Il a également été vérifié dans une installation npm simulant les dépendances de production.

### mysql2

Le CLI Prisma installe également `mysql2`, même si Barbook utilise PostgreSQL avec :

```text
@prisma/adapter-pg
pg
```

La version transitive initialement installée était affectée par des advisories de sécurité liés notamment à l'authentification MySQL et à la décompression du protocole compressé.

Barbook n'utilise pas MySQL au runtime, mais la dépendance reste présente dans l'arbre npm installé.

Barbook applique donc temporairement :

```json
{
  "overrides": {
    "prisma": {
      "mysql2": "3.24.3"
    }
  }
}
```

L'override reste dans la même version majeure de `mysql2`.

## Installation de production

Un test avec :

```powershell
npm ci --omit=dev --ignore-scripts
```

a montré que npm conserve actuellement le CLI `prisma` dans l'arbre installé à cause de sa relation avec `@prisma/client`.

Il ne faut donc pas supposer que les dépendances internes du CLI sont absentes d'une installation de production uniquement parce que `prisma` est déclaré dans `devDependencies`.

La future image de production devra vérifier explicitement son arbre de dépendances et son contenu final.

## Vérifications obligatoires après une mise à jour Prisma

Lors de toute mise à jour de Prisma, vérifier d'abord si les overrides sont encore nécessaires.

Depuis `backend` :

```powershell
npm install
npm ls prisma @prisma/client @prisma/adapter-pg @prisma/config deepmerge-ts mysql2
npm audit
npm run verify
npx prisma migrate status
```

Pour vérifier également l'installation de production :

```powershell
$prodCheck = Join-Path $env:TEMP "barbook-backend-prod-check"

Remove-Item -Recurse -Force $prodCheck -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $prodCheck | Out-Null

Copy-Item package.json -Destination $prodCheck
Copy-Item package-lock.json -Destination $prodCheck

npm ci --omit=dev --ignore-scripts --prefix $prodCheck
npm audit --omit=dev --prefix $prodCheck
npm ls --omit=dev --prefix $prodCheck prisma @prisma/config deepmerge-ts mysql2

Remove-Item -Recurse -Force $prodCheck
```

## Conditions de suppression des overrides

### deepmerge-ts

Supprimer l'override lorsque la version de `@prisma/config` utilisée par Barbook dépend nativement d'une version corrigée de `deepmerge-ts`.

Après suppression :

```powershell
npm install
npm audit
npm run verify
npx prisma migrate status
```

Le résultat doit rester vert sans l'override.

### mysql2

Supprimer l'override lorsque la version du CLI Prisma utilisée par Barbook dépend nativement d'une version corrigée de `mysql2`, ou lorsque cette dépendance n'est plus présente dans l'arbre installé.

Après suppression, refaire également le test d'installation de production.

## Dette de maintenance connue

Certaines dépendances de développement peuvent encore produire des warnings de dépréciation lors de `npm ci`.

Un warning de dépréciation n'est pas assimilé automatiquement à une vulnérabilité de sécurité.

Ces warnings doivent néanmoins être réévalués lors des mises à jour de la toolchain, sans introduire de migration majeure non liée uniquement pour supprimer du bruit de console.
