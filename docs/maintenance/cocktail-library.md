# Bibliothèque de cocktails

## Périmètre actuel

La bibliothèque permet à un utilisateur authentifié de consulter les cocktails de son Barbook personnel.

Le flux actuel est :

```text
Angular
↓
GET /api/cocktails
↓
JwtAuthGuard
↓
user.id
↓
Workspace PERSONAL
↓
Cocktail[]
↓
PostgreSQL
```

La création, la modification, la suppression, la recherche, les filtres et la fiche détaillée ne font pas encore partie de cette feature.

## Endpoint

L'API expose :

```text
GET /api/cocktails
```

Cet endpoint nécessite un access token JWT valide.

Le frontend ne transmet ni :

```text
userId
workspaceId
```

Le workspace personnel est déterminé côté backend à partir de l'utilisateur authentifié.

## Isolation des données

Le service recherche le workspace par :

```text
personalOwnerId = authenticatedUserId
```

La requête ne dépend donc pas d'un identifiant de workspace fourni par le client.

Cette règle permet à :

```text
GET /api/cocktails
```

de toujours signifier :

```text
mes cocktails personnels
```

Les futurs workspaces partagés devront utiliser un endpoint explicitement scoped au workspace et vérifier l'appartenance de l'utilisateur.

## Workspace personnel absent

Un utilisateur créé normalement possède toujours un workspace `PERSONAL`.

Si un utilisateur authentifié ne possède plus ce workspace, le backend ne retourne pas une bibliothèque vide.

Il retourne une erreur serveur car cette situation constitue une violation de l'invariant de données :

```text
User
→ exactement un Workspace PERSONAL
```

## Résumé Cocktail

La liste retourne uniquement les informations utiles à l'affichage d'une carte :

```text
id
slug
name
type
family
method
glass
imageUrl
mainAlcohol
folder
tags
updatedAt
```

Elle ne retourne pas encore :

```text
ingredients
garnishes
preparation steps
recipe notes
estimated ABV
```

Ces informations appartiendront à l'endpoint de détail.

## Tri

Les cocktails sont triés par :

```text
name ASC
id ASC
```

L'identifiant sert de second critère afin d'obtenir un ordre stable lorsque plusieurs cocktails portent le même nom.

## Frontend

La route :

```text
/cocktails
```

appartient au shell authentifié de l'application.

Elle utilise :

```text
CocktailsService
↓
GET /api/cocktails
```

Le token JWT est ajouté par l'interceptor d'authentification existant.

La page gère :

```text
chargement
bibliothèque remplie
bibliothèque vide
erreur réseau/API
retry
```

Les cartes ne sont pas encore interactives car aucune route de détail n'existe actuellement.

## Responsive

La bibliothèque utilise :

```text
desktop  → 3 colonnes
tablette → 2 colonnes
mobile   → 1 colonne
```

Les conteneurs principaux utilisent :

```text
width: 100%
max-width
padding interne
box-sizing: border-box
```

afin d'éviter les débordements horizontaux.

Le shell, l'accueil et la bibliothèque ont été vérifiés notamment sur des largeurs mobiles de 390 px et 430 px.

## Shell applicatif

Les routes authentifiées partagent :

```text
AppShell
├── Barbook
├── Accueil
├── Mes cocktails
├── utilisateur courant
├── Déconnexion
└── RouterOutlet
```

Les pages :

```text
/login
/register
```

restent en dehors du shell.

## Seed de développement

Un seed local permet de disposer de données réelles sans ajouter de mocks dans Angular.

Commande :

```powershell
npm --prefix backend run db:seed -- --email user@example.com
```

Le compte doit déjà exister.

Le seed ne crée volontairement aucun utilisateur afin que le flux d'inscription continue d'être testé réellement.

Il crée ou met à jour :

```text
Daiquiri
Espresso Martini
Negroni
```

ainsi que les ingrédients principaux et tags nécessaires.

Le seed est idempotent.

Le relancer ne crée donc pas de doublons.

Son exécution est bloquée lorsque :

```text
NODE_ENV=production
```

Le seed reste un outil de développement et ne doit jamais servir de mécanisme de données de production.

## Tests backend

Les tests vérifient notamment :

```text
scope par personalOwnerId
mapping des tags
tri demandé à Prisma
bibliothèque vide
absence anormale de workspace personnel
```

Le câblage réel du JWT a également été vérifié par smoke test HTTP :

```text
sans JWT → 401
avec JWT → bibliothèque personnelle
```

## Tests frontend

Les tests vérifient :

```text
GET /api/cocktails
absence de workspaceId envoyé par Angular
rendu des cocktails
état vide
erreur de connexion
retry
```

## Vérification

Depuis la racine :

```powershell
npm --prefix frontend run verify
npm --prefix backend run verify:db
```

Le service PostgreSQL local peut être vérifié avec :

```powershell
docker compose ps
```

## Limites actuelles

La bibliothèque ne propose pas encore :

```text
pagination
recherche
filtres
tri utilisateur
fiche détaillée
création
édition
suppression
upload d'image
workspace partagé
```

L'expiration d'un access token pendant que l'application est déjà ouverte peut actuellement produire un `401` sur une requête métier sans invalider immédiatement l'état d'authentification global d'Angular.

Cette gestion devra être centralisée dans l'infrastructure d'authentification plutôt que dupliquée dans les pages métier.

## Étapes suivantes

La prochaine feature prévue après cette bibliothèque est le système de préférences visuelles :

```text
sombre
clair
contraste élevé
```

La fiche détaillée des cocktails viendra ensuite.
