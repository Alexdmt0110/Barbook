# Authentification Barbook

## Architecture

L'authentification Barbook couvre actuellement le flux complet :

```text
Angular
↓
NestJS
↓
Prisma
↓
PostgreSQL
```

Le frontend gère l'état de session et la navigation.

Le backend reste responsable de l'authentification réelle et de toutes les futures autorisations métier.

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

L'utilisateur est immédiatement authentifié après la création du compte.

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

## Session Angular

Le frontend conserve temporairement l'access token dans :

```text
sessionStorage
```

Clé utilisée :

```text
barbook.accessToken
```

Aucun mot de passe ni hash de mot de passe n'est stocké côté frontend.

La présence d'un token ne suffit pas à restaurer automatiquement l'identité utilisateur.

Lorsqu'une route protégée est demandée après un rechargement de l'application :

```text
token présent
↓
GET /api/auth/me
↓
JWT validé côté backend
↓
currentUser restauré
```

Si le token est invalide ou expiré :

```text
/auth/me → 401
↓
session Angular supprimée
↓
token supprimé du sessionStorage
↓
redirection vers /login
```

## Interceptor HTTP

`authInterceptor` ajoute automatiquement :

```http
Authorization: Bearer <access-token>
```

aux requêtes internes dont l'URL commence par :

```text
/api/
```

Il ne transmet pas automatiquement le token aux URLs externes.

## Guard Angular

Les routes privées utilisent :

```text
authGuard
```

Si aucune session n'est disponible, l'utilisateur est redirigé vers :

```text
/login?returnUrl=<url-initiale>
```

Après une connexion réussie, l'application retourne vers la route initialement demandée si celle-ci est une URL interne valide.

## Déconnexion

La déconnexion :

```text
supprime currentUser
supprime l'access token en mémoire
supprime barbook.accessToken du sessionStorage
redirige vers /login
```

Il n'existe pas encore de session serveur ou de refresh token à révoquer.

## Proxy de développement

Le frontend appelle toujours l'API avec des URLs relatives :

```text
/api/...
```

En développement, Angular utilise :

```text
frontend/proxy.conf.json
```

pour transférer les appels vers :

```text
http://localhost:3000
```

En production, Nginx devra assurer le même rôle pour :

```text
https://barbook.melioria.fr/api
```

Cela évite de coder l'URL du backend directement dans Angular.

## Validation des requêtes

NestJS utilise un `ValidationPipe` global avec :

```text
whitelist = true
forbidNonWhitelisted = true
transform = true
```

Angular effectue également une validation ergonomique des formulaires avant envoi.

La validation frontend améliore l'expérience utilisateur mais ne remplace jamais la validation backend.

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

Depuis la racine :

```powershell
npm --prefix backend run verify
npm --prefix backend run verify:db
```

## Vérifications frontend

Depuis `frontend` :

```powershell
npm run verify
```

vérifie actuellement :

```text
production build
unit tests
```

Depuis la racine :

```powershell
npm --prefix frontend run verify
```

## Tests automatisés

Le backend couvre notamment :

```text
Argon2id
register
login
création PERSONAL + OWNER
JWT Guard
utilisateur courant
```

Le frontend couvre notamment :

```text
AuthService
persistance de session
restauration du token
logout
authInterceptor
authGuard
```

## Sécurité avant production publique

Les sujets suivants doivent être traités ou explicitement réévalués :

```text
refresh tokens
stockage sécurisé long terme des sessions
rate limiting sur register/login
vérification email
mot de passe oublié
révocation de sessions
protection XSS
Content-Security-Policy
HTTPS production
CORS production
configuration Nginx
```

Le stockage actuel dans `sessionStorage` est un compromis V1 et ne doit pas être considéré comme la stratégie finale.
