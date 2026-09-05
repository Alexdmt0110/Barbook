# Sécurité des dépendances

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
