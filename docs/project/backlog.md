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

Le [checkpoint détaillé L0–L2](checkpoint-l0-l2.md) contient les preuves CI, limites, décisions attendues et stratégie L3. Les quatre PR restent ouvertes ; aucun statut MERGE ou VERIFIE_DANS_ENVIRONNEMENT de propriétaire n'est acquis.


## L3 autorisé — F023/F024

B3a–B3c sont autorisés par « je valide » après livraison du checkpoint. Statut EN_COURS sur la branche dossiers préservée, main intégré c0fc5fd3facd42c112673bbfc47285ba4547259b. Ordre et critères détaillés dans l3-design.md : migrations/versions sans perte, contrats/read switch, mutations locales de dossiers, UI et vrais tests. Les mentions PR ouverte/validation à attendre des paragraphes historiques ne décrivent plus L0–L2 ; les quatre PR sont mergées. CONTRACT et merge de la future PR L3 restent à valider séparément.
