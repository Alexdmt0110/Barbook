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
- `POSTGRES_DB` : nom de la base.

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

## Frontend

```powershell
cd frontend
npm start
```

## Backend

```powershell
cd backend
npm run start:dev
```

## Vérifications

Frontend :

```powershell
npm run build
npm test -- --watch=false
```

Backend :

```powershell
npm run lint
npm run build
npm test
```

## Infrastructure distante

Aucun déploiement VPS n'est nécessaire pour la fondation locale actuelle.
