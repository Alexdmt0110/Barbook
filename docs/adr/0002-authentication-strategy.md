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
- un contrôle explicite du workspace dans les futures opérations métier.

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

## Routes

Les routes d'inscription et de connexion sont publiques.

Les routes protégées utilisent `JwtAuthGuard`.

Le décorateur `CurrentUserId` permet de récupérer l'identifiant authentifié depuis le token validé.

## Erreurs d'authentification

Une tentative de connexion échouée retourne volontairement le même message lorsque :

- l'adresse email n'existe pas ;
- le mot de passe est incorrect.

Une opération Argon2 est également effectuée lorsqu'aucun utilisateur n'est trouvé afin de réduire la différence temporelle observable entre les deux situations.

## Conséquences

Les futures autorisations devront toujours vérifier l'appartenance de l'utilisateur au workspace ciblé.

Un JWT valide ne constitue pas une autorisation d'accès à toutes les données de l'utilisateur ou des workspaces auxquels il appartient.

## Limites actuelles

Les refresh tokens ne sont pas encore implémentés.

La stratégie de stockage des tokens côté frontend n'est pas encore décidée.

La limitation de débit des endpoints d'authentification n'est pas encore implémentée.

La vérification d'adresse email, la réinitialisation de mot de passe et l'authentification multifacteur sont hors du périmètre actuel.

Ces éléments devront être réévalués avant une mise en production publique.
