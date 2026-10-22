# Checkpoint L5 — Design Review avant code

## L5 — autorisé le 22 octobre 2026, Design Review bloquée avant code

D5 validée (corbeille30joursserveur, expiration≠effacement, identité/slug/liens valides conservés, pas de purge/archivage/média). L5 B5a–B5f autorisé dans le carnet personnel ; chaque merge distinct. Main94552a9/#31 et sixchecks recontrôlés, aucune PR ouverte initialement. Branche feature/recipe-lifecycle-contracts publiée immédiatement depuis ce main dans un worktree propre, ancien instantané L4 intact.

[Design Review transversale](l5-design.md) : **L5-COMPAT-01 bloque avant modèle/code**. Les anciennes mutations de liens sans version ne permettent pas de distinguer une intention avant suppression/restauration d'une nouvelle intention. Proposition B : conserver les routes mais exiger une précondition adaptée sur toutes les écritures de classement ; accord d'Alex nécessaire sur cette incompatibilité, aucune règle implicite appliquée. [D5 et décisions](decisions.md), [checkpoint](checkpoint-l5.md). Aucun test applicatif/migration/SQL/workflow modifié, pas de PR avant arbitrage. Pas de L6–L8/CONTRACT/infra/déploiement ni basepropriétaire. Les états précédents sont historiques.

HorodatageUTC : 2026-10-22T09:29:23+00:00. Base réelle 94552a94a51fdb8e9ae9a0aa4b41e47ce0906894 ; branche créée/publiée au même SHA. Les18refs historiques seront recontrôlées après publication. Ancienworktree df6c890 avec index exactementf5a9132 déjà intégré, aucun unstaged ; préservé sans reset/stash/force. Nouveau worktree barbook-l5 propre avant rédaction.

Main94552a9 correspond à#31, mergedAt2026-10-22T09:03:02Z, parents0f63272/659f7bc et arbre f2912e6aa55eb27257bccebc7288aa2c8a8d0b5b, sixchecks réellement success recontrôlés au lancement. Le handoff de#31 était une photographie antérieure ; aucune repriseL4 ni nouvellemigration décidée.

Documentation deD5, inventaire des écrivains/lecteurs, contrats provisoires, alternatives de version/ABV, planmigration additive/testseulement, matrice10critères et risques rédigés. Aucun critèreL5 déclaré passé. Tests locaux de documents : JSON66IDs/sixfiches liées au L5seulement, liens/fences, dixcritères et diffcheck ; ni testPG/HTTP/Chromium L5 exécuté ni CI nouvelle revendiquée. Pas de Review Gate applicatif ni PR car arbitrage de contrat ouvert. Réponse d'Alex requise selon consigne4du lancementL5 ; D5 elle-même reste validée.

Publication documentaire atomique prévue ; contrôler parent/arbre/message/fichiers/blobsdistants, puis arrêt. Gitcommits/pushbranche uniquement ; VM/SQL/Infraaucun ; aucun nouvel état enproduction.


## Reprise après arbitrageB — 2026-10-22T09:57:17+00:00

Main94552a9 et branche74c778e recontrôlés, aucune PR ouverte ; sixchecks main success,19refs présentes. OptionB explicitement validée, arrêtcompatibilité levé. Contrats precis/lot/version sans inférence et inventaire Angular/tests publiés avant code. B5a reste préparationinactive : colonnes/defaults/CHECK et upgrade/rollback testés, pas de nouvelles routes ou garanties actives. Bascule de tous consommateurs à débutB5b après merge B5a autorisé et mainqualifié. Aucun autre lot/OPS autorisé.


## B5a préparatoire publié — code b273dcf

Design9cbed43 publié avant code ; checkpoint parent/arbre/message/10blobs vérifiés. Codeb273dcf publié (schema, migration8 additive, testsnatifs14migration+5HTTP), quatreblobs/parent/arbre vérifiés et worktreepropre. Aucun workflow Angular/controller/service modifié. Locaux : npmci838, npmrunverify238/23suites/lint/build/Prisma/NYC, tsc et10garde-fous passés ; premières erreurslint des nouveaux tests corrigées avantpublication, aucun seuildésactivé. PostgreSQL/HTTP/Chromium L5 non encore exécutés, qualification viaPR nécessaire. [Gate initial complet](reviews/l5-b5a-review-gate.md).
