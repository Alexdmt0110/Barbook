# Cycle de recette et préconditions — contrats L5

## État d’activation

**État courant23octobre2026 : B5a/B5b intégrés dans main58461d1 après merges32/33 autorisés et sixchecks post-merge vérifiés.** Contrats de contenu et préconditions de classement ci-dessous actifs dans ce code intégré ; aucun déploiement. Interface complète et brouillons d'édition qualifiés sur branche B5c/code0a89c05, PR34,219frontend/261backend/187PG-HTTP/8Chromium, sixchecks et audits0. Le merge34 reste soumis à Alex. Corbeille/restauration B5d/e non activées ; D5 reste un contrat à livrer, pas un effacement physique. La photographie B5b ci-dessous est historique.

**Sur la branche B5b `feature/recipe-content-editing`, PR33**, la bascule coordonnée API/Angular des préconditions et les endpoints de contenu sont implémentés. Code830c47d qualifié : sixchecks/sixlogs261backend/192frontend/187PG-HTTP/4Chromium/audits0 ; [Gate et limites](../project/reviews/l5-b5b-review-gate.md). B5a est intégré sur main `dfe39a2` ; B5b attend les checks du dernier checkpoint documentaire puis un accord de merge distinct. Les endpoints corbeille/restauration et l'interface d'édition/brouillons restent B5c–e. Aucune purge/archivage/média/collaboration. D5 validée, [DesignReview B5b](../project/l5-b5b-design.md).

## Contrat de contenu B5b

GET `/api/cocktails/id/:id/content` renvoie `{id, slug, contentVersion, organizationVersion, content}` dans un snapshot RepeatableRead cohérent. `content` contient name/type/family/method/glass/ice/notes/mainAlcoholName, ingredients, garnishes et steps. PUT à la même URL reçoit ces champs de contenu et expectedContentVersion (jamais l'enveloppe de lecture). Les contraintes de création sont réutilisées ; id/workspaceId/slug/imageUrl/folderIds/tagNames/dates/contentVersion sont refusés. Main alcohol référence une ligne dont le degré effectif est positif.

Chaque ingrédient contient ingredientName, ingredientDefaultAbv, amount, unit, specification, notes, **abvMode obligatoire INHERIT/OVERRIDE/UNKNOWN**, et abvOverride. OVERRIDE exige un nombre, y compris0 ou égal au catalogue ; les autres modes exigent l'absence/null d'override. ingredientDefaultAbv ne s'applique qu'à une nouvelle entrée du catalogue, jamais à une entrée existante ni à l'inférence d'un override. Lecture renvoie le défaut catalogue actuel et l'override brut. Le détail historique traite explicitement UNKNOWN comme degré absent ; aucune création existante n'accepte directement abvUnknown.

PUT verrouille Workspace puis relit la recette active et compare contentVersion ; une transaction couvre résolution/création d'ingrédients, remplacement des lignes/garnitures/étapes et incrément de contenu seul. Aucune écriture de slug, workspace, dossiers, tags, image ou catalogue existant. Une saisie identique vérifie la version et conserve même les identifiants des lignes et updatedAt. Collision concurrente de catalogue :409 et rollback intégral, aucun replay automatique. Les versions sont bornées à l'entier PostgreSQL ; la capacité épuisée refuse la modification sans remise à zéro.

Les lecteurs catalogue/détail utilisent un snapshot RepeatableRead et excluent les recettes supprimées ; les compteurs de dossiers ne comptent que les actives. Une ligne conservée en corbeille reste néanmoins incluse dans la précondition et la réparation d'un dossier supprimé. Le cycle serveur complet reste à implémenter et qualifier en B5d.

## Aperçu de suppression de dossier B5b

GET privé `/api/folders/:id/deletion-preview` renvoie id/name/version/expectedMembershipToken sous RepeatableRead. Le token est SHA-256 du JSON des paires `[id, organizationVersion]` triées par ID ASCII, pour l'union des liaisons CocktailFolder et du représentant legacy folderId, toutes lignes conservées incluses. DELETE requiert expectedVersion et expectedMembershipToken dans la query. Après verrou, toute différence refuse409 sans réparation ni cascade. L'UI charge cet aperçu puis demande confirmation avec le nom présenté ; cliquer à nouveau après conflit crée un nouvel aperçu explicite. Aucune collecte de toutes les recettes sur les pages browse.

Les sélections Angular stockent la version observée avec chaque ID, y compris hors page. Un rafraîchissement de recherche ne remplace pas ces versions. Après409 ou réseau/5xx incertain, sélection conservée et renvoi bloqué jusqu'à abandon explicite de l'ancienne intention et nouvelle sélection. Aucun replay automatique, aucun force-save. Les réponses restent filtrées par les générations d'authentification L4.

## Versions indépendantes et cycle

contentVersion commence0, distingue les remplacements complets de contenu. organizationVersion existante distingue le classement. Un contenu modifié laisse la version de classement inchangée, et réciproquement. Supprimer/restaurer incrémente **les deux**, sans remise à zéro, sous le même verroutransactionnel. ID/workspace/slug ne changent jamais. Chaque commande vérifie l’état et ses versions attendues après attente du verrou Workspace ; un no-op conserve ses compteurs mais n’évite pas la vérification.

## Préconditions de classement — cible de la bascule

| Route conservée | Précondition cible obligatoire |
| --- | --- |
| PUT /api/cocktails/:slug/organization | expectedVersion dans le corps, y compris avec ancien folderId ; protège organizationVersion |
| POST /api/folders/:id/cocktails | cocktailIds inchangé et expectedVersions: [{cocktailId,expectedVersion}] dans le corps |
| PUT /api/folders/:id/cocktails/:cocktailId | expectedVersion dans la query, entier canonique ; version de recette et non Folder.version |
| DELETE /api/folders/:id/cocktails/:cocktailId | même query expectedVersion |

Lot :1–100 IDs UUID ; canonicalisation, déduplication des cocktailIds comme avant ; expectedVersions couvre exactement une fois chaque IDnormalisé (aucun surplus/doublon). Chaque expectedVersion protège la version d’organisation de cette recette, pas celle du dossier. Missing préconditionglobale/entrée individuelle/null→409sans effet ; valeur fournie mais mal typée/négative/non entière, IDs invalides ou ensemble ambigu→400sans effet. Version périmée→409sans effet. Aucun défaut0ni lookup de version courante pour rajeunir une intention.

Après auth/CSRF/contexte et validation des types, vérifier toutes les ressources du lot dans le workspace personnel et leur état actif, puis toutes les versions sous verrou ; ensuite seulement créer tags/liens ou incrémenter. Dossier/recette absent/étranger/supprimé→404 uniforme, sans version/données étrangère dans l’erreur. Même code d’absence pour toutes les ressources indisponibles et aucun effet partiel ; ordre vérifiable en HTTP/PG. Toute erreur de version ou panneDB annule le lot entier.

Réponses d’ajout/retrait conservent added/removed et ajoutent les versions résultantes associées aux IDs concernés ; résultat de no-op garde la version mais ancien jeton est refusé même s’il aurait conduit au même état. Les listes de candidats et de recettes de dossier exposeront organizationVersion dans une projection cohérente ; Angular capture ces versions au choix/affichage, les conserve avec l’intention, les transmet et adopte seulement les résultats de sa génération. Conflit : choix/brouillon conservés et rechargement explicite, pas de force-save ni retry aveugle. Les routes restent accessibles : c’est une rupture comportementale autorisée, pas une suppression d’API.

## Suppression d’un dossier : barrière sur tout l’ensemble affecté

DELETE /api/folders/:id conserve expectedVersion de métadonnées, mais modifie aussi des liens de recettes : il n’est pas exempté de l’optionB. Contrat cible supplémentaire expectedMembershipToken (empreinteSHA256hex64) obtenu dans un détail/aperçu privé frais du dossier. Il couvre l’ensemble trié des couples IDstable/organizationVersion de **toutes** les recettes liées, y compris les lignes en corbeille dont folderId doit être réparé. Le calcul peut être groupé côtéserveur ; le token ne renvoie aucun ID ou contenu privé en clair.

Après le verrouWorkspace, reconstituer l’ensemble courant et comparer son empreinte au token **fourni** ; absence ou différence409sans effet, jamais de token courant substitué automatiquement. Ajouter/retirer une recette, modifier une organisation ou traverser corbeille/restauration change la précondition couverte. Chaque recette est ainsi couverte sans envoyer une query/entête contenant des milliers d’IDs. Le token est une précondition optimiste, pas une autorisation : vérification user/workspace/dossier indépendante. Formatcanonique défini lors de la bascule et testé, pas de crypto d’authentification ou nouveau secret.

Le client folder-detail/confirmation capture version+token de l’aperçu, conserve ces valeurs avec l’intention et exige un nouvel aperçu explicite après409. La suppression ne remet aucune recette active, ne recrée aucun dossier et garde réparationfolderId avant cascade. Tests natifs obligatoires : nouvelle liaison après aperçu, organisation modifiée, cycledelete/restore d’une liée, dossier étranger et panne aprèsréparation : aucun effetpartiel. Aucun stockage d’instantané ni service supplémentaire ; empreinte dérivée seulement. Cette commande reste inactive dans B5a.

## Contenu et récupération — cible B5b–B5e

GET privé par IDstable pour charger une édition : champsbruts ordonnés, contentVersion et organizationVersion, identité et modeABV exact. PUT contenu par ID : expectedContentVersion obligatoire, remplacement transactionnel complet des champs éditables ; aucune écriture de slug/workspace/classement/image via body. DELETE logique et POST restauration par ID : expectedContentVersion et expectedOrganizationVersion obligatoires. Versionsabsentes/périmées409sans effet, typesinvalides400, accèsétranger404. Les corps détaillés de contenu seront arrêtés en DesignReview B5b sans modifier ces invariants.

deletedAt/restoreUntil sont gérés uniquement parPostgreSQL ; échéance30jours calendaires dans le référentielUTC depuis l’instant exact, sans arrondi à minuit. Frontière restoreUntil<=clock_timestamp après verrou→restaurationrefusée, même si lignephysique existe. Aucun effacement/cron/boutonpurge. Slugreste réservé tant que ligne présente ; nomsaffichés modifiables sans nouvelle unicité non décidée. Liens existants conservés, dossiers/tags disparus non recréés, folderIdlegacy réparé avant suppressiondossier ; référenceimage conservée.

ABV : abvUnknown=false + abvOverrideNULL signifie héritage (catalogue éventuellementNULL) ; false+nombre ycompris0 ou égalcatalogue signifie override ; true+NULL signifie inconnu explicite même si catalogue connu. CHECK interdit true+nombre. Projection édition et enregistrement doivent préserver ces modes sans modifier Ingredient.defaultAbv. B5a n’expose aucun writer abvUnknown et n’en modifie pas encore les lecteurs. ML/CL/Decimal, TOP_UP et calcul avantdilution restent les conventions existantes.

## Migration et compatibilité B5a

Migration additive8 après les sept historiques : defaults actifs/contentVersion0/abvUnknownfalse ; anciennes valeurs immuables, paire de dates/CHECKs SQL et index workspace/deletedAt. Aucun DROP/backfill destructif ou modification des migrations précédentes. SQL de testseulement ; pas de basepropriétaire. Ancien binaire tolère cette préparation tant que nouveaux états inactifs. Après activation corbeille/ABVinconnu, ancien binaire non sûr : il ignorerait ces états ; revenir à un binaire compatible, sans migration inverse destructrice.

## Qualification obligatoire de la bascule

HTTP/PG réels : chaque route sans précondition409, stale409, succès/incrément et no-op versionné ; deux clients une réussite/unconflit ; lot stale (chaque position) sans modification, IDs inconnus/crossworkspace/supprimés sans fuite ; panne après première écriture rollback ; ajout/retrait contre dossierdelete ; vieille intention après delete+restore refusée malgré mêmeID/slug. Jamais mock de serveur présenté comme preuve.

Angular/E2E : sélections multipages capturent leurs versions ; conflit conserve le choix, rechargement reste explicite ; éditeurclassement, retrait depuis dossier, anciennes routesPUT et bulkPOST qualifiés sans quotas/retries assouplis. Création→édition→corbeille→restore et drafts24h/session/compteB/stockagebloqué/réponseperdue relèvent des blocs actifs ultérieurs. B5a qualifie upgrade/defaults/CHECK/rollbackDDL et les parcours existants, sans prétendre ces nouveaux scénarios passés.
