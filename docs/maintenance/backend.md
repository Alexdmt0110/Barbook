# Backend Barbook

## Stack

Le backend Barbook utilise :

- NestJS ;
- PostgreSQL ;
- Prisma ORM ;
- JWT pour l'authentification ;
- Jest pour les tests.

L'API expose ses routes sous le préfixe `/api`.

## Architecture générale

Le backend suit une séparation simple des responsabilités :

```text
Controller
    │
    ▼
Service
    │
    ▼
PrismaService
    │
    ▼
PostgreSQL
```

Les controllers restent fins.

Ils gèrent principalement :

- les routes HTTP ;
- les paramètres ;
- l'utilisateur authentifié ;
- les décorateurs de rate limiting ;
- la délégation aux services.

Les règles métier et la traduction des erreurs prévisibles sont placées dans les services.

L'accès à PostgreSQL passe par `PrismaService`.

## Modèle de propriété

Toutes les données métier appartiennent à un `Workspace`.

Un utilisateur possède automatiquement un workspace personnel privé créé lors de son inscription.

Il pourra également appartenir à des workspaces partagés.

```text
User
│
├── Workspace PERSONAL
│
└── WorkspaceMember
      └── Workspace SHARED
```

Les ressources métier principales sont rattachées à un workspace :

- cocktails ;
- ingrédients ;
- tags ;
- dossiers.

Les relations sensibles utilisent également `workspaceId` lorsque nécessaire afin que PostgreSQL puisse garantir les invariants d'isolation entre workspaces.

## Inscription

La création d'un compte est transactionnelle.

Une inscription valide crée :

```text
User
+
Workspace PERSONAL
+
WorkspaceMember OWNER
```

Ces trois opérations doivent réussir ensemble.

Une erreur dans la transaction provoque son rollback.

## Prisma

Le schéma se trouve dans :

```text
backend/prisma/schema.prisma
```

La configuration Prisma se trouve dans :

```text
backend/prisma.config.ts
```

Le client généré se trouve localement dans :

```text
backend/src/generated/prisma/
```

Ce dossier est généré automatiquement et ne doit jamais être versionné.

## Variables de connexion

Prisma utilise les variables définies dans le fichier `.env` racine :

- `POSTGRES_USER` ;
- `POSTGRES_PASSWORD` ;
- `POSTGRES_DB` ;
- `DATABASE_HOST` ;
- `DATABASE_PORT`.

Les secrets réels ne doivent jamais être stockés dans Git.

Le fichier `.env.example` documente uniquement les variables attendues et contient des valeurs non sensibles.

## Politique des erreurs HTTP

Barbook utilise les statuts HTTP comme contrat principal entre le backend et le frontend.

Les principaux statuts sont :

```text
400 Bad Request
Requête ou données métier invalides.

401 Unauthorized
Authentification absente, invalide ou expirée.

404 Not Found
Ressource inexistante ou volontairement non visible depuis le workspace courant.

409 Conflict
Conflit métier prévisible, notamment une violation d'unicité connue.

429 Too Many Requests
Limite de requêtes atteinte.

500 Internal Server Error
Invariant serveur cassé, erreur de persistance inattendue ou panne infrastructure.
```

Le frontend ne doit pas dépendre des messages internes de Prisma.

Il doit principalement utiliser le statut HTTP et ses propres messages utilisateur.

## Politique des erreurs Prisma

Une erreur Prisma ne possède pas automatiquement une sémantique HTTP universelle.

Par exemple :

```text
P2002
Violation d'une contrainte d'unicité.

P2003
Violation d'une contrainte de clé étrangère.

P2025
Opération dépendant d'un enregistrement requis introuvable.
```

Barbook ne réalise donc pas de mapping global du type :

```text
P2002 -> 409
P2003 -> 400
P2025 -> 404
```

Un même code Prisma peut représenter :

- une erreur utilisateur prévisible ;
- un conflit métier ;
- une race condition ;
- un invariant interne cassé ;
- un bug applicatif.

La traduction HTTP est donc effectuée uniquement lorsque le service possède suffisamment de contexte métier.

### P2002 actuellement pris en charge

Deux cas de concurrence sont explicitement gérés.

#### Inscription

L'adresse email est vérifiée avant la création du compte.

Cette vérification améliore l'expérience utilisateur mais ne suffit pas à garantir l'unicité en présence de requêtes concurrentes.

La contrainte PostgreSQL reste la source de vérité.

Si Prisma renvoie `P2002` pendant la transaction d'inscription, `AuthService` traduit l'erreur en :

```text
409 Conflict
```

avec un message indiquant qu'un compte existe déjà avec cette adresse.

#### Création d'un cocktail

Le slug du cocktail est vérifié avant la transaction dans le workspace personnel.

La contrainte :

```text
UNIQUE(workspaceId, slug)
```

reste néanmoins la garantie définitive contre une création concurrente.

Un `P2002` correspondant à ce scénario est traduit par `CocktailCreationService` en :

```text
409 Conflict
```

### Détection technique commune

La détection technique des erreurs Prisma connues est centralisée dans :

```text
backend/src/common/prisma-errors.ts
```

Cet utilitaire vérifie uniquement :

- que l'objet est réellement une `PrismaClientKnownRequestError` ;
- que son code correspond au code demandé.

Il ne contient :

- aucune logique métier ;
- aucun message utilisateur ;
- aucune dépendance à NestJS ;
- aucun mapping HTTP global.

Les services restent responsables de la signification métier de l'erreur.

## Erreurs inattendues

Une erreur Prisma inconnue ou une erreur de base de données qui ne correspond pas à un scénario métier explicitement prévu ne doit pas être transformée artificiellement en erreur client.

Elle reste une erreur serveur.

Le backend ne doit jamais construire une réponse publique contenant volontairement :

- une requête SQL ;
- un nom de contrainte interne inutile ;
- une stack trace ;
- une chaîne de connexion ;
- un détail Prisma sensible.

Les erreurs infrastructure doivent rester distinguables des erreurs provoquées par une requête utilisateur invalide.

## Catalogue d'ingrédients

Les ingrédients sont normalisés au niveau du workspace.

Une recette référence un `Ingredient` canonique et peut ajouter une `specification` lorsqu'elle demande une marque, un style ou une caractéristique particulière.

Exemple :

```text
Ingredient : Gin
Specification : Hendrick's
```

La création d'un cocktail peut réutiliser un ingrédient canonique existant.

Elle ne doit pas modifier silencieusement les propriétés d'un ingrédient déjà présent dans le catalogue.

Un catalogue structuré de bouteilles ou produits pourra être introduit ultérieurement avec la gestion de stock.

## Quantités

Les liquides sont persistés en millilitres.

Les unités métier sont définies par `MeasurementUnit`.

Les quantités saisies dans l'interface sont converties vers le format attendu par le backend avant leur persistance.

## Isolation des workspaces

Une ressource appartenant à un workspace ne doit jamais être reliée à une ressource métier d'un autre workspace.

Cette règle est protégée à plusieurs niveaux :

```text
validation applicative
+
requêtes Prisma scoped par workspace
+
contraintes PostgreSQL
```

La base de données constitue la dernière ligne de défense contre une violation d'intégrité.

## Transactions

Une transaction doit être utilisée lorsqu'un cas d'usage nécessite plusieurs écritures qui doivent réussir ou échouer ensemble.

Les principaux exemples actuels sont :

- inscription d'un utilisateur ;
- création complète d'un cocktail et de sa recette.

Une transaction ne doit pas être introduite sur une simple lecture sans raison particulière.

## Workflow de migration en développement

Depuis `backend` :

```powershell
npx prisma format
npx prisma validate
npx prisma migrate dev --name nom-migration --create-only
```

La migration SQL générée doit être inspectée avant son application.

Une fois validée :

```powershell
npx prisma migrate dev
npx prisma generate
npx prisma migrate status
```

Les migrations présentes dans :

```text
backend/prisma/migrations/
```

sont versionnées dans Git.

## Workflow de migration en production

Une migration déjà versionnée ne doit jamais être recréée avec `migrate dev` sur le serveur de production.

Le déploiement utilisera :

```powershell
npx prisma migrate deploy
```

Les migrations doivent être appliquées avant de considérer la nouvelle version du backend comme disponible.

## Politique de modification des migrations

Une migration déjà partagée, fusionnée ou appliquée sur un environnement distant ne doit jamais être modifiée rétroactivement.

Toute évolution ultérieure du modèle doit produire une nouvelle migration.

## Vérification du backend

La commande de référence est :

```powershell
npm run verify
```

Elle doit réussir avant chaque Pull Request backend.

Elle couvre notamment :

- lint ;
- build ;
- tests Jest ;
- validation Prisma.

Les tests doivent couvrir les comportements métier importants ainsi que les chemins d'erreur prévisibles.

## État actuel

Le backend utilise Prisma au runtime pour :

- l'authentification ;
- les workspaces personnels ;
- la bibliothèque de cocktails ;
- le détail des cocktails ;
- la création des cocktails ;
- la résolution du catalogue d'ingrédients ;
- la recherche d'ingrédients.

Les principaux invariants d'isolation des workspaces sont également protégés au niveau PostgreSQL.

Les prochaines évolutions fonctionnelles prévues concernent notamment :

- recherche et filtrage de la bibliothèque ;
- organisation par tags et dossiers ;
- gestion des images ;
- tests de parcours critiques ;
- préparation du déploiement de production.
