# Review Gate L3 — branche entière

Avis : favorable à l'ouverture d'une PR, aucun BLOCKER/P1 identifié. Ce verdict autorise une proposition de revue, **pas le merge ni la production**. Revue du 19 octobre 2026, conduite en posture de reviewer externe après publication, avec validation humaine encore à obtenir.

Base : `c0fc5fd3facd42c112673bbfc47285ba4547259b` (main). Code/tests : `b0bb7574e373a2876b93cf67abf22f671ae7fca3`. Le diff complet de 69 fichiers a été relu après le complément de qualification, pas seulement les assertions ajoutées. La consolidation documentaire finale (checkpoint, décisions, maintenance, handoff) reçoit son propre contrôle de cohérence/liens/JSON/diff et arbre distant ; elle ne modifie aucun code/SQL/dépendance. La vraie PR et sa CI seront relues après création.

## Axes obligatoires

| Axe | Revue et preuve | Conclusion dans le périmètre |
| --- | --- | --- |
| Fonctionnel/invariants | F023/F024 comparées aux contrats, services, pages et tests ; zéro/un/multi, projection stable, retraits locaux, suppression sans recette/tags/autres liens perdus | conforme B3a–B3c ; CONTRACT exclu |
| Frontières/clients hostiles | DTO null/absence/mélange/UUID/tailles/versions/nom/champs étrangers ; workspace dérivé de session ;400/404/409 exercés en HTTP réel | pas de500 évitable identifié pour ces matrices |
| Intégrité/concurrence | FK composites des deux côtés, PK/CHECK,6 migrations ; deux upgrades SQL et refus sans effacement ; verrou workspace avant versions dans les deux services ; transactions et courses de plusieurs types | données/versions et rollback réellement testés ; pas de simple mock de DB |
| Erreurs | ancien payload multi409 avant tags/liens ; stale409 ; nomP2002 ciblé au service dossier ;404 uniformes ; panne injectée conserve tout ; brouillons et retry idempotent après réseau | pas de perte silencieuse ni erreur volontairement masquée |
| Sécurité | guards JWT, scopes personnels, SQL paramétré, noms interpolés, pas d'upload/HTML ; tests foreign IDs et direct SQL ; scan limité du diff de formats évidents de secrets sans résultat | aucun secret ou accès transverse identifié dans le diff ; aucune certification de l'historique |
| Tests/angles morts |151 backend+NYC,131 frontend,10 guards,61 natifs,4 Chromium ; plafond de 100 et cinq pages, clavier, legacy, expiré, trois thèmes, aucune inscription/retry de contournement | exécution et logs observés ; pas de test ignoré quand la DB manque |
| Maintenabilité | responsabilités dossiers retirées du service d'organisation ; contrôleurs minces, service 277 lignes ; index/détail/picker spécifiques, helper de verrou 17 lignes ; pas de repository/framework générique | cohésion et taille proportionnées, pas de refonte globale |
| Dépendances/couplage | controller→service→Prisma ; pas de chaîne entre services métier, cycle ou nouveau package ; clients HTTP de domaine ; aucun lock modifié | audits datés complets/runtime/e2e zéro, graphe simple |
| A11y/responsive | formulaires/cases/boutons natifs labellisés, navigation sémantique, confirmation native, état/conflit explicites ; Enter/Space et390px réels, captures stables inspectées | conforme au parcours testé ; lecteur d'écran/zoom/Safari/appareil physique restent L7 |
| Performance/volumes | browse/page bornés, ordre name,id, requêtes relationnelles groupées ; ajout100 et suppression par UPDATE groupé, pas d'écriture par recette ;100 éléments retrouvés sans troncature | pas deN+1 applicatif identifié ; pas de benchmark de charge inventé ; A015/A016 hérités non clos |
| Documentation/OPS/config | contrats et limites mis à jour ; snapshots datés,66 IDs conservés ; ancien écrivain à retirer, ambiguïtés à inventorier ; aucune variable/infra/runtime nouvelle | reprise vérifiable, pas de instructions de migration réelle exécutées |
| Préparation livraison | six checks success du head, fresh/redeploy/status/drift/smoke ; actions et permissions inchangées hors déclencheurs exacts ; main intégré vert ; branche et3 commits conservés | PR proposée ; images/restore/rollback/monitoring et production à qualifier séparément |

## Points discutés et traitement

La revue a ajouté le test de lot maximal de 100, le parcours clavier et des captures sans transition CSS en cours. Le complément est vert ; relecture entière reprise ensuite. Le transport de renommage des DTO avait laissé deux copies non utilisées : retirées en078475d, arbre entier index/distant désormais comparé avant publication, sans réécriture. Aucun BLOCKER/P1 restant de ce diff identifié. Aucun P2 introduit n'est reporté par acceptation implicite.

A006 : mécanisme de refus/backfill et deux ordres SQL qualifiés, mais séquence de bascule réelle non qualifiée. A007/A008 : contrat nouveau protégé ; anciens binaires et payloads zéro/un ont leurs limites explicitement temporaires. A015/A016 et autres constats du socle restent dans leurs phases, sans les déclarer corrigés ou acceptés par silence. Les exigences de production ne sont pas des déploiements réalisés.

Les preuves, commandes, runs et limites détaillés sont dans [checkpoint-l3.md](../checkpoint-l3.md). La relecture de la vraie PR doit contrôler base/head/diff/discussions/checks/mergeabilité et comparer ses blobs aux fichiers revus. Toute correction BLOCKER/P1 ou changement de base impose une nouvelle revue de toute la branche.


## Consolidation documentaire et accès de livraison

La consolidation finale corrige les anciens guides encore limités à zéro/un dossier, distingue les snapshots avant merges et l'état courant, conserve les 66 IDs et les décisions ouvertes, et lie checkpoint/contrats/handoff. YAML/JSON, liens locaux, fences et diff check contrôlés ; code/tests/migrations/workflows identiques à b0bb757. Le contrôle de publication compare l'arbre complet avant création du commit et relit la ref/blobs après publication.

Main distant confirmé inchangé, aucune PR concurrente ouverte. Le ruleset public Protect main 22294305 est actif, strict, impose PR et Backend Quality/Frontend Quality. Aucun réglage modifié. La lecture administrative de branch-protection renvoie 403 pour cette intégration ; les règles publiques ont pu être lues et les capacités de commit/push ont été prouvées par les publications. Cette limite administrative ne bloque pas la PR et ne constitue pas une autorisation de changer les protections.
