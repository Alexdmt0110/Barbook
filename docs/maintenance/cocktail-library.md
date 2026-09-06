# Bibliothèque de cocktails

## Périmètre actuel

La bibliothèque permet à un utilisateur authentifié de gérer les cocktails de son Barbook personnel.

Le périmètre actuellement disponible comprend :

```text
consultation de la bibliothèque
recherche par nom
filtrage par type
filtrage par méthode
filtrage par dossier
filtrage par tag
pagination
consultation d'une fiche détaillée
création d'un cocktail
organisation par dossier et tags
```

L'upload d'image, l'édition complète d'une recette, la suppression et les workspaces partagés ne font pas encore partie du périmètre actuel.

## Architecture générale

Le flux principal est :

```text
Angular
↓
API /api
↓
JwtAuthGuard
↓
user.id
↓
Workspace PERSONAL
↓
Cocktails / folders / tags
↓
Prisma
↓
PostgreSQL
```

Le frontend ne transmet jamais :

```text
userId
workspaceId
```

Le workspace personnel est toujours déterminé côté backend à partir de l'utilisateur authentifié.

## Isolation des données

Le backend recherche le workspace par :

```text
personalOwnerId = authenticatedUserId
```

Les requêtes métier utilisent ensuite cet identifiant comme scope.

Cette règle garantit que :

```text
GET /api/cocktails
GET /api/folders
GET /api/tags
PUT /api/cocktails/:slug/organization
```

désignent toujours les données du Barbook personnel de l'utilisateur authentifié.

Un identifiant de dossier ou de tag fourni par le client ne permet donc pas d'accéder aux données d'un autre workspace.

Les relations Prisma renforcent cette isolation avec des clés étrangères composites contenant :

```text
workspaceId
```

Les futurs workspaces partagés devront utiliser un endpoint explicitement scoped au workspace et vérifier l'appartenance de l'utilisateur.

## Workspace personnel absent

Un utilisateur créé normalement possède toujours un workspace :

```text
PERSONAL
```

Si un utilisateur authentifié ne possède plus ce workspace, le backend ne retourne pas une bibliothèque vide.

Il retourne une erreur serveur car cette situation constitue une violation de l'invariant :

```text
User
→ exactement un Workspace PERSONAL
```

## Liste des cocktails

L'API expose :

```text
GET /api/cocktails
```

L'endpoint accepte les paramètres facultatifs suivants :

```text
search
type
method
folderId
tagId
page
pageSize
```

Exemple :

```text
GET /api/cocktails?search=negroni&type=CLASSIC&method=MIXING_GLASS&folderId=<uuid>&tagId=<uuid>&page=1&pageSize=24
```

## Recherche

Le paramètre :

```text
search
```

effectue une recherche sur le nom du cocktail.

La recherche PostgreSQL est :

```text
insensible à la casse
contains
```

Une valeur vide après trim est considérée comme absente.

## Filtres

Les filtres actuellement disponibles sont :

```text
type
method
folderId
tagId
```

Ils sont combinables entre eux ainsi qu'avec la recherche.

Le filtre :

```text
folderId
```

sélectionne les cocktails appartenant au dossier demandé.

Le filtre :

```text
tagId
```

sélectionne les cocktails possédant le tag demandé.

Les identifiants sont validés comme UUID côté backend.

Un UUID valide mais inexistant ou appartenant à un autre workspace retourne simplement une liste vide.

Aucune information sur l'existence d'une ressource extérieure au workspace n'est révélée.

## Pagination

Les valeurs par défaut sont :

```text
page = 1
pageSize = 24
```

La taille maximale acceptée est :

```text
pageSize = 100
```

La réponse est structurée ainsi :

```text
items
page
pageSize
total
totalPages
```

Le frontend conserve les filtres actifs lors d'un changement de page.

Une modification de :

```text
recherche
type
method
dossier
tag
```

ramène la pagination à la première page.

## Tri

Les cocktails sont triés par :

```text
name ASC
id ASC
```

L'identifiant sert de second critère pour conserver un ordre stable lorsque plusieurs cocktails portent le même nom.

## Résumé Cocktail

La liste retourne les informations nécessaires aux cartes :

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

Les informations complètes de recette sont récupérées par l'endpoint de détail.

## Fiche détaillée

L'API expose :

```text
GET /api/cocktails/:slug
```

La fiche contient notamment :

```text
informations générales
ingrédients
garnitures
étapes de préparation
notes
dossier
tags
degré alcoolique estimé
```

La route Angular correspondante est :

```text
/cocktails/:slug
```

L'accès à une fiche reste scoped au workspace personnel de l'utilisateur authentifié.

## Création

L'API expose :

```text
POST /api/cocktails
```

La création d'un cocktail reste séparée de son organisation.

Le formulaire de création ne gère volontairement pas encore :

```text
dossier
tags
```

Ces informations sont modifiées ensuite depuis la fiche détaillée afin de conserver un formulaire de création simple et cohérent.

## Dossiers

L'API expose :

```text
GET /api/folders
POST /api/folders
```

Un dossier appartient toujours à un workspace.

Un cocktail peut appartenir à :

```text
zéro ou un dossier
```

La création d'un dossier :

```text
trim le nom
limite le nom à 80 caractères
refuse un doublon exact dans le même workspace
```

L'invariant actuellement garanti par PostgreSQL est :

```text
UNIQUE(workspaceId, name)
```

La comparaison est donc celle de la base.

Dans la V1, deux noms qui diffèrent uniquement par la casse peuvent exister si PostgreSQL les considère distincts.

Le renommage et la suppression des dossiers ne font pas encore partie du périmètre.

## Tags

L'API expose :

```text
GET /api/tags
```

La création d'un tag est implicite lors de l'enregistrement de l'organisation d'un cocktail.

Les tags sont identifiés fonctionnellement par leur slug dans un workspace :

```text
UNIQUE(workspaceId, slug)
```

Le backend :

```text
trim les noms
limite chaque nom à 40 caractères
limite un cocktail à 20 tags
normalise le slug
déduplique les tags par slug
réutilise les tags existants
crée les tags absents
```

La création utilise :

```text
createMany
skipDuplicates
```

puis relit les tags du workspace afin de récupérer les entités canoniques réellement persistées.

Le renommage et la suppression globale des tags ne font pas encore partie du périmètre.

## Organisation d'un cocktail

L'API expose :

```text
PUT /api/cocktails/:slug/organization
```

Le corps représente l'état complet voulu :

```json
{
  "folderId": "uuid-or-null",
  "tagNames": [
    "Classique",
    "Agrumes"
  ]
}
```

La sémantique est donc un remplacement complet de l'organisation :

```text
folderId
+
ensemble des tags
```

Le backend vérifie d'abord :

```text
workspace personnel
cocktail appartenant au workspace
dossier appartenant au workspace
tags valides
```

L'opération est ensuite exécutée dans une transaction Prisma.

Le flux est :

```text
résolution du cocktail
↓
résolution du dossier
↓
création/résolution des tags
↓
mise à jour du dossier
↓
suppression des anciennes relations CocktailTag
↓
création des nouvelles relations CocktailTag
```

La mise à jour du cocktail verrouille sa ligne PostgreSQL avant le remplacement des associations de tags.

Deux modifications concurrentes du même cocktail sont ainsi sérialisées et la dernière transaction appliquée devient l'état final.

## Frontend de la bibliothèque

La route :

```text
/cocktails
```

appartient au shell authentifié.

Elle utilise :

```text
CocktailsService
```

pour charger :

```text
cocktails
dossiers
tags
```

La bibliothèque gère :

```text
chargement
bibliothèque remplie
bibliothèque vide
recherche debounced
filtres
pagination
aucun résultat
erreur API
retry
```

La recherche utilise un debounce de :

```text
300 ms
```

Les filtres type, méthode, dossier et tag sont appliqués immédiatement.

Si le chargement des dossiers ou tags échoue, la bibliothèque principale reste utilisable.

Les filtres d'organisation sont alors désactivés et peuvent être rechargés séparément.

## Frontend de la fiche détaillée

La fiche contient un composant dédié :

```text
CocktailOrganizationEditor
```

Il est responsable de :

```text
charger les dossiers
charger les tags
sélectionner un dossier
créer un dossier
sélectionner des tags existants
ajouter un nouveau nom de tag
retirer un tag
enregistrer l'organisation complète
```

La fiche parente reste responsable de l'affichage général de la recette.

Après une sauvegarde réussie, l'éditeur émet l'organisation retournée par le serveur.

Le parent met immédiatement à jour :

```text
folder
tags
```

sans recharger l'intégralité de la recette.

## Responsive

La bibliothèque utilise :

```text
desktop  → 3 colonnes
tablette → 2 colonnes
mobile   → 1 colonne
```

Les filtres se réorganisent également selon la largeur disponible.

L'éditeur d'organisation passe de deux colonnes à une colonne sur les petits écrans.

## Authentification

Tous les endpoints métier concernés nécessitent un access token JWT valide.

Le token est ajouté par l'interceptor Angular existant.

Le backend applique :

```text
JwtAuthGuard
```

avant l'accès aux services métier.

L'identité utilisée par les services provient du JWT et non du corps de requête.

## Contraintes de base de données utiles

Le schéma Prisma renforce notamment :

```text
Folder
UNIQUE(workspaceId, id)
UNIQUE(workspaceId, name)

Cocktail
UNIQUE(workspaceId, id)
UNIQUE(workspaceId, slug)
INDEX(folderId)

Tag
UNIQUE(workspaceId, id)
UNIQUE(workspaceId, slug)

CocktailTag
PRIMARY KEY(cocktailId, tagId)
INDEX(tagId)
```

Les relations dossier et tags utilisent des références composites contenant :

```text
workspaceId
```

ce qui empêche la création de relations cross-workspace incohérentes.

## Tests backend

Les tests couvrent notamment :

```text
scope par workspace personnel
liste des dossiers
création de dossier
doublon de dossier
liste des tags
validation des DTO
organisation d'un cocktail
cocktail introuvable
dossier extérieur au workspace
normalisation des tags
déduplication des tags
remplacement des relations CocktailTag
filtres folderId et tagId
combinaison filtres + pagination
```

## Tests frontend

Les tests couvrent notamment :

```text
contrat HTTP des endpoints d'organisation
folderId et tagId dans les query params
chargement des catalogues
création d'un dossier
ajout et retrait de tags
sauvegarde de l'organisation
mise à jour immédiate de la fiche
filtres dossier et tag
réinitialisation des filtres
conservation des filtres pendant la pagination
échec non bloquant des catalogues
```

## Vérification

Backend :

```powershell
cd backend
npm run verify
npx prisma validate
```

Frontend :

```powershell
cd frontend
npm run verify
```

Depuis la racine :

```powershell
git diff --check
```

## Limites actuelles

La V1 ne propose pas encore :

```text
renommage de dossier
suppression de dossier
renommage global de tag
suppression globale de tag
drag and drop
édition en masse
couleurs de tags
organisation pendant la création
filtrage multi-tags AND / OR
persistance des filtres dans l'URL
upload d'image
édition complète d'une recette
suppression de cocktail
workspace partagé
```

Les listes de dossiers et tags ne sont pas paginées.

Cela reste acceptable pour une bibliothèque personnelle V1 mais devra être réévalué si le nombre d'éléments augmente fortement.

La recherche par nom utilise actuellement un :

```text
contains
```

PostgreSQL.

À grande échelle, cette stratégie pourra nécessiter un index ou une approche de recherche plus adaptée.

## Impact OPS

Cette évolution :

```text
n'ajoute aucune migration
ne modifie aucune variable d'environnement
ne modifie aucune infrastructure
ne nécessite aucun déploiement spécifique
```

Les modèles :

```text
Folder
Tag
CocktailTag
```

et les relations nécessaires existaient déjà dans le schéma Prisma.
