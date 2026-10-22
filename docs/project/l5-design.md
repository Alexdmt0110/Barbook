# L5 — Design Review transversale préventive

22 octobre 2026, contrôle UTC 2026-10-22T09:29:23+00:00. Base GitHub **94552a94a51fdb8e9ae9a0aa4b41e47ce0906894**, merge#31 ; six checks success recontrôlés, aucune PR ouverte. Branche `feature/recipe-lifecycle-contracts` publiée au même SHA avant rédaction. D1/D2 acquis, D5 explicitement validée et L5 B5a–B5f autorisé par Alex. **Statut courant : ARBITRAGE_B_VALIDE, B5a de préparation autorisé.** L’historique de détection ci-dessous reste une preuve, pas un blocage actuel. Ce document distingue contrat envisagé et décision encore ouverte ; aucune route, colonne ou garantie L5 n'est livrée.

## Besoin, portée et frontières

Corriger une recette sans la recréer, mettre en corbeille et récupérer pendant30jours calendaires serveur. ID/workspace/slug stables, slug réservé ; dossiers/tags encore valides, image conservée, aucun effacement définitif. Recettes personnelles seulement. Dépendances F015/F016 et volets L5 de F019/F020/F029/F051 ; pas de gestion générale du catalogue, d'historique complet, de collaboration, archivage, médiasL6 ni L7/L8. Aucun CONTRACT/ancienne API retirée, migration propriétaire ou déploiement.

## Inventaire des dépendances inspectées

| Surface actuelle | Interaction à traiter avant activation |
| --- | --- |
| CocktailsController/CocktailsService | CréationPOST, listeGET et détailGETparslug ; toutes les lectures et recherches devront exclure la corbeille, tout en gardant un accès privé dédié parID. |
| CocktailCreationService | Slug calculé à la création, unique workspace/slug. Garder le conflit en présence d'un slug réservé ; renommer le nom ne régénère pas le slug. Pas de nouvelle contrainte d'unicité sur le nom affiché, non décidée par D5. |
| CocktailOrganizationService | organizationVersion indépendante, verrou Workspace avant lecture/remplacement des dossiers/tags ; ancien folderId peut être fourni sans expectedVersion. |
| FoldersController/FoldersService | Ajout multiple POST, ajout uniquePUT, retraitDELETE de recettes : aucun jeton/version de recette dans les contrats. Compteurs _count.memberships non filtrés ; suppression dossier répare folderId puis cascade CocktailFolder, et incrémente organizationVersion. |
| Prisma et FK historiques | Cocktail.folderId Restrict coexiste avec CocktailFolder Cascade ; ne retirer ni relation ni colonne. La corbeille doit garder les liens ; suppression ultérieure d'un dossier doit réparer aussi le représentant legacy des recettes en corbeille, sans effacer la recette. |
| Tags | Liens same-workspace ; conserver ceux encore présents, ne pas recréer un tag supprimé. Pas de CRUD tag nouveau. |
| Degrés et catalogue | Détail ne renvoie que abv effectif, calculé par abvOverride??defaultAbv ; la distinction brute est perdue dans le contrat de lecture. Édition ne doit ni figer un héritage involontairement ni supprimer un override égal au catalogue. |
| Création/formulaires/mapper | ML canonique Decimal(8,3), CL×10 et bornes existantes ; unités de bar conservées, aucune conversion arbitraire/dilution. API strictement validée côté serveur. |
| L4 DraftStore/FormDraft/auth | Réutiliser leases/générations, TTL24h, clé edit:IDstable et version de contenu, schéma de formulaire ; ne pas recréer un moteur de drafts. Mutation incertaine conservée sans retry/replay ; purge/expiration/identité inchangées. |
| SessionGuard/WebSessionService | Cookie/origine/CSRF/contexte user/workspace restent requis ; ce contexte ne contient aucune version de recette et ne distingue pas deux intentions du même compte/session. |

Fichiers principaux : backend/prisma/schema.prisma ; backend/src/cocktails/(cocktails.service, cocktail-creation.service, cocktail.types) ; organization/(controller,service,dto) ; backend/src/folders/(folders.controller,folders.service,dto/folder-commands.dto) ; backend/src/database/lock-organization-workspace.ts ; frontend/src/app/core/drafts et features/cocktails ; docs/maintenance/recipe-data-conventions.md et temporary-drafts.md. Historique des sept migrations et test migrations.e2e relus ; aucune modification historique envisagée.

## Incompatibilité nécessitant Alex — L5-COMPAT-01

Objectifs simultanés : (a) toute suppression/restauration invalide les anciennes intentions de classement ; (b) ne pas casser les contrats historiques. Les chemins suivants acceptent actuellement une intention non versionnée :

- PUT /api/cocktails/:slug/organization avec folderId et sans expectedVersion (ValidateIf optionnel ; service ne compare que si fourni).
- POST /api/folders/:id/cocktails : body cocktailIds uniquement.
- PUT et DELETE /api/folders/:id/cocktails/:cocktailId : aucun jeton/version de recette.

Contre-exemple : A prépare un PUT sans version sous sa session, B place la recette en corbeille puis la restaure ; A envoie son ancien PUT après restauration. Son URL/body/cookie/CSRF/contexte sont identiques à ceux d'un nouveau PUT légitime du même utilisateur. Même un verrou parfait ne permet pas d'inférer la date de l'intention. Tester deletedAt uniquement bloque pendant la corbeille, mais pas après restauration. Incrémenter les versions ne protège pas un appel qui ne les transmet pas. Rafraîchir/ignorer les callbacks Angular seuls ne protège pas un client HTTP direct.

**Il ne s'agit pas d'un défaut L4 déclaré corrigé ni d'un arbitrage D5 restant ; c'est une incompatibilité de contrat révélée par le nouveau cycle L5.** Aucun contournement silencieux, aucun changement de quota, aucune exception de sécurité.

| Option à décider | Conséquence |
| --- | --- |
| A — compatibilité limitée aux recettes jamais passées en corbeille | Garder routes et formats historiques ; ajouter une précondition de cycle de vie aux commandes, fournie par les clients actualisés. Sans cette précondition, refuser409sans effet une commande de classement visant une recette ayant traversé le cycle corbeille. Une précondition ancienne échoue aussi. Les anciens clients conservent leur comportement pour les recettes jamais supprimées, mais doivent être actualisés pour classer une recette restaurée. Cette option laisse aussi le risque historique d'écrasement entre commandes legacy non versionnées (remplacement tags/folderId) hors corbeille ; elle nécessite donc une exception explicite à l'exigence générale de protection concurrente. |
| B — recommandée, précondition obligatoire sur toutes les écritures de classement | Protection uniforme et contrat plus simple, mais rupture plus large : tous les anciens appels sans précondition sont refusés. Routes conservées ; mise à jour coordonnée de tous les clients nécessaire. |
| C — conserver ces appels sans précondition après restauration | Compatibilité comportementale complète, mais accepter explicitement qu'une ancienne intention puisse être exécutée après restauration ; contraire à l'exigence actuelle, non recommandée. |

A ou B conserve les routes, sans CONTRACT ni suppression d'API, mais change leur admissibilité : **accord explicite nécessaire** au titre de l'incompatibilité importante demandé par Alex. B est recommandée pour satisfaire aussi l'absence d'écrasement silencieux entre appels legacy, pas seulement la barrière de restauration. Le format précis des préconditions par recette (contenu/organisation/cycle, lots inclus) sera arrêté après arbitrage. Ne pas interpréter l'autorisation de L5 comme cet accord implicite.

## Contrats envisagés, non implémentés

Lecture d'édition par IDstable, retournant contenu brut, version de contenu et état/cycle ; détailparslug existant préservé/additif. Remplacement de contenu par ID avec expectedContentVersion obligatoire, sans ID/workspace/slug/image/classement contrôlés par le body. Données complètes/ordonnées et validation partagée avec création, pas de patch ambigu entre omis et null.

Lecture doit distinguer explicitement héritage, override numérique (y compris0 ou égal au catalogue) et inconnu explicite. Option privilégiée : conserver abvOverride nullable et ajouter un indicateur abvUnknown, avec CHECK interdisant unknown+override ; anciennes lignes false préservent exactement override??catalogue. Variante enum impose un backfill d'overrides et des adaptations plus larges sans bénéfice prouvé. Contrat de lecture transmet mode/source+valeurs brutes ; catalogue existant jamais modifié depuis une recette. Hypothèse de représentation à finaliser en B5a, pas une modification déjà appliquée.

Suppression logique parID avec versions attendues, conservation des données/liens et incrément des versions contenu+organisation et du jeton de cycle. Restauration explicite parID avec versions, interdite à l'échéance serveur ; même identité/slug et liens encore valides, versions jamais remises à zéro. Doubles commandes connues doivent être sans effet supplémentaire ; réponse perdue exige vérification explicite, aucun replay automatique. Réponse indisponible/expirée reste sans effet ; aucun droit accordé par le JSON du navigateur.

Corbeille paginée privée avec dates de suppression et limite de restauration. Date calculée par PostgreSQL dans un référentiel UTC explicite, intervalle30jours calendaires depuis l'instant de suppression ; comparaison d'échéance après attente de verrou, pas date/horloge client ni arrondi à minuit. B5d doit tester la frontière exacte et documenter le référentiel temporel. Aucun nettoyage au GET ni purge à l'échéance.

## Versions, verrous et responsabilités envisagés

Version de contenu distincte de organizationVersion : modification de dose/nom/étapes n'écrase pas classement concurrent ; classement ne rend pas automatiquement obsolète un contenu indépendant. Suppression/restauration constitue une barrière commune et invalide les deux familles d'intentions. Nouveau jeton de cycle ou mécanisme équivalent obligatoire pour résoudre L5-COMPAT-01 ; pas d'utilisation de updatedAt comme pseudo-version.

Conserver l'ordre Workspace→recette pour les opérations interagissant avec les dossiers, compatible avec lockOrganizationWorkspace. Revalider état et versions sous verrou avant effet ; aucune validation seule avant attente. Pour suppression, protéger aussi le classement observé ; une transaction couvre versions et contenu/liens. Dossier supprimé peut retirer ses liens même pendant corbeille et doit maintenir folderId compatible avec FK Restrict. Aucun re-création automatique à la restauration.

Controller : validationHTTP/DTO fins ; service de contenu distinct de l'orchestration d'organisation, sans gros service de cycle général. Règles de contenu et conversions partagées seulement aux frontières cohérentes, pas de framework repository ni remaniement général. Brouillons réutilisés via adaptateur de formulaire édition. État supprimé filtré dans **tous** les services existants de lecture/compteurs et mutation de liens, pas seulement le nouveau controller.

## Migration additive et retour compatible — plan seulement

Colonnes envisagées : contentVersion non négatif, deletedAt nullable, échéance nullable liée à deletedAt, indicateur ABV inconnu ; jeton de cycle selon arbitrage. Défauts actifs/version initiale, aucune suppression/renumérotation d'identité, aucune réécriture d'ABV ni suppression de donnée. Contrainte d'unicité workspace/slug inchangée, indexes de liste active/corbeille à dimensionner aux requêtes ; CHECK versions/paire de dates/ABV sans retrait des FK existantes.

Prisma migrate deploy puis redeploy/status/diff sur DB CIjetable uniquement. Upgrade des sept migrations : photographier users/workspaces/recettes/lignes/degrés/liens avant/après, defaults vérifiés, historiques SQL immuables. À B5a, préparation inactive : aucune route ne peut écrire deletedAt/unknown avant que tous les lecteurs/écrivains soient coordonnés dans les blocs ultérieurs.

Réversibilité applicative : tant que les nouveaux états sont inactifs, ancien binaire compatible avec les defaults. **Après activation de corbeille ou unknown, retour à l'ancien binaire non sûr** : il ignorerait l'état supprimé/inconnu. Revenir seulement à un binaire compatible ou par correctif ; aucun DROPdecolonnes/rollback destructif publié. Exercice d'annulation de DDL uniquement via transactionROLLBACK dans schéma synthétique jetable, jamais sur base propriétaire ; ce n'est pas une autorisation d'OPS.

## Matrice des10critères L5 — objectifs, non qualifiés

| ID | Acceptation attendue | Preuves prévues |
| --- | --- | --- |
| L5-01 | Charger/enregistrer inchangé ne perd aucun champ/sourceABV,0/unknown/overrideégal au catalogue ; autres recettes/catalogue inchangés | unit règles/mapper + HTTP/PG valeursbrutes + navigateur |
| L5-02 | ID/workspace/slug/images/liens conservés au renommage ; recherche au nouveau nom, ancienneURL valide, slug réservé même expiré | HTTP/PG FK/unicité et E2E |
| L5-03 | Deux éditeurs : un succès, un409sans écrasement ; édition et classement indépendants si champs disjoints | verrousPG observés, deux clients, UI conserve saisie |
| L5-04 | Panne à chaque étape : rollback complet du contenu, nouveaux ingrédients et compteurs | vrai triggerde panne/transaction PG, HTTPcontrôlé |
| L5-05 | Corbeille exclue liste/détail/filtre/compteur/sélecteur et toutes anciennes mutations, sans fuiteinterworkspace | matrice de tous endpoints réels, clients hostiles, SQL FK |
| L5-06 | Restaurer mêmeID avant limite, refus exact après30joursserveur ; doubles commandes sans doublon, aucun effacement physique | PostgreSQL frontière/attenteUTC, horlogeclient hostile, HTTP |
| L5-07 | Suppression/édition/restauration/classement/dossierdelete ordonnés ; ancienne intention ne passe pas après restauration | races PG verrouillées et toutes routeslegacy, dépend L5-COMPAT-01 |
| L5-08 | Cookies/CSRF/origine/user/workspace réels ; contexteétranger et IDforgé refusés avant effet | HTTP/PG hostiles et tests sécurité existants conservés |
| L5-09 | Draftédition24h isolé/versionné, restoreexplicite, expiration/compteB/quota/réponseperdue sans replay | DraftStore/FormDraft réutilisés, testsunit et Chromium/API/PG |
| L5-10 | Parcours création→édition→corbeille→restauration desktop/mobile/clavier, sixchecks et Gate sansBLOCKER/P1 | quatre parcours enrichis sans quota/retry affaibli, contrats/docs et vraiePR |

## Découpage et tests à exécuter après arbitrage

B5a : contrats/modèle/versions et migration de préparation ; tests unitaires de sémantiques nécessaires et PGupgrade/CHECK/defaults/rollbackDDL, compatibilité des lectures actuelles ; sixchecks existants (aucun parcours L5 annoncé actif).
B5b : édition serveur et projection réversible des champsABV ; HTTPhostile, rollbackréel, races/deuxversions et aucun effetcatalogue.
B5c : UI et draftsL4 réutilisés ; aller-retour unités/données, ancien compte/401/tardif/TTL/quota, réponseperdue réellement committée.
B5d : cycle serveur et filtrage detoutes voies anciennes ; dépend B5a, D5 et arbitragecompatibilité ; course depuis chaque route, deadlineaprèsverrou, folderslegacy/cascade et slugréservé.
B5e : corbeille privée et restauration explicite, clavier/mobile, messages d'expiration sans promesse d'effacement.
B5f : matrice10/compatibilitéL3-L4, tests réels et revue entière, documentation/réversibilité, vraiePR et attenteAlex. Chaque merge exige un accord distinct ; après merge autorisé et mainqualifié seulement, bloc suivant.

Risques majeurs : legacy sans précondition (bloquant), filtre de compteur oublié, ABAaprèsrestauration, retourancienbinaire, sémantiqueABV aplatie, incohérence folderId/FK, écriture tardive intercompte. Alternatives de versionunique globale écartée car conflits artificiels contenu/classement ; softdelete filtré seulement UI écarté car contournable ; purgephysique automatique et nouveau stockage de drafts écartés car horsmandat.

## Arrêt de revue et OPS

Aucun modèle/code/testapplicatif/SQL/workflow modifié ; aucune migration créée ou appliquée. Revue documentaire de conformité et traçabilité seulement, pas de Review Gate autorisant une PR de développement. Pas de nouvelle CIapplicative lancée pour ces documents, pas de preuve des critères futurs. Main94552a9 reste sixchecksverts ; bloc B5a non implémenté.

Git : branche publiée, documentation et handoff à commiter/pousser immédiatement avec vérification distante ; pas de PR tant que l'incompatibilité n'est pas arbitrée. VMaucun. SQLaucune action. Infraaucun. Aucun coût/service externe. Les18branches historiques conservées. Prochain pas : décisionAlex sur A/B/C ; puis reprendreDesign/B5a, pas écrire un contournement implicite.


## Arbitrage L5-COMPAT-01 validé — 22 octobre 2026, avant code

Alex valide explicitementB : toutes les écritures de classement exigent une précondition adaptée ; absente/obsolète→409sans effet, aucune version actuelle inférée. Toutes routes historiques conservées, clients Angular et contrats actualisés conjointement. Rupture comportementale autorisée, pas CONTRACT. Lot : précondition propre à chaqueID, ensemble exact, validation complète sous verrou avant effet, rollbacktotal. Aucun nouvel arbitrage bloquant identifié après cette décision.

**B5a est une préparation inactive**, soumise à une première PR avant les blocs suivants : documentation des contrats et choix, colonnes additives et CHECK testés, aucune activation d’édition/corbeille/ABVinconnu ou de nouvelle admissibilité des routes. La bascule coordonnée de tous les écrivains/lecteurs/Angular/tests est le premier sous-bloc de B5b, avant l’activation des nouvelles opérations. Ne jamais annoncer ici que les anciennes routes refusent déjà les appels sans version. Les tests HTTP/concurrence exigés pour la bascule sont inventoriés dans le contrat et seront obligatoires avant sa PR ; les tests natifs B5a prouvent l’upgrade et les contraintes, pas ces parcours futurs.

Choix final des versions : **contentVersion distinct de organizationVersion**, entiers non négatifs initialisés0 ; pas de troisième compteur de cycle. Chaque suppression/restauration incrémentera les deux compteurs dans sa transaction sans jamais les remettre à zéro ; une ancienne précondition ne redevient donc pas valide. Édition de contenu incrémente seulement contentVersion, classement seulement organizationVersion ; suppression/restauration attend les deux versions. Les verrous Workspace→recette restent compatibles avec les commandes dossiers. Une mutation sans effet garde les versions, mais sa précondition est vérifiée avant de conclure au no-op ; aucun retry automatique.

B5a ajoute contentVersion, deletedAt, restoreUntil, et CocktailIngredient.abvUnknown=false. La paire de dates est nulle pour actif ; sinon dates finies et restoreUntil égale exactement deletedAt+30jours calendaires **en UTC**, indépendamment du fuseau de connexion PostgreSQL. La comparaison B5d aura lieu après le verrou à clock_timestamp ; fin de restauration≠effacement. abvUnknown=true exige abvOverrideNULL ; false+NULL hérite du catalogue, false+0 reste override0. Toutes anciennes valeurs sont conservées sans backfill sémantique. Ancien binaire utilisable seulement avant activation des nouveaux états ; pas de rollback destructif.

Consommateurs inventoriés : éditeur fiche et cocktails.service/models, folder-cocktail-picker, folder-detail, folders.service/models ; tests DOM/data-access/services/DTO, suites PostgreSQL folder-organization/folder-management/http-persistence/database-constraints, fixtures e2e existing/auth/draft/global. Aucun client externe réel inventorié ni serveur propriétaire consulté : contrôler ceux-ci avant toute future exploitation. Mise à jour coordonnée lors de la bascule, pas d’exception pourfixture ou ancienneAPI.


Complément de revue des écrivains indirects : DELETEfolder modifie aussi les liens et doit porter une précondition de l’ensemble affecté, pas seulement Folder.version. Contrat cible expectedMembershipToken couvre tous couplesID/organizationVersion triés, lignes en corbeille comprises ; aperçu privé et contrôle sous verrou, aucune version inférée. [Détails et limites](../maintenance/recipe-lifecycle.md). Aucun writer indirect oublié déclaré exempté par l’optionB. Ce choix de représentation compacte évite une liste de préconditions démesurée dans la query, sans service/state supplémentaire.
