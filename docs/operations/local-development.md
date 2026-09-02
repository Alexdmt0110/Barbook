# Développement local

## Prérequis

- Node.js
- npm
- Docker Desktop
- Git

## Structure

Barbook est composé de :

- `frontend/` : application Angular ;
- `backend/` : API NestJS ;
- PostgreSQL : base de données locale exécutée avec Docker Compose.

## Variables d'environnement

Le fichier `.env.example` documente les variables nécessaires.

Le développeur doit créer son fichier local :

```powershell
Copy-Item .env.example .env
```

Le fichier `.env` ne doit jamais être versionné.

Variables actuelles :

- `POSTGRES_BIND_ADDRESS` : adresse locale d'exposition de PostgreSQL ;
- `POSTGRES_PORT` : port PostgreSQL ;
- `POSTGRES_USER` : utilisateur PostgreSQL ;
- `POSTGRES_PASSWORD` : mot de passe PostgreSQL local ;
- `POSTGRES_DB` : nom de la base ;
- `DATABASE_HOST` : hôte PostgreSQL utilisé par le backend ;
- `DATABASE_PORT` : port PostgreSQL utilisé par le backend ;
- `PORT` : port HTTP de l'API ;
- `FRONTEND_ORIGIN` : origine autorisée par CORS ;
- variables d'authentification documentées dans `.env.example`.

## PostgreSQL

Démarrer la base :

```powershell
docker compose up -d
```

Vérifier son état :

```powershell
docker compose ps
```

Arrêter les conteneurs :

```powershell
docker compose down
```

Supprimer également les données locales :

```powershell
docker compose down -v
```

Attention : la suppression du volume détruit la base PostgreSQL locale.

## Réseau

PostgreSQL est exposé uniquement sur :

```text
127.0.0.1:5432
```

Il n'est donc pas accessible depuis le réseau local.

## Migrations Prisma

Après récupération du projet et lorsque la base locale est disponible :

```powershell
npm --prefix backend exec prisma migrate status
```

Les migrations versionnées constituent la référence du schéma de base de données.

Une modification du schéma Prisma doit être accompagnée d'une migration adaptée.

## Seed de développement

Le seed permet d'ajouter les cocktails de démonstration et leur catalogue d'ingrédients au Barbook personnel d'un utilisateur existant.

Depuis la racine du dépôt :

```powershell
npm --prefix backend run db:seed -- --email utilisateur@example.com
```

L'utilisateur doit déjà exister et posséder son workspace personnel.

Le seed :

- est interdit lorsque `NODE_ENV=production` ;
- peut être relancé ;
- met à jour les cocktails de démonstration ;
- utilise les slugs canoniques de l'application ;
- réconcilie uniquement certains anciens slugs historiques connus.

Le seed ne doit jamais être utilisé comme mécanisme de migration de données de production.

## Frontend

Depuis la racine :

```powershell
npm --prefix frontend start
```

Ou depuis le dossier :

```powershell
cd frontend
npm start
```

## Backend

Depuis la racine :

```powershell
npm --prefix backend run start:dev
```

Ou depuis le dossier :

```powershell
cd backend
npm run start:dev
```

## Vérifications frontend

Depuis la racine :

```powershell
npm --prefix frontend run verify
```

Cette commande doit notamment vérifier :

- le lint ;
- le build ;
- les tests.

## Vérifications backend

Depuis la racine :

```powershell
npm --prefix backend run verify:db
```

Cette commande doit notamment vérifier :

- la génération Prisma ;
- le lint ;
- le build ;
- les tests ;
- la validité du schéma Prisma ;
- l'état des migrations.

## Workflow Git

Le développement d'une fonctionnalité se fait sur une branche dédiée.

Exemple :

```powershell
git switch -c feature/nom-feature
git push -u origin feature/nom-feature
```

La branche est publiée dès sa création afin qu'elle soit disponible à distance pendant le développement.

Les commits suivent autant que possible la convention Conventional Commits.

Exemples :

```text
feat(cocktails): add cocktail creation
fix(cocktails): preserve catalog ingredient abv
test(cocktails): cover cocktail creation frontend
docs(cocktails): document cocktail creation
```

## Infrastructure distante

Le développement local ne nécessite pas de déploiement sur le VPS.

Les évolutions de l'infrastructure distante doivent être traitées comme des opérations distinctes et documentées avant leur exécution.
