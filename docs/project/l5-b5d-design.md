# Design Review B5d — corbeille personnelle serveur

24 octobre 2026. Base réellement vérifiée959013cf34f120cc89281c02c358c65d2db5aeb2, six contrôles success ; aucune PR ouverte. Branche feature/personal-recipe-trash publiée depuis ce SHA. Design avant code. Mandat D5/L5-COMPAT-01B/D8 et Bêta Bar, inventaire manuel indépendant inchangés.

## Contrats et invariants

Service de cycle distinct du contenu, injecté dans CocktailsModule ; contrôleur dédié sous SessionGuard. Routes proposées : GET /api/cocktails/trash/entries (pagination), GET /api/cocktails/id/:id/lifecycle (état et versions), DELETE /api/cocktails/id/:id (corbeille), POST /api/cocktails/id/:id/restore. Le chemin à deux segments de la liste évite de réserver un slug historique « trash » et ne retire aucune route.

Mutations : expectedContentVersion et expectedOrganizationVersion dans le body ; absence/null409, type ou borne invalide400 ; ID inconnu/étranger404. Résolution du workspace personnel depuis l'utilisateur authentifié, jamais depuis le body. Réponse état {id,slug,name,contentVersion,organizationVersion,deletedAt,restoreUntil,canRestore}. Lecture dédiée sans contenu privé étranger, Cache-Control no-store hérité.

Ordre transactionnel : verrou Workspace existant puis lecture recette scoped, comparaison des deux versions, état, capacité des compteurs et horloge PostgreSQL. Transition unique atomique : incrément des deux versions, dates de cycle seules modifiées. ID/workspace/slug/contenu/image/liens restent identiques. Aucun compteur remis à zéro. Double requête avec anciennes versions409 sans effet ; commande sur état déjà atteint avec versions actuelles = no-op sans nouvel incrément. Une réponse perdue impose lecture explicite de l'état, pas de replay automatique.

Suppression : instant PostgreSQL clock_timestamp après attente du verrou, précision milliseconde cohérente avec les colonnes ; restoreUntil = deletedAt +30jours calendaires UTC, indépendamment du fuseau de connexion. Restauration : autorisée uniquement si restoreUntil > clock_timestamp vérifié dans l'écriture finale après verrous ; échéance égale ou passée409 sans effet. Les deux dates reviennent àNULL mais les versions augmentent. Pas d'effacement physique, nettoyage au GET, cron ou bouton définitif.

Liste : seulement recettes supprimées du personnel, y compris expirées avec canRestore=false ; pagination bornée, tri déterministe deletedAt/id ; total et page cohérents. Frontière temporelle serveur, pas de droit tiré de canRestore reçu précédemment.

## Inventaire des interactions vérifié

CocktailsService filtre déjà deletedAt dans liste et détail ; CocktailContentService et CocktailOrganizationService refusent supprimé ; FoldersService filtre les compteurs et écrivains. Ces protections B5b seront testées avec de vraies transitions HTTP, pas seulement des changements SQL synthétiques.

Suppression de dossier : même verrou Workspace ; aperçu/token couvre les recettes retenues, réparation folderId avant cascade des appartenances. Le cycle conserve les liens existants ; restauration ne recrée aucun dossier/tag supprimé. Un slug en corbeille reste réservé par l'unicité existante. Édition et classement restent indépendants en dehors du cycle ; cycle invalide les deux intentions, y compris après retour au même ID/slug.

## Tests et critères de sortie

DTO/unitaires : préconditions absentes/null/malformées, capacité int32, pagination, projections. PostgreSQL/HTTP réels : aller-retour complet et données inchangées, frontière30jours et UTC, attente de verrou au-delà de l'échéance, conservation physique après expiration, slug réservé, isolation/CSRF/contexte, toutes anciennes lectures/écritures et compteurs.

Concurrence observée : deux suppressions/restaurations, édition contre suppression, classement contre cycle, suppression dossier contre cycle, anciennes intentions après restauration. Vérifier les deux ordres possibles et absence d'écrasement/effet partiel. Panne injectée pendant mise à jour → rollback dates et versions. Les tests existants restent intacts, aucune réduction de seuil/retry/timeout/quota.

B5d livre le serveur uniquement ; B5e fournit confirmation utilisateur, liste/restauration explicite et parcours Chromium du cycle complet. B5f revalide les10critères L5. Aucun parcours UI de corbeille déclaré livré par cette revue ; les8Chromium historiques restent requis pour non-régression en B5d.

## Alternatives, risques et OPS

Pas de troisième compteur : les deux versions monotones existantes suffisent. Pas de date client ni transaction_timestamp figé avant attente. Pas de nouvelle migration attendue : colonnes, CHECKdates et index sont intégrés B5a ; relire leur SQL exact avant implémentation. Risques prioritaires : échéance durant attente, ancien binaire ignorant corbeille, legacy folderId, route parslug capturée, défaut de filtre et ABA.

Réutiliser helpers de préconditions/verrou ; aucune extraction générale ou refonte des sessions. Retour applicatif seulement vers binaire compatible avec états supprimés ; pas de downmigration destructrice. Bases jetables gardées seulement, aucun VPS/déploiement/coût/purge/CONTRACT. Aucun arbitrage métier bloquant identifié dans ce périmètre personnel. Six checks et Review Gate effectif avant merge D8, puis qualification main obligatoire.
