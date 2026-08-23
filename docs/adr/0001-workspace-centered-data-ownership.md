# ADR 0001 — Propriété des données centrée sur les workspaces

## Statut

Accepté.

## Contexte

Chaque utilisateur de Barbook possède un espace personnel privé destiné à son propre annuaire de recettes.

Un utilisateur peut également appartenir à des espaces partagés représentant notamment un bar ou une équipe.

Par exemple, un utilisateur peut conserver ses recettes personnelles tout en accédant séparément aux recettes utilisées dans son établissement.

Rattacher directement certaines données à `User` et d'autres à `Workspace` introduirait deux modèles de propriété différents dans l'application.

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

## Invariants

Un utilisateur possède exactement un workspace personnel.

Un workspace `PERSONAL` possède un `personalOwnerId`.

Un workspace `SHARED` ne possède pas de `personalOwnerId`.

Lors de l'inscription, l'utilisateur, son espace personnel et son membership `OWNER` devront être créés dans une même transaction.

## Conséquences

Les requêtes métier devront systématiquement être limitées au workspace concerné.

Les services devront empêcher toute relation entre des ressources appartenant à des workspaces différents.

La navigation personnelle ne nécessitera pas de sélection explicite de workspace.

Les espaces partagés seront présentés séparément dans l'interface.

## Avantages

- séparation claire entre recettes personnelles et recettes d'établissement ;
- architecture de propriété unique dans le backend ;
- collaboration future sans migration majeure ;
- utilisateur pouvant appartenir à plusieurs établissements ;
- isolation naturelle des données entre espaces.

## Inconvénients

- le modèle interne est légèrement plus complexe qu'une relation directe `User -> Cocktail` ;
- les contrôles d'autorisation doivent toujours prendre le workspace en compte ;
- certaines contraintes inter-workspaces devront être contrôlées par les services métier.

## Limites

La création de workspaces partagés et les invitations ne sont pas encore implémentées.

La gestion du stock, des fournisseurs et des commandes reste hors du périmètre actuel.

La suppression d'un compte et le devenir des workspaces partagés possédés par cet utilisateur seront définis dans une fonctionnalité dédiée.
