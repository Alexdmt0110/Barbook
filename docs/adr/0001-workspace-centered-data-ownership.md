# ADR 0001 — Propriété des données centrée sur les workspaces

## Statut

Accepté.

## Contexte

Chaque utilisateur de Barbook possède un espace personnel privé destiné à son propre annuaire de recettes.

Un utilisateur peut également appartenir à des espaces partagés représentant notamment un bar ou une équipe.

Par exemple, un utilisateur peut conserver ses recettes personnelles tout en accédant séparément aux recettes utilisées dans son établissement.

Rattacher directement certaines données à `User` et d'autres à `Workspace` introduirait deux modèles de propriété différents dans l'application.

Cette architecture implique également qu'une relation entre deux ressources métier ne doit jamais permettre de traverser les frontières d'un workspace.

Une validation uniquement applicative réduirait le risque, mais laisserait la base de données capable d'accepter un état incohérent en cas de bug, de script de maintenance incorrect ou de nouvelle fonctionnalité incomplètement protégée.

## Décision

Toutes les données métier appartiennent à un `Workspace`.

Deux types de workspace existent :

- `PERSONAL` : espace privé automatiquement associé à un seul utilisateur ;
- `SHARED` : espace collaboratif pouvant comporter plusieurs membres.

L'espace personnel est un détail d'architecture et n'a pas vocation à être présenté à l'utilisateur comme un workspace à sélectionner.

Dans l'expérience utilisateur, il correspond simplement à son Barbook personnel.

Les relations principales sont :

```text
User
│
├── Workspace PERSONAL
│
└── WorkspaceMember
      └── Workspace SHARED
```

Les cocktails, ingrédients, tags et dossiers sont toujours rattachés à un workspace.

Les rôles disponibles sont :

- `OWNER` ;
- `MEMBER`.

Un rôle `ADMIN` n'est pas introduit tant qu'un besoin réel ne le justifie pas.

Les relations entre ressources appartenant à un workspace utilisent des contraintes relationnelles composites lorsque cela est nécessaire.

Le couple :

```text
(workspaceId, resourceId)
```

permet à PostgreSQL de vérifier qu'une ressource référencée appartient au même workspace que la ressource qui la référence.

Cette protection est appliquée notamment aux relations suivantes :

```text
Cocktail → Folder
Cocktail → mainAlcohol Ingredient
CocktailIngredient → Cocktail
CocktailIngredient → Ingredient
GarnishIngredient → Cocktail
GarnishIngredient → Ingredient
CocktailTag → Cocktail
CocktailTag → Tag
```

Les services métier restent responsables de limiter leurs requêtes au workspace autorisé et de produire des erreurs applicatives adaptées.

La base de données constitue cependant une seconde ligne de défense et refuse les relations inter-workspaces invalides.

## Invariants

Un utilisateur possède exactement un workspace personnel.

Un workspace `PERSONAL` possède un `personalOwnerId`.

Un workspace `SHARED` ne possède pas de `personalOwnerId`.

Lors de l'inscription, l'utilisateur, son espace personnel et son membership `OWNER` sont créés dans une même transaction.

Un cocktail ne peut référencer qu'un dossier appartenant au même workspace.

L'alcool principal d'un cocktail, lorsqu'il existe, appartient au même workspace que le cocktail.

Les ingrédients d'une recette appartiennent au même workspace que le cocktail.

Les ingrédients utilisés comme garnitures appartiennent au même workspace que le cocktail.

Les tags associés à un cocktail appartiennent au même workspace que le cocktail.

Les tables de liaison qui nécessitent cette protection stockent explicitement leur `workspaceId` afin de permettre des clés étrangères composites.

## Conséquences

Les requêtes métier doivent systématiquement être limitées au workspace concerné.

Les services doivent continuer à vérifier les autorisations et ne doivent jamais considérer les contraintes PostgreSQL comme un mécanisme d'autorisation utilisateur.

Les contraintes composites empêchent toutefois qu'un bug applicatif persiste une relation entre des ressources de workspaces différents.

La navigation personnelle ne nécessite pas de sélection explicite de workspace.

Les espaces partagés seront présentés séparément dans l'interface.

Les suppressions de ressources référencées par une relation composite peuvent nécessiter un détachement explicite préalable.

Par exemple, un dossier ou un ingrédient utilisé comme alcool principal ne doit pas être supprimé implicitement tant qu'il est encore référencé.

## Migration des données existantes

Lors de l'introduction des contraintes composites, les tables suivantes contenaient déjà des données :

```text
CocktailIngredient
GarnishIngredient
CocktailTag
```

Leur `workspaceId` a donc été ajouté en plusieurs étapes :

```text
ajout nullable
→ backfill depuis Cocktail
→ vérification des données
→ passage en NOT NULL
→ création des contraintes composites
```

La migration refuse explicitement de continuer si une ligne existante ne peut pas être rattachée à un workspace ou si une relation inter-workspaces incohérente est détectée.

Cette stratégie évite d'ajouter directement une colonne obligatoire sur une table non vide et préserve les données existantes.

## Avantages

- séparation claire entre recettes personnelles et recettes d'établissement ;
- architecture de propriété unique dans le backend ;
- collaboration future sans migration majeure ;
- utilisateur pouvant appartenir à plusieurs établissements ;
- isolation explicite des données entre espaces ;
- invariant de workspace garanti à la fois par le code métier et PostgreSQL ;
- corruption relationnelle inter-workspaces rendue impossible pour les relations protégées ;
- scripts de maintenance et futures fonctionnalités bénéficiant des mêmes garde-fous que l'API.

## Inconvénients

- le modèle interne est légèrement plus complexe qu'une relation directe `User -> Cocktail` ;
- certaines tables de liaison doivent stocker explicitement `workspaceId` ;
- des contraintes uniques composites supplémentaires sont nécessaires ;
- les contrôles d'autorisation doivent toujours prendre le workspace en compte ;
- certaines suppressions doivent être réalisées explicitement plutôt que dépendre d'un `SET NULL` automatique.

## Limites

Les contraintes de base de données garantissent la cohérence relationnelle, mais ne remplacent pas l'autorisation applicative.

Une ressource appartenant au bon workspace peut toujours être inaccessible à un utilisateur qui n'est pas membre de ce workspace.

La création de workspaces partagés et les invitations ne sont pas encore implémentées.

La gestion du stock, des fournisseurs et des commandes reste hors du périmètre actuel.

La suppression d'un compte et le devenir des workspaces partagés possédés par cet utilisateur seront définis dans une fonctionnalité dédiée.
