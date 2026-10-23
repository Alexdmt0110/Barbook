# L5 B5b — Design Review préventive

22 octobre 2026. Base réellement intégrée et qualifiée : `dfe39a2bd0b2f91490b8c8cd97189ee3f8b3976f`. PR32 fusionnée avec accord explicite, mergedAt `2026-10-22T11:53:03Z`, parents `94552a9` / `29c090a`, arbre `1a10f637f6cb88648d32b470f8409bd0e88c61ef`. Six contrôles post-merge success ; six journaux lus : 238 backend, 191 frontend, 160 PostgreSQL/HTTP, 4 Chromium (50,6 s), audits complets/runtime zéro. [Quality](https://github.com/Alexdmt0110/Barbook/actions/runs/39773950009), [Integration](https://github.com/Alexdmt0110/Barbook/actions/runs/39773949852), [Security](https://github.com/Alexdmt0110/Barbook/actions/runs/39773950016).

## Besoin et séquencement

Rendre les écritures de classement résistantes aux intentions obsolètes, puis remplacer le contenu d'une recette personnelle sans changer son identité, son slug, ses classements ni son image. D5 et L5-COMPAT-01B déjà validés ; aucun nouvel arbitrage métier identifié. Branche `feature/recipe-content-editing` publiée depuis le merge qualifié avant toute modification.

1. Publier ce design et le checkpoint du merge.
2. Bascule coordonnée de **tous** les writers de classement et de leurs consommateurs Angular/tests, en une unité applicative cohérente. Aucune PR intermédiaire avec API/client incompatibles.
3. Ajouter lecture/remplacement de contenu et lecteurs ABV compatibles dans une unité cohérente ; tests natifs d'atomicité, versions et isolation.
4. Revue entière, six contrôles, PR soumise à Alex. B5c et les endpoints corbeille/restauration restent les blocs suivants après merge autorisé et main qualifié.

## Contrats et frontières

Les contrats de [recipe-lifecycle](../maintenance/recipe-lifecycle.md) s'appliquent : absence/null de précondition 409, valeur fournie malformée 400, ressource indisponible/étrangère/supprimée 404 uniforme, version périmée 409 avant effet. Conserver toutes routes historiques. Pour chaque commande, acquérir le verrou Workspace existant puis relire ressources, états et versions. Aucun lookup de version actuelle pour accepter une intention ancienne.

Lots : normaliser les UUID, dédupliquer cocktailIds et exiger une entrée expectedVersions exactement par ID ; vérifier **toutes** ressources et versions avant la première écriture. Résultat added/removed conservé, tableau versions ajouté ; no-op versionné sans incrément. Organisation complète : comparer ensembles canoniques dossiers/tags avant mutation, préserver le représentant folderId quand possible, incrémenter seulement en cas de changement.

Suppression de dossier : aperçu privé dédié `GET /folders/:id/deletion-preview`, contenant Folder.version et expectedMembershipToken. Empreinte SHA-256 de `JSON.stringify` des paires `[id, organizationVersion]` triées par ID ASCII, obtenues dans un snapshot RepeatableRead avec métadonnées cohérentes. L'ensemble inclut CocktailFolder **ou** folderId legacy, même en corbeille. DELETE compare les deux préconditions sous verrou avant réparation legacy/cascade. Aucun ID privé dans le token. L'aperçu explicite évite un calcul de tous les membres sur chaque page de browse. Angular le charge sur demande de suppression, conserve l'aperçu présenté et le token lors du clic de confirmation ; conflit impose un nouvel aperçu explicite.

Contenu : `GET /cocktails/id/:id/content` et `PUT /cocktails/id/:id/content`, SessionGuard existant. Lecture expose champs éditables bruts, ID/slug, contentVersion et organizationVersion ; PUT complet exige expectedContentVersion. Corps n'accepte jamais id/workspaceId/slug/imageUrl/classement/dates. Garder bornes, unités ML/Decimal et règles de création partagées. Les garnitures et étapes sont remplacées avec le contenu dans la même transaction ; aucune relation dossier/tag/image touchée.

Chaque ligne éditable exprime `abvMode: INHERIT | OVERRIDE | UNKNOWN` : override numérique obligatoire uniquement pour OVERRIDE (0 et égal catalogue conservés), null pour les autres. Le catalogue existant n'est jamais modifié. Les références se résolvent dans le seul workspace, par nom canonique comme la création ; un ingrédient nouveau peut être créé dans la transaction sans modifier un ingrédient existant. Le degré par défaut demandé ne s'applique qu'à une nouvelle entrée de catalogue, jamais à la résolution implicite de l'override. Lecture retourne degré catalogue et override brut ; l'enregistrement inchangé conserve la sémantique. Tous lecteurs ABV doivent appliquer unknown avant activation de ce writer. Main alcohol doit toujours référencer une ligne au degré effectif positif.

Version contenu et classement indépendantes, pas de version générique supplémentaire. PUT contenu n'incrémente que contentVersion ; classement uniquement organizationVersion. Futures suppression/restauration incrémenteront les deux sans reset. Test synthétique d'un cycle SQL dans DB jetable peut vérifier l'invalidation des anciennes préconditions avant B5d, sans prétendre qualifier un endpoint de restauration encore absent.

## Responsabilités et consommateurs relus

FoldersService reste responsable des métadonnées/liens ; fonctions de préconditions et empreinte dans un module ciblé, controllers fins. CocktailOrganizationService garde canonicalisation tags et remplacement de classement. Nouveau CocktailContentService pour le seul contenu, DTO distinct avec réutilisation des contraintes de création ; pas de repository générique ni service de cycle omnibus. CocktailsService projette les sources ABV et filtre les états supprimés ; compteurs et mutations de dossier appliquent aussi l'état actif, réparation legacy sur toutes les lignes conservées.

Consommateurs : CocktailOrganizationEditor/service/models, FolderCocktailPicker, FolderDetail, FoldersService/models ; tests DTO/services/DOM ; backend folder-management, folder-organization, http-persistence et nouvelles suites ; e2e existing-journeys et fixtures L4. Inventaire par recherche de `/organization`, `/folders`, addCocktails/removeCocktail/remove, expectedVersion. Aucun client externe ou base propriétaire supposé inspecté.

Angular capture les versions avec les sélections multipages et ne les actualise pas silencieusement lors d'une recherche. 409 conserve la saisie, bloque la resoumission, propose une relecture explicite ; une réponse perdue n'entraîne aucun replay automatique. Les générations/contrôles d'identité L4 restent actifs ; anciens callbacks ne peuvent adopter un résultat d'un autre compte. Les brouillons d'édition complets seront l'adaptateur B5c du moteur L4, pas une réimplémentation ici.

## Vérifications obligatoires et risques

Unitaires : DTO absents/null/malformés, ensembles exacts/doublons, empreinte stable et sensible à chaque version, modes ABV et 0, non-inférence. HTTP/PG réels : toutes routes legacy sans/stale 409 sans effet, succès/no-op/incréments, conflits à chaque position du lot, IDs étrangers/inconnus/supprimés, rollback par vraie panne après première écriture. Concurrence : deux mêmes versions un seul gagnant, ajout/retrait contre suppression dossier, ancien token après cycle, attente PostgreSQL réellement observée. Contenu : round-trip de toutes sources ABV, slug stable et recherche au nouveau nom, autres recettes/catalogue/liens/images intacts, deux éditeurs et édition/classement indépendants, panne après remplacement partiel rollback total. Protections L4 existantes et tests de contexte/CSRF inchangés.

Angular : choix multipages/version capturée, conflit et relecture explicite, réponse tardive/réseau inconnu, aperçu de suppression et confirmation clavier. Chromium desktop/mobile sur vraie API/PG ; conserver les assertions, quotas, timeouts et retries existants. Six contrôles requis avant ready. Matrice L5-01/02/03/04/07/08 ciblée, L5-05/06/09/10 restent partielles jusqu'aux blocs suivants.

Risques : oubli d'un writer indirect, incohérence d'aperçu sous concurrence, no-op mal identifié, aplatissement ABV, identité tardive, ancien binaire ignorant unknown/corbeille. Alternatives écartées : version unique (conflits artificiels), précondition facultative/inférée (arbitrage B violé), modification du catalogue par édition (effets sur d'autres recettes), token de tous les membres dans browse (coût inutile), purge et retrait legacy (interdits). Pas de nouveau package, migration, variable, port, service ou configuration d'infrastructure. Ancien binaire non sûr après activation des nouveaux états ; retour seulement à un binaire compatible.

Git : commits atomiques et publication immédiate, checkpoint distant ; toute PR requiert accord de merge distinct. VM : aucun. SQL : fixtures/migrations existantes uniquement sur DB CI jetables gardées. Infra : aucun changement. Toutes branches historiques conservées.
