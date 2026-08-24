# Authentification Barbook

## Endpoints

L'API expose actuellement :

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

`register` et `login` sont publics.

`me` nécessite un access token JWT valide.

## Inscription

Le payload attendu est :

```json
{
  "email": "user@example.com",
  "password": "une phrase de passe suffisamment longue",
  "displayName": "Alex"
}
```

L'adresse email est normalisée en supprimant les espaces extérieurs et en la convertissant en minuscules.

Le mot de passe n'est jamais modifié automatiquement.

Une inscription valide crée dans une même transaction :

```text
User
Workspace PERSONAL
WorkspaceMember OWNER
```

## Connexion

Le payload attendu est :

```json
{
  "email": "user@example.com",
  "password": "une phrase de passe suffisamment longue"
}
```

En cas d'échec, l'API ne distingue pas publiquement une adresse inconnue d'un mauvais mot de passe.

## Réponse d'authentification

Une inscription ou une connexion réussie retourne :

```json
{
  "user": {
    "id": "...",
    "email": "user@example.com",
    "displayName": "Alex"
  },
  "accessToken": "..."
}
```

`passwordHash` n'est jamais exposé.

## JWT

Le payload métier contient uniquement :

```text
sub = user.id
```

Les access tokens expirent après 15 minutes.

Leur configuration impose :

```text
algorithm = HS256
issuer    = barbook-api
audience  = barbook-web
```

Le secret JWT provient de :

```text
JWT_SECRET
```

Il doit comporter au moins 32 caractères et ne doit jamais être versionné.

## Route utilisateur courant

Une requête vers :

```text
GET /api/auth/me
```

doit contenir :

```http
Authorization: Bearer <access-token>
```

La route vérifie le JWT puis recherche l'utilisateur correspondant en base.

Un token appartenant à un utilisateur supprimé est refusé.

## Validation des requêtes

NestJS utilise un `ValidationPipe` global avec :

```text
whitelist = true
forbidNonWhitelisted = true
transform = true
```

Les propriétés inconnues sont donc rejetées.

## Vérifications backend

Depuis `backend` :

```powershell
npm run verify
```

vérifie :

```text
lint
build
tests
Prisma schema
```

La commande :

```powershell
npm run verify:db
```

ajoute également la vérification de l'état des migrations PostgreSQL.

Depuis la racine du dépôt, les mêmes vérifications peuvent être lancées avec :

```powershell
npm --prefix backend run verify
npm --prefix backend run verify:db
```

## Sécurité avant production

Avant une exposition publique, les sujets suivants devront être traités ou explicitement réévalués :

```text
refresh tokens
stockage frontend des tokens
rate limiting sur register/login
vérification email
mot de passe oublié
révocation de sessions
HTTPS production
politique CORS production
```
