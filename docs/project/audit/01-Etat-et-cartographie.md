> Archive de la phase A validée comme base de travail le 16 octobre 2026. Les autorisations actuelles figurent dans ../roadmap.md ; les propositions de cette archive ne valent pas accord de développement. Les états et preuves sont ceux de l’audit, à revérifier.

# Barbook — état réel et cartographie

Audit de phase A, 16 octobre 2026. Lecture seule du dépôt et des services. Base : `main@3f9dfdbd3115380960296db3c7025715d48db55c`. Comparaison : `feature/cocktail-folder-management@46321485d1d28351da7e0b555411199f40fa801a`.

## 1. Périmètre et niveau de preuve

Les cinq documents obligatoires ont été lus intégralement, ainsi que la procédure de lancement fournie. Le prompt de relais retrouvé puis joint par le propriétaire décrit la même procédure. La phase A autorise les documents de conception hors du dépôt, pas leur commit. Aucune action Git distante, aucun changement applicatif, aucune migration, aucun seed, aucun démarrage de service et aucun déploiement n'ont été effectués.

La revue porte sur les sources applicatives actuelles, les configurations, les migrations SQL, les contrats des deux côtés, les scénarios de tests, les documents et le diff intégral de la branche active. 180 fichiers de `main` sont inventoriés avec empreinte SHA-256. Les dépendances des archives ne constituent pas du code produit à réauditer ligne par ligne. Les tests ont été inspectés par scénarios et par implémentations ciblées, pas certifiés exhaustifs par un comptage de fichiers.

| Niveau | Ce qui a réellement été fait | Ce que cela ne démontre pas |
|---|---|---|
| S — statique | Lecture des sources, des SQL et des configurations ; comparaison des branches | Exécution du parcours sur une vraie base |
| C — CI observée | Lecture du run `34056468143`, de ses deux jobs et de leurs logs | Tests locaux exécutés aujourd'hui ou comportement du VPS |
| D — diagnostic local | Quatre audits npm sur lockfiles ; trois sondes sur slug/null/format numérique ; `git diff --check` | Réponse HTTP observée pour les défauts déduits du code |
| Non exécuté | `npm ci`, lint/build/suites Jest/Vitest locaux, tests PostgreSQL, navigateur, charge | Aucun résultat ne leur est attribué |
| Non accessible/vérifié | Base d'Alex, base VPS, SSH, Nginx réel, sauvegardes, TLS, DNS, migrations appliquées | Ni bon état ni panne ne sont présumés |

Les audits npm n'installent pas les dépendances et ne modifient pas les lockfiles. Les sondes utilisent le code de normalisation présent et les paramètres de formatage ; elles ne remplacent pas des tests HTTP. Le clone miroir et les snapshots servent exclusivement à la lecture. Aucun `AGENTS.md` n'est présent dans l'arbre courant inspecté.

Statuts employés : **implémentée et vérifiée** exige un parcours réellement observé ; **implémentée sans test suffisant** indique du code et parfois des tests unitaires verts en CI, sans preuve bout en bout ; **partielle**, **prévue uniquement**, **absente**, **à revoir**, **obsolète** complètent cet inventaire. Aucune fonctionnalité n'est certifiée opérationnelle en production dans cet audit.

## 2. GitHub : faits observés

| Élément | État |
|---|---|
| Dépôt | Public ; accessible avec le plugin GitHub et avec Git en lecture |
| Permissions annoncées par la connexion | `pull=true`, `push=false`, `admin=false` ; capacité d'écriture non disponible, aucune tentative effectuée |
| Branche par défaut | `main`, SHA complet indiqué en tête |
| Dernière PR intégrée | [#19 — organisation des cocktails](https://github.com/Alexdmt0110/Barbook/pull/19), mergée le 06/09/2026 à 19:57 UTC |
| PR | 19 PR listées ; 18 mergées, #15 fermée sans merge ; aucune ouverte |
| Branche active | 3 commits devant `main`, 0 derrière ; base commune = SHA de `main` |
| CI `main` | [Run 34056468143](https://github.com/Alexdmt0110/Barbook/actions/runs/34056468143), succès, événement `push`, 06/09/2026 |
| CI branche dossiers | Aucun check-run sur `46321485…` ; aucun run de cette branche dans les 16 runs listés |
| Protection | Ruleset `Protect main`, ID `22294305`, actif sur la branche par défaut |
| Règles effectives | Suppression et force-push interdits ; PR obligatoire ; 0 approbation requise ; checks `Backend Quality` et `Frontend Quality` requis ; branche à jour exigée ; connexion courante sans bypass |
| Stratégies autorisées par la plateforme | Merge, squash et rebase ; la convention de travail impose le merge commit pour les prochains travaux |
| Historique distant | Références de PR et métadonnées consultées ; les anciennes PR #1–#8 ont notamment des intégrations de type squash, donc l'absence d'ancêtre Git de leur tête ne signifie pas qu'elles sont restées ouvertes |

Branches listées :

| Branche | SHA | Classement |
|---|---|---|
| `main` | `3f9dfdbd3115380960296db3c7025715d48db55c` | Socle courant |
| `feature/cocktail-folder-management` | `46321485d1d28351da7e0b555411199f40fa801a` | Travail actif non intégré |
| `chore/dev-environment-hardening` | `1ed1c231ae8c9f83392793500c7bbb503906d8b1` | Résidu historique de PR #8 |
| `feature/authentication` | `adfcafe719d2264cf11a6774e517960a578f650c` | Résidu historique de PR #3 |
| `feature/frontend-authentication` | `2c30128bdae853b9a156f756a610a512485bc800` | Résidu historique de PR #4 |
| `archive/legacy-main` | `1d6ce1e3993059ec15b1c79e727169ab3eb91645` | Ancien squelette Angular ; 30 fichiers, routes vides |
| `archive/legacy-project` | `2466bbe5de6a7713373c9a107eba957629684965` | Ancienne architecture user-owned ; 55 380 fichiers, dont énormément de dépendances suivies |

Les archives ne sont pas une deuxième version à fusionner. L'ancien modèle comporte notamment `UserRole.ADMIN`, `CocktailType.TEMPLATE` et `isPublicTemplate`, absents du modèle courant : ce sont des références historiques, pas des fonctionnalités actuellement offertes. L'ancien health controller n'est pas non plus une preuve de healthcheck dans `main`. Aucune branche n'a été supprimée.

## 3. Ce que fait Barbook aujourd'hui

L'application est un carnet privé de recettes. Elle permet de créer un compte, de consulter un catalogue personnel, de créer une recette structurée, de lire sa fiche et de modifier son classement par un dossier facultatif et des tags. Il existe une base de modèle pour les workspaces partagés, mais aucun parcours collaboratif.

| Capacité | Statut | Preuve principale | Limite |
|---|---|---|---|
| Inscription et espace personnel | Implémentée sans test suffisant | `AuthService.register`, tests en CI | Transaction simulée dans les tests ; DB réelle non vérifiée |
| Connexion / déconnexion | Implémentée sans test suffisant | Auth backend et `AuthService` Angular | Logout local, JWT valable jusqu'à expiration |
| Expiration / retour connexion | Implémentée sans test suffisant | Guard/interceptor et leurs tests | 15 min, aucun refresh, risque de perdre une saisie |
| Limitation de débit | Implémentée sans test suffisant | `auth-rate-limit.spec.ts` utilise un vrai serveur Nest avec service mocké | Topologie Nginx réelle et IP non vérifiées |
| Accueil | Implémentée sans test suffisant | `features/home` | Page introductive authentifiée ; pas un tableau de bord |
| Liste personnelle | Implémentée sans test suffisant | `CocktailsService.findPersonalCocktails`, page `/cocktails` | Tri fixe nom/id ; pas de vue liste |
| Recherche, filtres, pagination | Implémentée sans test suffisant | DTO, service, tests Angular et backend | Nom seulement ; type/méthode/1 dossier/1 tag ; état absent de l'URL |
| Création complète | À revoir | DTO + règles + service transactionnel + formulaire | Défauts slug réservé et null ; ni photo ni classement dans le formulaire |
| Fiche recette | Implémentée sans test suffisant | `findPersonalCocktail`, composant détail | Lecture ; pas d'édition générale ni suppression |
| ABV estimé | Partielle | `calculateEstimatedAbv` et tests | Volumes ML seulement, hors dilution/garnitures ; TOP_UP rend null |
| Catalogue ingrédients | Partielle | Upsert dans la création, `GET /ingredients`, autocomplete | Pas de page de gestion, alias, fusion ni suppression |
| Tags | Partielle | Liste et création implicite dans PUT organisation | Pas de renommage/suppression globale ; listes non paginées |
| Dossiers dans `main` | Partielle | GET/POST folders, éditeur dans la fiche | 0..1 dossier ; création peu découvrable ; pas de page dédiée/renommage/suppression |
| Dossiers multiples dans la branche | Partielle | ADR 0004, migration EXPAND, double écriture | Aucun contrat `folders[]` ni écran multiple ni read switch |
| Photos | Partielle pour l'affichage ; upload absent | Champ `imageUrl`, `<img>`, placeholder | Aucun upload, stockage ni contrôle d'accès média |
| Thèmes | Implémentée sans test suffisant | Dark/light/high-contrast, service et tests | Pas de preuve visuelle actuelle ; stockage bloqué à durcir |
| Isolation workspace | Implémentée sans test suffisant | Requêtes personnelles scopées + FK composites SQL | Pas de tests DB automatisés ; pas d'API shared à considérer sécurisée |
| CI | Implémentée, exécution observée | Run GitHub et logs | Ne teste ni DB/migrations réelles ni navigateur |
| CD / exploitation | Absente dans le dépôt courant | Aucun Dockerfile applicatif, workflow CD, configuration Nginx prod ou procédure de restauration | État réel du VPS inconnu |
| Stock, coûts, batch, cartes, partage, favoris | Absente | Modèles/routes/écrans courants | Catalogue futur proposé, sans engagement d'implémentation |

## 4. Parcours actuels, de bout en bout sur le code

1. **Créer un compte** : `/register` → POST `/api/auth/register` → transaction User + PERSONAL Workspace + OWNER → token → accueil. Email trim/minuscules ; mot de passe 15–128 caractères ; nom 2–80. Conflit d'email 409. Cette chaîne n'a pas été parcourue sur DB pendant l'audit.
2. **Se connecter** : `/login` → POST login → Argon2id → JWT. Retour seulement vers une URL interne commençant par `/` et pas `//`. Erreurs 401/429 et réseau traduites.
3. **Recharger / expirer** : sessionStorage → GET `/auth/me` via guard → restauration ou logout. Un 401 privé invalide centralement la session. Il n'y a pas de renouvellement ni de révocation serveur.
4. **Consulter** : accueil → `/cocktails` → liste paginée → `/cocktails/:slug`. Recherche debouncée 300 ms ; `switchMap` annule les lectures précédentes. Erreur de dossiers/tags désactive ces filtres sans bloquer la liste.
5. **Créer** : `/cocktails/new` → formulaire cinq sections → conversion cL vers ML → transaction création ingrédients/recette/garnitures/étapes → détail. Max 50 ingrédients, 20 garnitures, 30 étapes. Aucun brouillon durable ni avertissement de sortie.
6. **Classer** : ouvrir une fiche → éditeur organisation → éventuellement créer un dossier → sélectionner un dossier et des tags → enregistrer l'ensemble. La création d'un dossier seule ne classe pas encore la recette ; le message le précise.
7. **Accès hostile** : un slug d'un autre utilisateur donne une recherche dans son propre workspace puis 404. Un folderId étranger en écriture donne 400 ; en filtre, résultat vide. Les identifiants utilisateur/workspace fournis par le client ne sont pas acceptés dans les DTO métier actuels.
8. **Mobile** : la grille passe à une colonne ; les cinq contrôles recherche/type/méthode/dossier/tag s'empilent au-dessus des cartes. C'est une preuve CSS, pas une mesure sur téléphone. Le tactile de l'autocomplete reste à vérifier dans un vrai navigateur.

## 5. Stack et modules réels

Versions résolues par les lockfiles, pas les plages du manifeste :

| Élément | Version / configuration |
|---|---|
| Angular core / CLI / build | `21.2.21` |
| Nest core / platform-express | `11.2.1` |
| Express | `5.2.1` |
| Prisma CLI / client / adapter-pg | `7.10.0` alignés |
| pg | `8.23.0` |
| Argon2 | `0.45.1` |
| TypeScript backend et frontend | `5.9.3` |
| Frontend Vitest | `4.1.11` |
| Node CI | Famille `24` ; runtime local observé `24.19.0` |
| PostgreSQL déclaré | Image `postgres:16-alpine` ; version réellement exécutée inconnue |

Pas de package npm racine. Angular standalone, routes chargées à la demande, formulaires réactifs, signals et RxJS. Nest est un monolithe modulaire simple : `AuthModule`, `CocktailsModule`, `IngredientsModule`, `PrismaModule`. Controllers fins ; règles de création séparées des accès DB. Prisma génère son client non versionné dans `backend/src/generated/prisma`.

Le frontend appelle `/api` sur la même origine logique. Le proxy Angular de développement cible localhost:3000. En production, ce rôle est prévu pour Nginx mais sa configuration n'est pas présente. `trust proxy=1` n'est correct que si la topologie et le cloisonnement réseau correspondants sont réellement imposés.

## 6. Contrat HTTP actuel

Les dates sont sérialisées en chaînes JSON côté client. Les Decimal Prisma sont convertis en nombres pour les quantités et ABV. Pas de schéma OpenAPI ou de client généré ; les interfaces sont dupliquées entre frontend et backend.

| Méthode et route `/api` | Entrée / sortie | Auth et erreurs principales |
|---|---|---|
| GET `/` | `Hello World!` | Public ; ne vérifie pas DB/disque/médias |
| POST `/auth/register` | email, password, displayName → user + accessToken ; 201 | Public ; 400/409/429 |
| POST `/auth/login` | email, password → user + accessToken ; 200 | Public ; 400/401/429 |
| GET `/auth/me` | user{id,email,displayName} | JWT ; 401 |
| GET `/cocktails` | search,type,method,folderId,tagId,page,pageSize → items/page/pageSize/total/totalPages | JWT ; 400/401/429 ; workspace absent 500 |
| POST `/cocktails` | nom/type/méthode/verre, recette, garnitures, étapes → id/slug ; 201 | JWT ; 400/409, défaut null à corriger |
| GET `/cocktails/:slug` | détail, tags, folder, estimatedAbv | JWT ; 404 si non visible |
| PUT `/cocktails/:slug/organization` | **obligatoirement** folderId UUID ou null + tagNames[] → folder/tags | JWT ; remplacement complet, transaction ; 400/404 |
| GET `/folders` | tableau id/name | JWT ; scope personnel ; aucune pagination |
| POST `/folders` | name 1–80 → id/name ; 201 | JWT ; 400/409 ; comparaison de nom sensible à la casse en DB |
| GET `/tags` | tableau id/name/slug | JWT ; aucune pagination |
| GET `/ingredients` | query 0–120 → au plus 8 suggestions | JWT ; moins de 3 caractères = [] ; 400 si invalide |

Le PUT organisation n'est pas un PATCH : omettre un champ est invalide ; envoyer `null` + tableau vide retire le classement. `imageUrl` n'est pas accepté en création. Les fonctions REST de renommage, suppression, workspaces, stock, médias et import n'existent pas actuellement.

## 7. Données et intégrité

11 modèles sur `main`, 12 dans la branche active. User possède un PERSONAL Workspace facultatif côté relation Prisma, créé normalement dans la transaction d'inscription. Une contrainte unique garantit **au plus un** personnel par utilisateur ; l'existence **d'exactement un** est garantie par le cas d'usage, pas par cette unicité seule. Un CHECK SQL lie PERSONAL à un propriétaire non nul, et SHARED à un propriétaire nul. Les CHECK SQL ne sont pas tous visibles dans le schéma Prisma : les migrations font foi.

| Relation / invariant | Garantie actuelle |
|---|---|
| User.email | Unique ; normalisation dans les DTO |
| WorkspaceMember | PK workspaceId/userId ; OWNER ou MEMBER ; pas de parcours de gestion |
| Cocktail | Unique workspaceId/slug ; index workspace/nom/type/méthode/alcool |
| Folder | Unique workspaceId/name et workspaceId/id |
| Ingredient et Tag | Unique workspaceId/slug et workspaceId/id |
| CocktailIngredient | Unique cocktailId/ingredientId et cocktailId/sortOrder |
| Quantités et ABV | Decimal(8,3), Decimal(5,2), CHECK ABV 0..100 ; quantité >0 sauf TOP_UP sans quantité |
| Garniture | Paire quantité/unité ; TOP_UP refusé par le service ; pas de CHECK SQL spécifique interdisant TOP_UP en garniture |
| Étapes | Ordre non négatif et unique par cocktail ; pas de workspaceId propre nécessaire tant que seul le parent détermine l'accès |
| Liens métier | FK composites sur workspaceId pour dossier, alcool, recette, garniture, tags |
| Suppressions | Cascade pour enfants du cocktail ; Restrict sur dossier/ingrédient référencé ; ce n'est pas un endpoint de suppression |

Migrations `main` : `20260823213342_initial_data_model`, `20260902181646_unique_recipe_ingredient`, `20260903083501_workspace_relational_integrity`. La troisième ajoute des workspaceId, rétroremplit, vérifie les relations puis impose les FK composites, dans une transaction SQL explicite. Aucune preuve de leur état appliqué sur les instances d'Alex ou du VPS n'est disponible.

## 8. Branche dossiers : état exact et reprise sûre

| Commit | Contenu |
|---|---|
| `420357d2…` | ADR 0004 : dossiers plats 0..n, suppression sans supprimer les cocktails, organisation complète depuis la fiche et opérations locales depuis un dossier |
| `c5a87663…` | Table CocktailFolder, backfill de folderId, contrôles de comptage et de présence, index et FK composites, transaction EXPAND |
| `46321485…` | PUT organisation écrit toujours folderId et remplace CocktailFolder avec 0 ou 1 lien ; assertions de mocks ajoutées |

Diff : 5 fichiers, 496 insertions, 14 suppressions. `git diff --check` ne signale pas d'erreur. Ni le schéma SQL seul ni ces assertions de mocks ne prouvent la bonne exécution d'une migration ou une concurrence correcte.

Encore absent : DTO `folderIds[]`, réponses `folders[]`, lectures et filtre basés sur CocktailFolder, page Dossiers, détail dossier paginé, sélection multiple, ajout/retrait en lot, renommage, suppression, tests réels, reconciliation finale et CONTRACT.

La branche garde volontairement la FK historique Restrict. Supprimer un dossier n'est donc pas encore rendu possible par la seule cascade de CocktailFolder. L'ancien PUT supprime tous les liens puis recrée au plus un : il ne doit plus rester accessible à un client ancien dès que plusieurs appartenances sont autorisées.

Avant read switch : recenser **tous** les écrivains, y compris l'ancienne API encore en service et les scripts ; fermer la fenêtre entre backfill et double écriture ; vérifier l'égalité exacte des ensembles, pas uniquement un nombre de lignes. Avant CONTRACT : prouver l'absence de lecteurs/écrivains anciens et approuver l'opération destructive. Pas de modification rétroactive de la migration poussée.

## 9. Index des preuves de code

Les liens suivants figent les observations, même si les branches bougent ensuite.

| Référence | Source |
|---|---|
| S01 — modèle | [schema.prisma](https://github.com/Alexdmt0110/Barbook/blob/3f9dfdbd3115380960296db3c7025715d48db55c/backend/prisma/schema.prisma) |
| S02 — SQL d'intégrité | [migration workspace](https://github.com/Alexdmt0110/Barbook/blob/3f9dfdbd3115380960296db3c7025715d48db55c/backend/prisma/migrations/20260903083501_workspace_relational_integrity/migration.sql) |
| S03 — création | [service](https://github.com/Alexdmt0110/Barbook/blob/3f9dfdbd3115380960296db3c7025715d48db55c/backend/src/cocktails/cocktail-creation.service.ts), [DTO](https://github.com/Alexdmt0110/Barbook/blob/3f9dfdbd3115380960296db3c7025715d48db55c/backend/src/cocktails/dto/create-cocktail.dto.ts), [règles](https://github.com/Alexdmt0110/Barbook/blob/3f9dfdbd3115380960296db3c7025715d48db55c/backend/src/cocktails/cocktail-creation.rules.ts) |
| S04 — lecture / ABV | [CocktailsService](https://github.com/Alexdmt0110/Barbook/blob/3f9dfdbd3115380960296db3c7025715d48db55c/backend/src/cocktails/cocktails.service.ts) |
| S05 — organisation | [service](https://github.com/Alexdmt0110/Barbook/blob/3f9dfdbd3115380960296db3c7025715d48db55c/backend/src/cocktails/organization/cocktail-organization.service.ts) |
| S06 — auth | [AuthService](https://github.com/Alexdmt0110/Barbook/blob/3f9dfdbd3115380960296db3c7025715d48db55c/backend/src/auth/auth.service.ts), [AuthModule](https://github.com/Alexdmt0110/Barbook/blob/3f9dfdbd3115380960296db3c7025715d48db55c/backend/src/auth/auth.module.ts) |
| S07 — routage | [routes Angular](https://github.com/Alexdmt0110/Barbook/blob/3f9dfdbd3115380960296db3c7025715d48db55c/frontend/src/app/app.routes.ts) |
| S08 — formulaire | [mapper](https://github.com/Alexdmt0110/Barbook/blob/3f9dfdbd3115380960296db3c7025715d48db55c/frontend/src/app/features/cocktails/cocktail-create/cocktail-create.mapper.ts), [composant](https://github.com/Alexdmt0110/Barbook/blob/3f9dfdbd3115380960296db3c7025715d48db55c/frontend/src/app/features/cocktails/cocktail-create/cocktail-create.ts) |
| S09 — bibliothèque | [HTML](https://github.com/Alexdmt0110/Barbook/blob/3f9dfdbd3115380960296db3c7025715d48db55c/frontend/src/app/features/cocktails/cocktails.html), [CSS](https://github.com/Alexdmt0110/Barbook/blob/3f9dfdbd3115380960296db3c7025715d48db55c/frontend/src/app/features/cocktails/cocktails.css) |
| S10 — détail | [composant](https://github.com/Alexdmt0110/Barbook/blob/3f9dfdbd3115380960296db3c7025715d48db55c/frontend/src/app/features/cocktails/cocktail-detail/cocktail-detail.ts) |
| S11 — CI | [ci.yml](https://github.com/Alexdmt0110/Barbook/blob/3f9dfdbd3115380960296db3c7025715d48db55c/.github/workflows/ci.yml) |
| S12 — seed | [seed.ts](https://github.com/Alexdmt0110/Barbook/blob/3f9dfdbd3115380960296db3c7025715d48db55c/backend/prisma/seed.ts) |
| S13 — transition | [ADR 0004](https://github.com/Alexdmt0110/Barbook/blob/46321485d1d28351da7e0b555411199f40fa801a/docs/adr/0004-multiple-folder-membership.md), [SQL EXPAND](https://github.com/Alexdmt0110/Barbook/blob/46321485d1d28351da7e0b555411199f40fa801a/backend/prisma/migrations/20260908095150_multiple_folder_membership_expand/migration.sql) |

Les JSON et extraits de logs dans `preuves/` complètent ces références. Ils ne contiennent pas les valeurs de configuration de l'archive ni les documents privés fournis par Alex.
