# Backlog d'exécution

Le [catalogue détaillé](audit/03-Vision-et-catalogue.md) et [backlog.json](backlog.json) conservent les 66 identifiants. Le [registre des 24 constats](audit/02-Audit-qualite-securite-UX.md) est une photographie d'audit ; les preuves d'exécution ci-dessous et le handoff font foi pour la phase B. Une autorisation partielle ne valide pas toute la fiche associée.

| ID | Priorité / lot | État au 19 octobre 2026 | Résultat attendu et critères | Preuve / dépendances |
| --- | --- | --- | --- | --- |
| BB-L0-01 / F060 | MUST / L0 | MERGE #20 ; main vert | Créer une branche, publier un commit atomique et relire ses fichiers sur GitHub ; versions du pilotage et single writer | branche docs/project-pilotage ; handoff et revue L0 |
| BB-L1-01 / A001 | MUST / L1 | MERGE #21 ; main vert | Nom produisant new rejeté ou rendu routable de façon cohérente ; cas normal et route de création inchangés ; pas de 500 | règles métier + DTO/service + frontend ; contrat documenté |
| BB-L1-02 / A002 | MUST / L1 | MERGE #21 ; main vert | mainAlcoholName:null traité comme absence facultative ; nom valide inchangé ; valeur mal typée rejetée en 400 ; aucun normalize sur null | tests DTO, service et HTTP pertinent |
| BB-L1-03 / A004 | MUST / L1 | MERGE #22 ; audits zéro et main vert | Audit runtime et complet daté ; chemins et exposition réels analysés ; correctifs compatibles testés ; aucune alerte exploitable connue laissée sans traitement ou décision tracée | locks ; npm audit ; verify frontend/backend ; aucun fix --force aveugle |
| BB-L2-01 / A003 / F057 | MUST / L2 | MERGE #23 ; main vert | Base PostgreSQL jetable identifiée ; migrations vierges et statut réels ; CHECK, FK composites et unicités prouvés | aucune DB de propriétaire ; pas de reset ni de seed réinitialisant |
| BB-L2-02 / F057 | MUST / L2 | MERGE #23 ; main vert | Inscription atomique, rollback de création et classement, concurrence et refus de liens cross-workspace vérifiés sur vraie DB | HTTP réel avec auth, DTO et config bootstrap de production partagée |
| BB-L2-03 / F057 | MUST / L2 | MERGE #23 ; main vert | Parcours inscription/connexion, création/relecture/classement/filtrage et expiration ; desktop/mobile ; traces sur échec | navigateur réel et API/PostgreSQL ; aucun mock ne remplace ces preuves |
| BB-L2-04 / F057 | MUST / L2 | MERGE #23 ; main vert | CI exécute les nouveaux tests et conserve Backend Quality/Frontend Quality ; échecs bloquants ; pas de secrets ni déploiement | YAML, résultats Actions et docs commandes |

Statuts : APPROUVE → EN_COURS → A_REVOIR → PR_OUVERTE → MERGE_AUTORISE → MERGE → VERIFIE_DANS_ENVIRONNEMENT. BLOQUE et DIFFERE doivent nommer une cause et un prochain pas. Un merge n'est pas autorisé implicitement par PR_OUVERTE.

Les dettes A005–A024 restent visibles dans l'audit ; A017 reçoit une correction ciblée dans #23 et A019 un pilotage versionné dans #20. Elles ne sont pas toutes approuvées pour implémentation dans L1/L2 ; un défaut découvert qui empêche les tests des parcours existants doit être diagnostiqué et corrigé proportionnellement dans une branche adaptée, avec traçabilité. Aucune dette n'est considérée acceptée par le silence du propriétaire.


## Résultats complémentaires révélés par L2

| ID | Branche / PR | Résultat vérifié | Suite |
| --- | --- | --- | --- |
| BB-L2-05 / A017 | test/critical-integration-flows / #23 | course Ingredient reprise dans une transaction neuve, ABV concurrents conservés, limite de trois tentatives | requalification combinée après merges |
| BB-L2-06 / A025 | même branche / #23 | dist/main.js et démarrage compilé /api verts | environnement réel non qualifié |
| BB-L2-07 / A026 | même branche / #23 | CHECK garniture TOP_UP et refus/rollback historique testés | aucun déploiement/migration propriétaire ; prévalidation et récupération Prisma avant toute opération réelle |
| BB-L2-08 / A027 | même branche / #23 | sélection DOM du dossier au chargement et après création corrigée, assertions rouges avant/vertes après | dossiers multiples réservés à L3 |

Le [checkpoint détaillé L0–L2](checkpoint-l0-l2.md) contient les preuves CI, limites, décisions attendues et stratégie L3. Les quatre PR sont mergées et main qualifié ; aucun environnement propriétaire/VPS n’a été vérifié.


## L3 — F023/F024 développées dans le périmètre approuvé

Statut MERGE dans le périmètre B3a–B3c, [PR #24](https://github.com/Alexdmt0110/Barbook/pull/24) fusionnée après accord explicite le 19 octobre à 14:08:14 UTC. Main `d7ea95f7827a5b96b5ad4b17ef73fa4982c2ad22`, six checks success ; code/tests identiques à b0bb757. Branche dossiers et ses trois commits préservés à 95e21bc. F023 garde CONTRACT non approuvé : MERGE_PARTIEL_B3A_B3C ; F024 est MERGE, sans prétention de validation en production.

| Sous-lot | Résultat / acceptation vérifiée | État |
| --- | --- | --- |
| BB-L3-01 | trois commits originaux conservés et main fusionné sans réécriture | qualifié |
| BB-L3-02 | migration additive, deux ordres SQL, refus sans perte, FK/versions | qualifié en CI uniquement |
| BB-L3-03 | classement complet multi/version, compatibilité legacy sûre, courses et rollback | qualifié |
| BB-L3-04 | fiche multi, sélection/recherche/pagination,409 conserve le brouillon | qualifié desktop/mobile |
| BB-L3-05 | index/détail/CRUD, ajout jusqu'à 100 recettes, retrait local/idempotence et suppression sans recette perdue | qualifié API/DB/UI |
| BB-L3-06 |131 frontend,151 backend+NYC, 61 natifs,4 Chromium, trois thèmes et clavier, documentation/revue | #24 mergée après accord ; six checks main success, logs relus |

Preuves et limites : [checkpoint-l3.md](checkpoint-l3.md), [Review Gate](reviews/l3-review-gate.md), [contrats](../maintenance/folder-management.md). F023 garde le CONTRACT futur ; A006 garde la bascule réelle à qualifier, A015 est partiel et A016 reste ouvert. Les autres fiches/décisions ne sont pas autorisées par ces résultats.

Prochaine étape : examiner la PR de checkpoint documentaire issue de `docs/l3-merge-checkpoint` et valider son merge séparément. #24 est mergée et main qualifié ; ne pas refaire ce travail. L4 doit être cadré avec D1/D2 avant autorisation ; aucun code de session, photo, suppression de recette ou production ajouté ici.
