# L3 — Design Review et contrats

Statut : plan technique retenu dans le périmètre B3a–B3c autorisé le 19 octobre. Ce plan a précédé le code ; B3a–B3c est maintenant réalisé et qualifié au commit b0bb7574e373a2876b93cf67abf22f671ae7fca3. Les preuves et limites actuelles sont dans checkpoint-l3.md, pas déduites du seul plan. F023/F024 font foi pour les critères métier ; ce document précise les contrats et limites techniques. D1–D8 restent ouvertes, CONTRACT/production et merge de la future PR L3 exclus.

## Responsabilités et blocs cohérents

| Bloc | Fichiers / responsabilités | Critère de passage |
| --- | --- | --- |
| Baseline | Branche dossiers existante + workflows Quality/Integration/Dependency Security | trois commits historiques conservés, socle fusionné, six checks avant code nouveau |
| Données | schema.prisma, nouvelle migration additive, tests migrations/contraintes | fresh et deux ordres EXPAND/contrainte garniture ; aucune réparation destructive implicite |
| Organisation | DTO/service/types d'organisation, CocktailsService lectures/filtre, tests HTTP/unitaires | folders[], version attendue, ancien payload sûr, atomicité et isolation réelles |
| Gestion dossiers | FoldersService/Controller et DTO propres ; retirer les responsabilités dossier du service d'organisation | browse paginé, lecture/renommage/suppression, ajout/retrait local, transactions et erreurs prouvées |
| UI | modèles/services de données, éditeur de classement, cartes, navigation et pages Dossiers | multi-sélection, sélection à travers pages, états/erreurs/conflits, clavier/mobile et E2E réels |
| Livraison | docs, Review Gate de toute la branche, vraie PR/diff/CI/handoff | aucun BLOCKER/P1 du diff ; merge L3 à demander séparément |

Un commit par bloc cohérent et vert, publication immédiate et checkpoint distant. Pas d'extraction générique de repository/transaction ni de refonte globale. Les noms Prisma actuels sont Cocktail.folderMemberships, Folder.memberships et CocktailFolder ; les contrôles serveur dérivent toujours le workspace de l'utilisateur authentifié.

## Migration et fenêtre legacy

L'EXPAND partagé copie folderId à un instant. Un ancien écrivain peut ensuite laisser un lien obsolète avant activation du dual-write. La nouvelle migration ne devine pas quelle association est légitime : si un lien existant ne correspond pas à l'unique folderId legacy, elle refuse transactionnellement, sans effacer de lien. Cela couvre aussi un ensemble multiple inattendu. Une base réelle ambiguë devra être inventoriée/réconciliée avec son propriétaire avant application autorisée.

Si le lien legacy est simplement manquant, insertion idempotente du couple (workspaceId,cocktailId,folderId). Ajouter Cocktail.organizationVersion et Folder.version, entiers NOT NULL DEFAULT 0, CHECK >=0. Aucun retrait de champ, renommage d'ancienne migration, reset ou seed de propriétaire. Nouvelle migration appliquée seulement en CI jetable ici.

Tester les deux upgrades : main avec contrainte garniture d'octobre puis EXPAND de septembre, ou EXPAND puis contrainte ; la nouvelle migration vient ensuite. Tester refus avec conservation des lignes et absence de DDL partiel, réparation explicite de fixture puis retry. Fresh deploy/redeploy/statut/drift restent obligatoires.

Déploiement ultérieur : aucun ancien binaire incompatible ne doit continuer d'écrire après introduction d'appartenances multiples. L'ancien payload peut être géré par le nouveau serveur, pas par un ancien serveur ignorant ces règles. La bascule, le quiescement éventuel et le rollback nécessiteront leur propre qualification OPS/D7 ; aucun système de flags ou CD n'est activé dans ce lot.

## Organisation et compatibilité API

Lectures catalogue/détail : ajouter folders: {id,name}[], conserver folder nullable pour les clients de transition. Le détail expose organizationVersion. Le filtre folderId traverse CocktailFolder sans dupliquer les recettes. L'ancienne colonne reste une projection représentative stable, jamais la propriété exclusive : conserver le représentant s'il appartient encore à l'ensemble, sinon choisir un id déterministe ou null.

PUT /cocktails/:slug/organization nouveau : {folderIds: UUID[], tagNames: string[], expectedVersion: entier >=0}. Tableau vide valide, null invalide. Refuser mélange folderId/folderIds et version absente pour le nouveau contrat. Dédupliquer les IDs validés. Une saisie périmée renvoie409 sans modifier dossiers, tags ou catalogue de tags. Sauvegarde complète incrémente organizationVersion ; le frontend conserve sa saisie sur conflit et propose un rechargement explicite.

L'ancien payload {folderId:null|UUID,tagNames} reste compatible uniquement pour zéro/un dossier. Dès qu'un cocktail appartient à plusieurs dossiers, le refuser en409 plutôt qu'effacer l'ensemble. Une version legacy fournie reste contrôlée. Tous les dossiers sont validés dans le workspace avant remplacement atomique des liens et tags.

Limites de requête techniques retenues :1000 IDs pour un remplacement complet,100 IDs par commande d'ajout en lot,20 tags comme aujourd'hui. Ce ne sont pas des listes silencieusement tronquées ; au-delà,400 explicite. Les commandes locales permettent des ajouts/retraits bornés ; les limites sont documentées et testées. Aucun sous-dossier, drag/drop, rôle partagé ou copie inter-workspace ajouté.

## Concurrence et persistance

Les mutations d'organisation/dossiers prennent d'abord un verrou de ligne du workspace via SELECT FOR NO KEY UPDATE paramétré, puis lisent/contrôlent les versions dans cette transaction. Un petit helper de persistance est partagé par les deux services ; aucune attente utilisateur/réseau externe dans la transaction. Le verrou sérialise ces mutations d'un espace personnel ; la version détecte les brouillons périmés, ce que le verrou seul ne fait pas.

La [matrice officielle PostgreSQL16](https://www.postgresql.org/docs/16/explicit-locking.html#LOCKING-ROWS) confirme que ce mode se bloque mutuellement tout en restant compatible avec KEY SHARE. L'ordre unique évite de multiplier les protocoles de verrouillage de cocktails/dossiers dans les commandes en lot. Cette granularité est proportionnée au carnet personnel ; mesurer avant de la raffiner pour une collaboration future.

Incrémenter organizationVersion lors d'un ajout/retrait réellement effectué ou d'une suppression de dossier affectant une recette. Un no-op idempotent ne change pas cette version. Folder.version couvre ses métadonnées et protège renommage/suppression ; un simple renommage ne modifie ni recette, ni tags, ni versions d'organisation des cocktails. Les FK composites restent la protection SQL contre les liens étrangers.

## API de gestion des dossiers

| Endpoint | Contrat et comportement |
| --- | --- |
| GET/POST /folders | conserver le catalogue legacy [{id,name}] et création trim1–80, unicité exacte workspace+name selon ADR4 ; pas de changement silencieux de casse |
| GET /folders/browse | route statique avant :id, page/recherche/ordre name,id ; pageSize25/max100 et borne de page validée ; {items,total,page,pageSize,totalPages}, comptes de recettes et versions |
| GET /folders/:id | détail versionné et nombre de recettes ; UUID invalide400, dossier absent/étranger404 uniforme |
| PATCH /folders/:id | {name,expectedVersion}, conflit de nom/version409 sans changement partiel |
| DELETE /folders/:id?expectedVersion=N | version entière requise ; uniquement dossier et liens, jamais recettes/tags/ingrédients ; confirmation UI explicite |
| POST /folders/:id/cocktails | {cocktailIds:UUID[]}, lot borné, dédupliqué, validation complète ou rollback, ajout idempotent sans toucher les autres dossiers/tags |
| PUT /folders/:id/cocktails/:cocktailId | ajout local idempotent d'une recette, mêmes garanties de scope |
| DELETE /folders/:id/cocktails/:cocktailId | retrait local idempotent, contrôler l'accès aux deux ressources ; autres appartenances conservées |

Ne pas mettre deux shapes de réponse conditionnelles sur le même GET. Le catalogue legacy reste compatible ; le nouveau browse est paginé. Réutiliser GET /cocktails?folderId pour les recettes du dossier. Les ajouts en lot sont groupés, pas un N+1 par recette.

Avant suppression, l'ancienne FK Restrict exige de corriger la projection folderId des recettes affectées vers un lien restant ou null, puis supprimer le dossier dans la même transaction ; CocktailFolder cascade uniquement les liens. Utiliser une mise à jour SQL groupée/paramétrée et incrémenter les versions affectées. Panne injectée : toute la suppression doit rollback. Aucun DELETE de migration pour simuler cette action métier.

## Frontend et tests

Onglet Dossiers, index paginé/recherche/création, détail avec catalogue filtré, renommage/suppression, choix de plusieurs recettes à travers pagination, retrait local. États vide/chargement/erreur/404/409, noms échappés, labels et clavier, largeur390px. Réutiliser styles/composants pertinents sans créer un framework de sélection générique. Une confirmation native de suppression est préférable à un faux modal sans gestion du focus.

La fiche permet plusieurs dossiers et l'ajout d'un nouveau dossier sans effacer les sélections précédentes. Les cartes et filtres utilisent folders[]. La réponse et le parent portent la nouvelle version ; ne pas écraser un brouillon pendant un simple rafraîchissement de catalogue. Sur409, conserver la saisie puis recharger explicitement le classement si l'utilisateur le choisit. Les anciens champs demeurent de compatibilité, pas de référence du nouveau parcours.

Tests natifs requis : FK CocktailFolder hostiles en SQL, versions/CHECK, deux ordres de migration et ambiguïtés ; deux sauvegardes avec même version donnent une200/une409, sans fusion/perte silencieuse ; ancien client409 devant plusieurs dossiers ; lot étranger rollback ; ajouts/retraits idempotents et conservation autres liens/tags ; suppression dossier garde les recettes et corrige la FK legacy ; rollback sur panne DB ; filtrage et comptes sans doublons.

Adapter les quatre essais Chromium desktop/mobile existants en réutilisant leurs comptes pour garder le quota d'inscription réel (actuellement quatre inscriptions, limite cinq). Deux dossiers, sauvegarde/relecture/filtres, reconnexion, création New, navigation/ajout/retrait/renommage/suppression sans perte, JWT expiré. Aucun mock HTTP, retry de masquage ou limite d'auth désactivée. Captures de succès à conserver pour inspection si récupération des artefacts disponible ; distinguer contrôles automatiques et revue visuelle réelle.
