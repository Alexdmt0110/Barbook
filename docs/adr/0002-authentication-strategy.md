# ADR 0002 — Stratégie d'authentification

## Statut

Accepté.

## Contexte

Barbook doit authentifier ses utilisateurs tout en permettant à un même compte d'accéder à son Barbook personnel et, à terme, à plusieurs workspaces partagés.

L'identité de l'utilisateur ne doit donc pas être confondue avec le workspace actuellement consulté.

Les mots de passe et les jetons d'accès doivent également être protégés selon des pratiques adaptées à une application web moderne.

## Décision

L'authentification repose sur :

- des mots de passe hashés avec Argon2id ;
- un access token JWT de courte durée ;
- un JWT identifiant uniquement l'utilisateur ;
- un contrôle explicite du workspace dans les futures opérations métier ;
- un stockage temporaire de l'access token dans `sessionStorage` côté frontend pour la V1.

Le payload JWT contient actuellement uniquement :

```text
sub = user.id
```

Le JWT ne contient pas :

```text
workspaceId
workspaceRole
password
passwordHash
```

Le changement de workspace ne nécessite donc pas une nouvelle authentification.

## Inscription

L'inscription crée dans une transaction unique :

```text
User
+
Workspace PERSONAL
+
WorkspaceMember OWNER
```

Cette transaction garantit qu'un utilisateur ne peut pas être créé sans son Barbook personnel.

Une inscription réussie connecte immédiatement l'utilisateur et retourne un access token.

## Mots de passe

Les mots de passe sont hashés avec Argon2id.

La configuration actuelle utilise :

```text
memoryCost  = 19 MiB
timeCost    = 2
parallelism = 1
```

Les mots de passe ne sont jamais enregistrés ou retournés en clair.

Les réponses publiques utilisateur n'exposent jamais `passwordHash`.

## Access token

Les access tokens :

- utilisent `HS256` ;
- expirent après 15 minutes ;
- utilisent `barbook-api` comme issuer ;
- utilisent `barbook-web` comme audience ;
- nécessitent un secret d'au moins 32 caractères.

Le secret JWT est uniquement fourni par l'environnement et n'est jamais versionné.

## Stockage frontend

Pour la V1, l'access token est stocké dans :

```text
sessionStorage
```

Ce choix permet de conserver la session lors d'un rafraîchissement de page tout en supprimant le token à la fermeture de la session navigateur.

`sessionStorage` reste accessible au JavaScript exécuté dans la page et ne protège donc pas contre une attaque XSS.

Il s'agit d'un compromis temporaire adapté au développement actuel, pas de la stratégie cible pour une exposition publique durable.

La stratégie cible à réévaluer avant mise en production publique est :

```text
access token  → mémoire frontend
refresh token → cookie HttpOnly + Secure + SameSite
```

Cette évolution nécessite une feature dédiée de gestion des sessions et refresh tokens.

## Restauration de session

Au démarrage de l'application Angular, la présence d'un token dans `sessionStorage` ne suffit pas à considérer l'utilisateur comme authentifié.

Une route protégée déclenche :

```text
GET /api/auth/me
```

Le backend valide le JWT et vérifie que l'utilisateur existe toujours.

Si la requête réussit, l'état utilisateur Angular est restauré.

Si elle échoue :

```text
token supprimé
session locale supprimée
redirection vers /login
```

## Routes

Les routes backend d'inscription et de connexion sont publiques.

Les routes backend protégées utilisent `JwtAuthGuard`.

Le décorateur `CurrentUserId` permet de récupérer l'identifiant authentifié depuis le token validé.

Côté Angular, les routes privées utilisent `authGuard`.

Une tentative d'accès à une route privée sans session redirige vers :

```text
/login?returnUrl=<route-demandée>
```

Après connexion, l'utilisateur peut être redirigé vers la route initialement demandée.

## Transmission du token

Un interceptor Angular ajoute automatiquement :

```http
Authorization: Bearer <access-token>
```

uniquement aux requêtes dont l'URL commence par :

```text
/api/
```

Le token Barbook n'est donc pas automatiquement envoyé vers des services externes.

## Erreurs d'authentification

Une tentative de connexion échouée retourne volontairement le même message lorsque :

- l'adresse email n'existe pas ;
- le mot de passe est incorrect.

Une opération Argon2 est également effectuée lorsqu'aucun utilisateur n'est trouvé afin de réduire la différence temporelle observable entre les deux situations.

Le frontend ne révèle pas davantage d'informations que le backend.

## Conséquences

Les futures autorisations devront toujours vérifier l'appartenance de l'utilisateur au workspace ciblé.

Un JWT valide ne constitue pas une autorisation d'accès à toutes les données de l'utilisateur ou des workspaces auxquels il appartient.

Le frontend ne doit jamais être considéré comme une barrière de sécurité suffisante : toutes les autorisations métier restent vérifiées côté backend.

## Limites actuelles

Les refresh tokens ne sont pas encore implémentés.

Le stockage de l'access token dans `sessionStorage` est temporaire.

La limitation de débit des endpoints d'authentification n'est pas encore implémentée.

La vérification d'adresse email, la réinitialisation de mot de passe, la révocation de sessions et l'authentification multifacteur sont hors du périmètre actuel.

Ces éléments devront être réévalués avant une mise en production publique.
