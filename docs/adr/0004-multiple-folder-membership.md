# ADR 0004 — Appartenance multiple des cocktails aux dossiers

## Statut

Accepté.

## Contexte

Barbook permet d'organiser les cocktails d'un workspace dans des dossiers.

Le modèle initial associait directement un cocktail à un dossier facultatif :

```text
Cocktail
└── folderId?
```

Cette relation impose qu'un cocktail appartienne à zéro ou un seul dossier.

Ce modèle ne correspond pas au comportement attendu d'une bibliothèque personnelle.

Un même cocktail doit notamment pouvoir apparaître simultanément dans plusieurs collections, par exemple :

```text
Daiquiri
├── Classiques
├── Favoris
└── Carte été
```

Un dossier constitue une organisation du catalogue et non une propriété exclusive du cocktail.

Les tags remplissent un rôle différent.

Le type d'un cocktail représente une information structurelle telle que :

```text
CLASSIC
PERSONAL_CREATION
VARIATION
```

Les tags représentent des caractéristiques libres permettant notamment la recherche et le classement transversal.

Les dossiers représentent des collections choisies par l'utilisateur.

Ces trois concepts ne doivent pas être utilisés comme substituts les uns des autres.

## Décision

La relation directe :

```text
Cocktail.folderId
```

est remplacée par une relation plusieurs-à-plusieurs explicite :

```text
Cocktail
    │
    └── CocktailFolder
            │
            └── Folder
```

Un cocktail peut appartenir à zéro, un ou plusieurs dossiers.

Un dossier peut contenir zéro, un ou plusieurs cocktails.

La table de liaison stocke explicitement :

```text
workspaceId
cocktailId
folderId
```

Le couple :

```text
(cocktailId, folderId)
```

est unique.

Une même appartenance ne peut donc pas être créée plusieurs fois.

## Isolation des workspaces

Un dossier et un cocktail associés doivent appartenir au même workspace.

`CocktailFolder` stocke explicitement son `workspaceId`.

Les relations utilisent des clés étrangères composites :

```text
(workspaceId, cocktailId)
→ Cocktail(workspaceId, id)

(workspaceId, folderId)
→ Folder(workspaceId, id)
```

PostgreSQL refuse ainsi toute association entre un cocktail et un dossier appartenant à des workspaces différents.

Cette contrainte complète les contrôles d'autorisation du backend mais ne les remplace pas.

Les services restent responsables de vérifier que l'utilisateur courant possède les droits nécessaires sur le workspace concerné.

## Suppression

La suppression d'un cocktail supprime automatiquement ses relations `CocktailFolder`.

La suppression d'un dossier supprime automatiquement ses relations `CocktailFolder`.

Dans les deux cas, seule la relation d'organisation disparaît.

Supprimer un dossier ne supprime jamais les cocktails qu'il contenait.

## Renommage

Un dossier peut être renommé.

Le nom reste unique à l'intérieur d'un workspace selon la contrainte :

```text
UNIQUE(workspaceId, name)
```

La sensibilité à la casse reste celle de PostgreSQL.

Une identité de dossier insensible à la casse n'est pas introduite dans cette évolution.

## Hiérarchie

Les dossiers restent plats.

La V1 n'introduit pas :

```text
dossier parent
sous-dossier
arborescence
```

Une hiérarchie pourra être étudiée ultérieurement si un besoin réel apparaît.

## Organisation depuis un cocktail

L'organisation complète d'un cocktail est représentée par :

```text
folderIds[]
tagNames[]
```

La sauvegarde depuis la fiche cocktail remplace l'ensemble de ses appartenances aux dossiers et l'ensemble de ses tags dans une transaction.

Tous les dossiers fournis doivent appartenir au workspace du cocktail.

## Organisation depuis un dossier

La page d'un dossier permet également de gérer les relations dans l'autre sens.

Elle peut :

```text
ajouter plusieurs cocktails au dossier
retirer un cocktail du dossier
```

Ces opérations modifient uniquement les relations `CocktailFolder`.

Elles ne modifient ni la recette, ni les tags, ni les autres dossiers auxquels le cocktail appartient.

## Filtrage

Le filtre :

```text
GET /api/cocktails?folderId=<uuid>
```

est conservé.

Il sélectionne désormais les cocktails possédant une relation `CocktailFolder` vers le dossier demandé.

Le filtrage reste systématiquement limité au workspace autorisé.

Un identifiant valide appartenant à un autre workspace ne doit révéler aucune information sur ce workspace.

## Migration des données existantes

La colonne actuelle :

```text
Cocktail.folderId
```

peut déjà contenir des données.

La migration vers `CocktailFolder` doit donc préserver toutes les appartenances existantes.

La stratégie est :

```text
création de CocktailFolder
→ copie de chaque Cocktail.folderId existant vers CocktailFolder
→ vérification du backfill
→ création des contraintes relationnelles
→ suppression de l'ancienne relation Cocktail → Folder
→ suppression de Cocktail.folderId
```

La migration est transactionnelle.

Elle doit échouer plutôt que supprimer l'ancienne colonne si le backfill ne peut pas être vérifié.

## Conséquences

### Avantages

- un cocktail peut apparaître dans plusieurs collections ;
- les dossiers correspondent au comportement naturel d'une bibliothèque ;
- la relation est symétriquement manipulable depuis un cocktail ou depuis un dossier ;
- l'isolation des workspaces reste garantie par PostgreSQL ;
- supprimer un dossier ne met jamais en danger les cocktails ;
- les filtres existants peuvent conserver leur contrat HTTP ;
- le modèle reste simple et ne nécessite aucune hiérarchie.

### Inconvénients

- une table de liaison supplémentaire est nécessaire ;
- les réponses Cocktail exposent désormais une collection de dossiers plutôt qu'un dossier facultatif ;
- les requêtes Prisma doivent traverser une relation pour filtrer par dossier ;
- le frontend et le backend doivent migrer simultanément du contrat `folder` vers `folders`.

## Hors périmètre

Cette décision n'introduit pas :

```text
workspaces partagés dans l'interface
import de cocktails entre workspaces
synchronisation de recettes
sous-dossiers
drag and drop
couleurs de dossiers
ordre manuel des cocktails
```

Les workspaces partagés conserveront l'invariant général selon lequel chaque donnée métier appartient à un seul workspace.

Le comportement d'import entre workspaces sera documenté avec la fonctionnalité correspondante.
