# Conventions de données des recettes

## Objectif

Les recettes Barbook doivent être enregistrées de manière cohérente et reproductible.

Les différentes façons d'exprimer une même quantité ne doivent pas produire des données différentes en base.

## Volumes

L'unité canonique de stockage des liquides est le millilitre (`ML`).

Lors de l'édition d'une recette, l'utilisateur pourra saisir un volume en centilitres ou en millilitres.

Exemples :

```text
4,5 cl  → 45 ML stockés
45 ml   → 45 ML stockés

2,25 cl → 22,5 ML stockés
22,5 ml → 22,5 ML stockés
```

L'unité choisie lors de la saisie n'est pas une caractéristique de la recette.

Elle est convertie vers l'unité canonique avant persistance.

## Affichage

L'interface française affiche par défaut les volumes en centilitres.

Exemples :

```text
45 ML stockés   → 4,5 cl
22,5 ML stockés → 2,25 cl
15 ML stockés   → 1,5 cl
5 ML stockés    → 0,5 cl
```

Une préférence d'affichage en millilitres ou dans une autre unité pourra être ajoutée ultérieurement sans modifier les données stockées.

## Agrumes

Le jus et le fruit entier sont considérés comme deux ingrédients différents.

Exemple :

```text
Jus de citron vert
Citron vert
```

Lorsqu'une recette utilise uniquement le jus, la quantité doit être enregistrée comme un volume.

Exemple :

```text
Jus de citron vert : 15 ML
```

et non :

```text
Citron vert : 0,5 PIECE
```

Une quantité en `PIECE` reste pertinente lorsque le fruit lui-même participe à la préparation.

## Ingrédients

Un ingrédient possède un nom canonique au sein de son workspace.

Les variantes de casse ou de formulation ne doivent pas créer plusieurs ingrédients représentant le même produit.

Une distinction est conservée lorsqu'il s'agit réellement de produits différents :

```text
Citron vert
Jus de citron vert
```

## Spécification d'un ingrédient

Le catalogue `Ingredient` représente des ingrédients canoniques.

Une recette peut cependant imposer ou recommander une variante, une marque ou une caractéristique particulière grâce au champ `specification`.

Exemples :

```text
Ingredient : Gin
Specification : Hendrick's

Ingredient : Tequila
Specification : Reposado 100 % agave

Ingredient : Rhum blanc
Specification : Agricole 50 %
```

La spécification appartient à l'utilisation de l'ingrédient dans une recette et ne crée pas un nouvel ingrédient canonique.

Le champ `notes` reste distinct et contient les informations techniques complémentaires.

## Unités structurées

Les quantités persistées ne sont pas stockées sous forme de texte libre.

Les unités canoniques disponibles sont :

- `ML` ;
- `G` ;
- `PIECE` ;
- `LEAF` ;
- `SPRIG` ;
- `DASH` ;
- `DROP` ;
- `BAR_SPOON` ;
- `TEASPOON` ;
- `TABLESPOON` ;
- `SCOOP` ;
- `PINCH` ;
- `TOP_UP`.

Le centilitre est une unité acceptée à la saisie et utilisée à l'affichage, mais n'est pas une unité persistée.

## Garnitures

Les garnitures restent distinctes des ingrédients entrant dans la préparation du cocktail.

Une garniture référence cependant le même catalogue d'ingrédients afin de conserver des noms cohérents.

## Alcool principal

L'alcool principal d'un cocktail référence le catalogue `Ingredient`.

Cette relation permet notamment une recherche et un filtrage cohérents.

Elle est facultative afin de permettre les cocktails sans alcool.

## Alcool par volume

Un ingrédient peut posséder un degré alcoolique par défaut.

Une utilisation dans une recette peut définir une valeur de remplacement lorsque la bouteille ou le produit utilisé possède un degré différent.

Le calcul du degré alcoolique estimé utilisera le volume précis et le degré alcoolique effectif de chaque ingrédient concerné.
