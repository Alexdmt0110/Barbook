# Backend Barbook

## Stack

Le backend utilise :

- NestJS ;
- PostgreSQL ;
- Prisma ORM.

## Modèle de propriété

Toutes les données métier appartiennent à un `Workspace`.

Un utilisateur possède automatiquement un workspace personnel privé.

Il peut également rejoindre des workspaces partagés.

```text
User
│
├── Workspace PERSONAL
│
└── WorkspaceMember
      └── Workspace SHARED
```

Les cocktails, ingrédients, tags et dossiers sont rattachés au workspace.

## Prisma

Le schéma se trouve dans :

```text
backend/prisma/schema.prisma
```

La configuration Prisma se trouve dans :

```text
backend/prisma.config.ts
```

Le client généré se trouve localement dans :

```text
backend/src/generated/prisma/
```

Ce dossier est généré automatiquement et ne doit jamais être versionné.

## Variables de connexion

Prisma utilise les variables définies dans le fichier `.env` racine :

- `POSTGRES_USER` ;
- `POSTGRES_PASSWORD` ;
- `POSTGRES_DB` ;
- `DATABASE_HOST` ;
- `DATABASE_PORT`.

Le mot de passe n'est jamais stocké dans Git.

## Catalogue d'ingrédients

Les ingrédients sont normalisés au niveau du workspace.

Une recette référence un `Ingredient` canonique et peut ajouter une `specification` lorsqu'elle demande une marque, un style ou une caractéristique particulière.

Exemple :

```text
Ingredient : Gin
Specification : Hendrick's
```

Un catalogue structuré de produits ou de bouteilles pourra être introduit ultérieurement avec la gestion de stock.

## Quantités

Les liquides sont persistés en millilitres.

Les centilitres et millilitres pourront tous deux être acceptés lors de la saisie, puis convertis vers l'unité canonique.

## Workflow de migration

Depuis `backend` :

```powershell
npx prisma format
npx prisma validate
npx prisma migrate dev --name nom-migration --create-only
```

La migration SQL générée doit être inspectée avant son application.

Une fois validée :

```powershell
npx prisma migrate dev
npx prisma generate
npx prisma migrate status
```

Les migrations présentes dans :

```text
backend/prisma/migrations/
```

sont versionnées dans Git.

## Politique de modification

Une migration déjà partagée ou appliquée sur un environnement distant ne doit pas être modifiée rétroactivement.

Toute évolution du modèle doit produire une nouvelle migration.

## État actuel

La persistance est initialisée, mais aucun service NestJS n'utilise encore Prisma au runtime.

Le `PrismaService` sera introduit lorsqu'un premier cas d'usage backend nécessitera réellement l'accès aux données.
