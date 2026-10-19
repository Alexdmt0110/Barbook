# Bibliothèque de cocktails

État L3 du 19 octobre 2026 : code et tests sur `feature/cocktail-folder-management`, intégration à main à valider. [Handoff courant](../project/agent-handoff.md), [contrats complets des dossiers](folder-management.md), [fiche détaillée](cocktail-detail.md) et [création](cocktail-creation.md) font référence.

## Périmètre et propriété

La bibliothèque personnelle authentifiée permet consultation, recherche par nom, filtres type/méthode/dossier/tag combinables, pagination, création et lecture d'une recette, classement dans plusieurs dossiers et tags. Les pages `/folders` et `/folders/:id` permettent création à vide, navigation, ajout/retrait local, renommage et suppression d'un dossier en conservant les recettes.

L'édition/suppression de recette, les photos privées, les favoris et la collaboration ne sont pas ajoutés par L3. Le catalogue futur ne vaut pas autorisation.

Angular appelle `/api` avec le JWT ajouté par l'interceptor. Le backend dérive le workspace via `personalOwnerId = authenticatedUserId` ; le client ne choisit ni userId ni workspaceId. Les requêtes métier et FK composites utilisent ce scope. Un workspace personnel absent est une erreur d'invariant, pas une bibliothèque vide. Les espaces partagés auront leurs propres droits et endpoints approuvés ultérieurement.

## Catalogue HTTP

`GET /api/cocktails` :

| Paramètre | Sémantique |
| --- | --- |
| search | nom contains insensible à la casse, trim, vide ignoré,120 caractères max |
| type | CLASSIC, PERSONAL_CREATION ou VARIATION |
| method | SHAKER, MIXING_GLASS, BUILD ou BLENDER |
| folderId | UUID ; traverse CocktailFolder dans le workspace, sans duplication des recettes |
| tagId | UUID ; relation CocktailTag du workspace |
| page | entier >=1,1 par défaut |
| pageSize | entier1–100,24 par défaut |

Un UUID de filtre absent ou étranger ne révèle rien : résultat vide. Les filtres se combinent avant pagination. Ordre `name ASC,id ASC` ; réponse `{items,page,pageSize,total,totalPages}`. Chaque résumé porte id/slug/name/type/family/method/glass/imageUrl/mainAlcohol, `folders:[{id,name}]`, tags et updatedAt. `folder` nullable reste une projection de compatibilité, pas la source du nouveau classement. Les cartes montrent jusqu'à trois dossiers puis le nombre restant.

Le catalogue existant utilise count/findMany dans une transaction avec l'isolation par défaut ; un instant commun sous écritures concurrentes n'est pas garanti (A016 reste ouvert). Les nouvelles pages Dossiers reviennent sur une page accessible si la dernière page disparaît. Ce fonctionnement ne promet pas un snapshot figé entre plusieurs requêtes de pagination.

## Fiche et création

`GET /api/cocktails/:slug` retrouve la recette par `(workspaceId,slug)` ; absence et recette étrangère donnent404 identique. Le détail complète le résumé avec ingrédients/garnitures/étapes ordonnés, notes, glace, ABV effectif/estimé et `organizationVersion`. Les dossiers sont des liens navigables ; les noms sont interpolés comme texte.

`POST /api/cocktails` reste séparé du classement. Le formulaire crée la recette puis ouvre sa fiche pour organiser dossiers/tags. Les quantités et ABV gardent leurs conventions existantes ; voir leurs documents dédiés. Les régressions New → new-cocktail et mainAlcoholName:null restent couvertes en HTTP et navigateur.

## Classement complet et commandes locales

```json
{"folderIds":[],"tagNames":["Classique","Agrumes"],"expectedVersion":0}
```

Ce corps remplace les appartenances et tags dans `PUT /api/cocktails/:slug/organization`. Dossiers validés entièrement dans le workspace, IDs dédupliqués, au plus 1000 entrées et 20 tags. Les tags sont trim 1–40, normalisés/dédupliqués par slug, réutilisés ou créés dans la transaction. Un nom sans slug canonique est refusé. Un tableau de dossiers vide enlève les appartenances ; les tags fournis restent enregistrés et la recette est conservée.

Le verrou de workspace est pris avant lecture de version ;409 sur brouillon périmé, sans nouveau tag ou lien partiel. Réponse `{folders,folder,tags,organizationVersion}`. La projection legacy conserve son représentant s'il reste choisi, sinon premier id déterministe ou null. Ancien payload `{folderId:null|UUID,tagNames}` accepté seulement pour zéro/un dossier ; plusieurs liens → 409 sans écrasement. Cette transition ne rend pas un ancien binaire compatible avec les nouvelles données.

Les commandes depuis un dossier ajoutent un lot borné à100 recettes ou retirent un lien précis, sans remplacer les tags ou les autres dossiers. No-op idempotent sans incrément de version ; modification réelle incrémente organizationVersion. Métadonnées du dossier protégées séparément par Folder.version. Les endpoints, erreurs, limites et suppressions sont dans [folder-management.md](folder-management.md), sans double définition de contrat.

## Frontend

`/cocktails` conserve recherche debounced300ms, filtres immédiats et pagination. Un changement de filtre revient en première page ; les filtres restent pendant la pagination. Si les catalogues de filtres échouent, le catalogue de recettes reste utilisable, avec rechargement séparé des dossiers/tags.

L'éditeur de fiche charge les dossiers via browse paginé, conserve les choix à travers recherche/pagination/création et émet la version retournée au parent. Sur409, brouillon conservé puis rechargement explicitement choisi. Les pages Dossiers utilisent recherche explicite ; le sélecteur de recettes garde ses choix entre pages et fermeture/réouverture dans la même page. Une requête annulée côté navigateur ne garantit pas qu'une mutation serveur en cours n'a pas déjà commis.

Grilles de cartes3/2/1 colonnes ; éditeur2/1 colonnes ; contrôles natifs labellisés. Tests réels Chromium desktop/mobile et captures, sans certification d'accessibilité complète ou Safari/iOS.

## Données, tests et OPS

CocktailFolder a une clé `(cocktailId,folderId)` et deux FK composites avec workspaceId, cascade des seuls liens. Les FK legacy Restrict restent présentes. Folder garde son unicité exacte `(workspaceId,name)` ; la casse est distincte. Les versions sont des entiers non négatifs contrôlés aussi en SQL.

L3 ajoute l'EXPAND historique conservé et une migration de prévalidation/backfill/versions qui refuse les ambiguïtés sans effacement. Six migrations sont qualifiées sur PostgreSQL CI jetable, avec deux ordres d'upgrade SQL, refus/rollback et drift. Rien n'est appliqué sur une base propriétaire/VPS. Les anciens écrivains devront être retirés avant une bascule réelle, qui exige son propre accord et sa qualification OPS. CONTRACT est séparé et non autorisé.

`npm --prefix backend run verify`, `npm --prefix frontend run verify`, typage E2E et `git diff --check` sont les contrôles locaux. Les tests DB/navigateur exigent les environnements jetables et commandes de [integration-tests.md](integration-tests.md). Les résultats datés et SHA sont dans le checkpoint.

Limites conservées : catalogues legacy GET folders/tags non paginés pour les anciens filtres, gestion globale des tags absente, pas de filtres multi-tags/URL persistante/drag-drop, pas de seed propriétaire, de benchmark de charge ni de production qualifiée. Ces constats ne sont pas fermés par le seul lot dossiers.
