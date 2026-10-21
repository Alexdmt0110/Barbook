# Création d'un cocktail

## Objectif

La fonctionnalité de création permet à un utilisateur authentifié d'enregistrer une recette complète dans son Barbook personnel.

La création prend en charge :

- les informations générales du cocktail ;
- les ingrédients ;
- les garnitures ;
- les étapes de préparation ;
- les notes ;
- l'alcool principal ;
- la réutilisation du catalogue personnel d'ingrédients.

L'upload d'une image ne fait pas partie de cette fonctionnalité et sera traité séparément.

## Route frontend

La page de création est accessible sur :

```text
/cocktails/new
```

Cette route doit être déclarée avant :

```text
/cocktails/:slug
```

afin que `new` ne soit pas interprété comme le slug d'un cocktail.

## Endpoint backend

La création utilise :

```http
POST /api/cocktails
```

L'endpoint nécessite une session cookie et les preuves CSRF/contexte.

Le client ne transmet pas de `workspaceId`.

Le workspace personnel est déterminé côté backend à partir de l'utilisateur authentifié.

Cela évite qu'un client puisse tenter de créer directement une recette dans le workspace d'un autre utilisateur.

## Transaction

La création complète du cocktail est exécutée dans une transaction Prisma.

La transaction contient notamment :

- la résolution ou création des ingrédients ;
- la création du cocktail ;
- la création des lignes d'ingrédients ;
- la création des garnitures ;
- la création des étapes de préparation.

Une erreur pendant l'une de ces opérations annule l'ensemble de la création.

Une recette ne doit donc jamais être persistée partiellement.

Si deux recettes distinctes créent simultanément le même ingrédient canonique,
une collision d'unicité sur `Ingredient` reprend la transaction complète, au plus
deux fois après la tentative initiale. Le catalogue relu après reprise reste la
source de vérité ; le degré propre à chaque recette est recalculé en override.
Une transaction PostgreSQL avortée n'est jamais réutilisée. Une collision du
slug du cocktail reste un `409` ; une contention du catalogue qui persiste après
trois tentatives retourne `503` et invite à réessayer.

## Slug du cocktail

Le slug est calculé côté backend à partir du nom du cocktail avec le helper commun :

```text
toSlug()
```

Le slug est unique au sein du workspace.

Le slug `new` est réservé par le routeur frontend au formulaire de création.
Pour un nom dont le slug canonique serait `new` (par exemple `New` ou `NÉW !!!`),
l'API génère `new-cocktail`. Le nom affiché reste celui saisi. Le frontend utilise
le slug renvoyé par l'API et ne le recalcule pas. La règle ne concerne pas les
slugs d'ingrédients. Une collision avec un cocktail déjà nommé `New Cocktail`
reste un conflit `409`, comme les autres collisions de slugs canoniques.

Ce correctif ne réécrit aucune donnée existante. Avant toute reprise sur une
base déjà utilisée, rechercher les éventuels cocktails historiques de slug `new`
et préparer leur traitement séparément ; aucune migration de données n'est
incluse dans ce bloc.

Une tentative de création avec un slug déjà utilisé retourne un conflit HTTP `409`.

## Catalogue d'ingrédients

Les ingrédients sont mutualisés dans le catalogue `Ingredient` du workspace personnel.

La création d'une recette ne doit pas créer plusieurs entrées représentant le même ingrédient canonique.

Le slug canonique d'un ingrédient est généré avec :

```text
toSlug()
```

Exemple :

```text
Sirop de sucre
↓
sirop-de-sucre
```

Lorsqu'un ingrédient possédant déjà ce slug existe dans le workspace, il est réutilisé.

La création d'une recette ne modifie pas silencieusement le nom ou le degré alcoolique par défaut d'un ingrédient existant.

Une même recette ne peut pas contenir plusieurs lignes correspondant au même slug canonique d'ingrédient.

Cette contrainte évite les ambiguïtés entre l'identité catalogue, les overrides de degré alcoolique et l'alcool principal.

Lorsqu'un même ingrédient intervient à plusieurs moments de la préparation, la V1 conserve une seule ligne d'ingrédient et décrit la répartition dans les étapes ou les notes de la recette.

## Recherche d'ingrédients

L'autocomplétion utilise :

```http
GET /api/ingredients?query=...
```

La recherche :

- est authentifiée ;
- utilise uniquement le workspace personnel de l'utilisateur ;
- ignore les recherches de moins de 3 caractères ;
- refuse les recherches de plus de 120 caractères ;
- interroge PostgreSQL par niveaux de pertinence avec des requêtes bornées ;
- s'arrête dès que 8 suggestions pertinentes sont obtenues ;
- retourne au maximum 8 suggestions.

L'ordre de pertinence est :

1. correspondance exacte ;
2. nom commençant par la recherche ;
3. mot commençant par la recherche ;
4. correspondance contenue dans le nom.

L'autocomplétion reste facultative.

L'utilisateur peut saisir librement un nouvel ingrédient.

## Autocomplétion frontend

Le composant générique se trouve dans :

```text
frontend/src/app/shared/ui/autocomplete/
```

Il gère notamment :

- la navigation clavier ;
- `ArrowUp` ;
- `ArrowDown` ;
- `Enter` ;
- `Escape` ;
- les attributs ARIA de type combobox/listbox ;
- l'association entre le libellé visible et le champ de saisie ;
- le chargement ;
- la sélection d'une option ;
- les interactions pointer compatibles souris, tactile et stylet.

Le composant spécifique aux ingrédients se trouve dans :

```text
frontend/src/app/features/ingredients/ui/
```

Il ajoute :

- la recherche du catalogue ;
- un debounce de 250 ms ;
- un seuil minimum de 3 caractères ;
- l'affichage du degré alcoolique connu.

## Degré alcoolique dans le formulaire

L'interface expose volontairement un seul champ :

```text
Degré alcoolique
```

La distinction technique entre `defaultAbv` et `abvOverride` n'est pas exposée à l'utilisateur.

### Nouvel ingrédient

Pour un ingrédient qui n'existe pas encore dans le catalogue :

```text
valeur saisie
→ ingredientDefaultAbv
```

Cette valeur devient le degré par défaut du nouvel ingrédient.

### Ingrédient existant

Lorsqu'un ingrédient existant est sélectionné :

```text
catalogue.defaultAbv
→ ingredientDefaultAbv
```

Si l'utilisateur change ensuite le degré dans la recette :

```text
nouvelle valeur
→ abvOverride
```

Le degré par défaut du catalogue reste inchangé.

Les valeurs ont les significations suivantes :

```text
vide → degré inconnu
0    → explicitement sans alcool
> 0  → degré alcoolique connu
```

## Alcool principal

L'alcool principal est facultatif.

Dans le contrat API, `mainAlcoholName` peut être omis ou valoir `null` : ces deux
formes signifient qu'aucun alcool principal n'est sélectionné. Une chaîne vide
est normalisée en absence. Les autres types sont rejetés par le DTO (`400`).

Dans le formulaire, les choix sont dérivés des ingrédients de la recette dont le degré saisi est strictement supérieur à `0`.

Le backend vérifie également que l'alcool principal appartient bien aux ingrédients de la recette et que son degré alcoolique effectif est strictement supérieur à `0`.

Pour un ingrédient existant, le degré effectif est déterminé par :

```text
abvOverride ?? catalogue.defaultAbv
```

Le backend ne fait donc pas confiance à une valeur `ingredientDefaultAbv` fournie par le client pour modifier implicitement le catalogue existant.

## Volumes

L'utilisateur peut saisir des volumes en :

```text
cL
mL
```

Le frontend convertit les centilitres en millilitres avant l'appel API.

Exemple :

```text
4,5 cL
→ 45 ML
```

La base ne persiste donc pas d'unité `CL`.

## TOP_UP

Une ligne utilisant :

```text
TOP_UP
```

ne possède pas de quantité.

Une quantité associée à `TOP_UP` est refusée par le backend.

La présence d'un `TOP_UP` empêche également de calculer précisément l'ABV estimé du cocktail.

## Garnitures

Les garnitures sont séparées des ingrédients participant à la préparation.

Une garniture peut :

- définir une quantité et une unité ensemble ;
- ne définir ni quantité ni unité.

Une seule des deux valeurs n'est pas autorisée.

`TOP_UP` n'est pas une unité valide pour une garniture.

## Étapes de préparation

Une recette contient au minimum une étape.

Les étapes sont stockées avec un `sortOrder`.

Leur ordre dans le tableau envoyé au backend détermine leur ordre de persistance.

## Validation backend

Le DTO impose notamment :

- un nom de cocktail entre 2 et 120 caractères ;
- au maximum 50 ingrédients ;
- au maximum 20 garnitures ;
- entre 1 et 30 étapes ;
- un degré alcoolique compris entre 0 et 100 ;
- des limites de taille sur les champs texte ;
- des valeurs appartenant aux enums métier.

Le service complète ces validations avec les invariants qui dépendent de plusieurs champs ou du catalogue :

- cohérence quantité/unité ;
- contraintes `TOP_UP` ;
- unicité canonique des ingrédients de recette ;
- appartenance de l'alcool principal à la recette ;
- caractère réellement alcoolisé de l'alcool principal.

Le `ValidationPipe` global utilise :

```text
whitelist: true
forbidNonWhitelisted: true
transform: true
```

Les propriétés non prévues dans les DTO sont donc rejetées.

## Gestion des erreurs frontend

Les principaux cas distingués sont :

```text
400 → données invalides
401 → session invalide
409 → cocktail déjà existant
0   → API inaccessible
autre → erreur générique
```

Après une création réussie, le frontend navigue vers :

```text
/cocktails/:slug
```

## Seed de développement

Le seed utilise les mêmes slugs canoniques que l'application grâce à :

```text
toSlug()
```

Le seed contient également une réconciliation limitée aux anciens slugs historiques connus.

Cette réconciliation :

1. crée ou récupère l'ingrédient canonique ;
2. déplace les références des recettes ;
3. déplace les références des garnitures ;
4. déplace les références `mainAlcoholId` ;
5. supprime l'ancien ingrédient.

Cette logique est destinée uniquement à nettoyer les données locales historiques.

Elle ne constitue pas un mécanisme générique de migration de production.

## Tests

La fonctionnalité est couverte côté backend pour :

- la création complète ;
- les validations métier ;
- le rejet des ingrédients canoniques dupliqués ;
- les conflits ;
- la recherche d'ingrédients ;
- le classement des suggestions ;
- les limites de recherche ;
- les valeurs `null` et `0` de l'ABV.

Le frontend couvre notamment :

- le service de création ;
- le service de recherche ;
- l'autocomplétion générique ;
- l'autocomplétion d'ingrédients ;
- le formulaire de création ;
- les validateurs de formulaire ;
- le rejet des ingrédients canoniques dupliqués ;
- la conversion des volumes ;
- les listes dynamiques ;
- l'alcool principal ;
- la navigation après création.

## Hors périmètre

Cette fonctionnalité ne gère pas encore :

- l'upload d'image ;
- la modification d'une recette ;
- la suppression d'une recette ;
- les workspaces partagés ;
- la gestion avancée du catalogue d'ingrédients ;
- la recherche approximative ou fuzzy.


## Brouillons L4 B4d

Voir le [contrat des brouillons temporaires](temporary-drafts.md) : mémoire/sessionStorage24h, identité confirmée, restauration et abandon explicites, versions et résultats incertains, stockage refusé et purge volontaire. Aucun envoi automatique ni clôture de L4 global.
