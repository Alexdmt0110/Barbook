# Classement et dossiers — contrats L3

État de livraison : suivre le [handoff](../project/agent-handoff.md) et la CI de la branche ; les blocs suivants ne sont pas tous livrés au même commit. Le [design](../project/l3-design.md) précise le périmètre B3a–B3c. CONTRACT et toute base propriétaire/production restent exclus.

## Classement d'une fiche

Les lectures `/api/cocktails` et `/api/cocktails/:slug` exposent `folders: [{id,name}]`, ordonnés par id. Le détail porte `organizationVersion`. `folder` reste une projection nullable pour la transition, conservée tant que son id fait partie de l'ensemble, sinon remplacée par le premier id ou null. Le nouveau frontend doit utiliser `folders`.

`PUT /api/cocktails/:slug/organization` :

```json
{"folderIds":[],"tagNames":[],"expectedVersion":0}
```

Remplacement atomique de tous les liens et tags, IDs dédupliqués/canonicalisés en minuscules. Au plus1000 IDs UUID et20 tags trim1–40. Tableau vide valide ; null, mélange folderId/folderIds, version absente/nulle/non entière/négative ou champ inconnu refusés400. Un dossier indisponible dans l'espace personnel renvoie400 ; cocktail absent/étranger404 identique. Workspace déduit de la session, jamais du corps.

Une sauvegarde complète réussie incrémente `organizationVersion` et renvoie `{folders,folder,tags,organizationVersion}`. Une version périmée donne409 avant toute création de tag ou modification des liens ; recharger explicitement avant de réessayer, conserver le brouillon UI. Les mutations de classement prennent d'abord un verrou transactionnel de workspace ; aucun mécanisme côté navigateur ne remplace ce contrôle serveur.

Ancien corps `{folderId:null|UUID,tagNames:[]}` : accepté pour zéro/un lien seulement. Avec plusieurs liens,409 sans mutation afin d'éviter une perte silencieuse. S'il fournit expectedVersion, elle est contrôlée. Ceci protège les anciens clients utilisant le **nouveau serveur**, pas un ancien serveur ; les anciens écrivains incompatibles devront être retirés lors d'une future bascule autorisée.

Le filtre `GET /api/cocktails?folderId=UUID` traverse les appartenances, se combine avec les filtres existants, ne duplique pas les recettes et reste limité au workspace.

## Qualification

`folder-organization.e2e-spec.ts` utilise le vrai pipeline HTTP et PostgreSQL : zéro/un/multi, versions, déduplication/UUID en majuscules, filtres, protections legacy, ensemble étranger sans écriture, contrats invalides et deux sauvegardes simultanées (une200/une409 et aucun tag orphelin). Les tests de rollback existants restent actifs. Les nouvelles migrations et leurs précautions sont décrites dans [integration-tests.md](integration-tests.md).

## Gestion des dossiers

`GET /api/folders` conserve le catalogue legacy `[{id,name}]` ; `POST` crée un nom trim1–80, unicité exacte par workspace (la casse reste distincte),201 ou409. La création ne nécessite aucune recette.

| Commande | Entrée / résultat |
| --- | --- |
| GET /api/folders/browse | search trim/max120, page1–1000000, pageSize25 par défaut/max100 ; `{items,total,page,pageSize,totalPages}`, items `{id,name,version,cocktailCount}` ; ordre name,id, snapshot repeatable-read pour compte/page |
| GET /api/folders/:id | détail avec version et compte de recettes |
| PATCH /api/folders/:id | `{name,expectedVersion}` ; nom et version actualisés,409 nom existant ou brouillon périmé |
| DELETE /api/folders/:id?expectedVersion=N | version entière obligatoire ;200 `{deleted:true}` ; détache et supprime seulement le dossier, aucune recette/tags/ingrédients |
| POST /api/folders/:id/cocktails | `{cocktailIds:UUID[]}` de1 à100 entrées, doublons dédupliqués ;200 `{added:N}` |
| PUT /api/folders/:id/cocktails/:cocktailId | ajout local idempotent ;200 `{added:0|1}` |
| DELETE /api/folders/:id/cocktails/:cocktailId | retrait local idempotent ;200 `{removed:0|1}`, autres dossiers et tags conservés |

ID mal formé400 ; dossier ou recette valide absent/étranger404 uniforme. Un lot contenant un id indisponible échoue entièrement404. Les ajouts et retraits vérifient les deux ressources même en cas de no-op. Mutation de liens réelle → organizationVersion incrémentée, no-op → inchangée. Folder.version protège le nom et la suppression ; les modifications d'appartenance ne l'incrémentent pas. Un renommage ne modifie pas les versions des recettes.

Toutes ces mutations prennent le même verrou workspace que l'organisation. La suppression effectue une seule mise à jour SQL paramétrée des recettes concernées, choisit un représentant restant si nécessaire, puis supprime le dossier ; la FK legacy Restrict reste présente. Les liens cascade, les recettes restent. Un échec fait rollback des compteurs et projections avec les liens. Pas de N+1 d'écritures pour le lot ou la suppression.

Les commandes locales sont additives/retrait précis, sans remplacement global ni version de recette exigée ; un ancien brouillon complet détecte ensuite leur modification avec sa version. Pour un réseau interrompu après commit, répéter l'ajout/retrait est sûr ; en cas de suppression ou renommage ambigu, recharger le détail avant de poursuivre.

`folder-management.e2e-spec.ts` exerce CRUD, trim/casse/doublon/concurrence, pagination/absence/isolation, lot hostile, idempotence/versions, conservation des recettes/tags/autres dossiers, rollback par panne DB et suppression concurrente avec ajout. Les tests tournent uniquement dans la base jetable gardée ; aucun appel sur une base propriétaire.

## Interface de classement

La fiche montre les liens de tous ses dossiers ; les cartes en montrent jusqu'à trois puis le nombre restant. L'éditeur utilise browse par pages25, recherche explicite et cases à cocher. Les choix restent dans le brouillon à travers recherche/pagination ; créer un dossier l'ajoute aux choix existants et nécessite encore Enregistrer pour classer la recette. Les tags conservent leur catalogue legacy (dette de pagination future, pas déclarée close).

Sur409, brouillon conservé et sauvegarde bloquée jusqu'au rechargement explicite « Recharger et remplacer le brouillon ». Un rechargement échoué ne supprime pas la saisie ; une réussite utilise la dernière version et met à jour le parent. La création d'un dossier n'enlève aucun choix précédent. Tests DOM + quatre parcours Chromium enrichis qualifient les sélections/versions ; voir la CI du head, les captures ne valent pas revue visuelle manuelle.

## Pages Dossiers

L'onglet Dossiers ouvre l'index (pages25, recherche explicite, création sans recette). Chaque carte donne le nombre de recettes et ouvre un dossier par UUID. Dans le détail, renommer et supprimer utilisent la version de métadonnées observée. La confirmation de suppression dit explicitement que recettes, tags et autres dossiers sont conservés. Sur409, la saisie reste ; recharger remplace le nom et sa version. Actualiser un compte de recettes ne rajeunit pas silencieusement la version d'un brouillon de renommage.

Le sélecteur « Ajouter des cocktails » charge le catalogue par pages12, permet recherche et choix sur plusieurs pages (100 max par ajout), et désactive les recettes déjà présentes. Les choix restent en mémoire à la fermeture/réouverture dans cette page, se vident après réussite, et restent après échec ; répéter l'ajout est idempotent côté serveur. Retirer dans la liste touche seulement ce dossier, sans confirmation destructive de recette. Les requêtes d'une ancienne route sont annulées côté UI ; cela ne promet pas l'annulation d'une mutation déjà commise côté serveur. Revenir/recharger permet de retrouver son état réel.

Les tests UI couvrent chargements/réseau, saisies/conflits, confirmation, pagination diminuée, route réutilisée et sélection persistante. Les parcours Chromium utilisent deux vraies pages de candidats, testent les trois thèmes et conservent des captures sous l'artefact7 jours ; le handoff dit lesquelles ont été effectivement inspectées.
