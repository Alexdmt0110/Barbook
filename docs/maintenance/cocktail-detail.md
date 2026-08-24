# Fiche détaillée d'un cocktail

## Périmètre

La fiche détaillée permet à un utilisateur authentifié de consulter une recette appartenant à son Barbook personnel.

Route frontend :

```text
/cocktails/:slug
```

Endpoint backend :

```text
GET /api/cocktails/:slug
```

## Flux

```text
Angular
↓
GET /api/cocktails/:slug
↓
JwtAuthGuard
↓
user.id
↓
Workspace PERSONAL
↓
(workspaceId, slug)
↓
Cocktail
↓
PostgreSQL
```

## Isolation workspace

Le client ne transmet pas de :

```text
userId
workspaceId
```

Le backend résout d'abord le workspace personnel à partir de l'utilisateur authentifié.

Le cocktail est ensuite recherché avec la clé composée :

```text
workspaceId + slug
```

Un cocktail absent et un cocktail existant dans un autre workspace produisent tous les deux :

```text
404
```

Cette règle évite de révéler l'existence de données appartenant à un autre utilisateur.

## Données retournées

La réponse contient notamment :

```text
identité
type
famille
image
tags
alcool principal
méthode
verre
glace
ingrédients
garnitures
étapes
notes
ABV estimé
```

Les ingrédients, garnitures et étapes sont retournés dans l'ordre défini par :

```text
sortOrder ASC
```

## Quantités

Les quantités Prisma de type `Decimal` sont converties explicitement en nombres avant la réponse HTTP.

Le frontend ne reçoit donc pas de représentation Prisma.

Les volumes stockés en millilitres sont affichés en centilitres dans l'interface française.

Exemples :

```text
50 ML → 5 cl
25 ML → 2,5 cl
15 ML → 1,5 cl
```

## ABV

Pour chaque ingrédient :

```text
abv = abvOverride ?? defaultAbv
```

La fiche reçoit directement cet ABV effectif.

Le calcul du degré estimé reste une responsabilité backend.

Un résultat inconnu est représenté par :

```text
null
```

et affiché par Angular comme :

```text
Non estimé
```

Voir également :

```text
docs/maintenance/recipe-data-conventions.md
```

## Interface frontend

La bibliothèque rend maintenant chaque carte entièrement navigable.

Exemple :

```text
/cocktails
↓
Daiquiri
↓
/cocktails/daiquiri
```

La fiche gère :

```text
chargement
recette disponible
404
erreur réseau/API
retry
```

Elle utilise exclusivement les tokens visuels globaux et fonctionne avec :

```text
Sombre
Clair
Contraste élevé
```

## Responsive

La fiche utilise une présentation en deux colonnes sur grand écran puis une colonne sur tablette et mobile.

Les contrôles manuels comprennent notamment :

```text
390 px
430 px
768 px
desktop
```

Le document global ne doit pas produire de débordement horizontal.

## Seed de développement

Les cocktails de développement disposent désormais de recettes complètes :

```text
Daiquiri
Espresso Martini
Negroni
```

Le seed recrée de manière déterministe leurs :

```text
ingrédients
garnitures
étapes
tags
```

après avoir supprimé les anciennes lignes associées aux cocktails seedés.

Ce comportement est réservé au développement.

Le seed reste bloqué lorsque :

```text
NODE_ENV=production
```

## Vérification

Depuis la racine :

```powershell
npm --prefix frontend run verify
npm --prefix backend run verify:db
```

## Limites actuelles

La fiche ne permet pas encore :

```text
édition
suppression
upload d'image
partage
favoris
historique
```

L'ABV estimé ne prend pas en compte la dilution liée à la glace ou à la technique de préparation.

Les unités liquides non exprimées en `ML` ne sont pas encore converties pour le calcul ABV.
