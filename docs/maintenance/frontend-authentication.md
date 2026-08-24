# Authentification frontend

## Responsabilités

Le frontend Angular gère :

```text
formulaires login/register
état utilisateur courant
stockage temporaire de l'access token
ajout du token aux appels API
restauration de session
protection des routes
déconnexion
```

Il ne décide jamais si un utilisateur est réellement autorisé à accéder à une ressource métier.

Cette responsabilité appartient au backend.

## Structure

```text
src/app/
├── core/
│   └── auth/
│       ├── auth.models.ts
│       ├── auth.service.ts
│       ├── auth.interceptor.ts
│       ├── auth.guard.ts
│       └── *.spec.ts
│
└── features/
    └── auth/
        ├── login/
        ├── register/
        └── auth-page.css
```

## AuthService

`AuthService` constitue la source centrale de l'état d'authentification.

Il expose notamment :

```text
currentUser
isAuthenticated
login()
register()
loadCurrentUser()
logout()
getAccessToken()
hasStoredAccessToken()
```

L'état utilisateur utilise les signals Angular.

## Stockage

Clé utilisée :

```text
barbook.accessToken
```

Support :

```text
sessionStorage
```

Le token disparaît à la fermeture de la session navigateur.

Cette solution reste vulnérable à une éventuelle exécution JavaScript malveillante dans la page et devra être réévaluée avant exposition publique.

## Rechargement de page

Après un rafraîchissement :

```text
AuthService recréé
↓
token récupéré depuis sessionStorage
↓
currentUser reste null
↓
authGuard détecte le token
↓
GET /api/auth/me
↓
utilisateur restauré ou session invalidée
```

Cette distinction empêche Angular de faire confiance à un token simplement parce qu'il existe localement.

## HTTP

Les composants n'ajoutent jamais directement le header JWT.

`authInterceptor` s'en charge pour les URLs :

```text
/api/*
```

Les requêtes externes ne reçoivent pas automatiquement le token.

## Navigation

Routes publiques :

```text
/login
/register
```

Route actuellement privée :

```text
/
```

Les prochaines routes métier privées devront utiliser le même `authGuard`.

## Return URL

Lorsqu'un utilisateur non connecté tente d'accéder à une route privée :

```text
/cocktails/123
```

la navigation pourra devenir :

```text
/login?returnUrl=/cocktails/123
```

Après authentification, Angular revient vers la destination demandée.

Seules les URLs internes commençant par `/` mais pas par `//` sont acceptées.

## Développement local

Backend :

```powershell
npm --prefix backend run start:dev
```

Frontend :

```powershell
npm --prefix frontend start
```

Angular transfère `/api` vers NestJS grâce à :

```text
frontend/proxy.conf.json
```

## Vérification

Depuis la racine :

```powershell
npm --prefix frontend run verify
```

Avant une PR d'authentification impliquant également l'API :

```powershell
npm --prefix frontend run verify
npm --prefix backend run verify:db
```
