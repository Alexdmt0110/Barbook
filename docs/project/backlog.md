# Backlog d'exécution

Le [catalogue détaillé](audit/03-Vision-et-catalogue.md) et [backlog.json](backlog.json) conservent les 66 identifiants. Le [registre des 24 constats](audit/02-Audit-qualite-securite-UX.md) est une photographie d'audit ; les preuves d'exécution ci-dessous et le handoff font foi pour la phase B. Une autorisation partielle ne valide pas toute la fiche associée.

| ID | Priorité / lot | État initial | Résultat attendu et critères | Preuve / dépendances |
| --- | --- | --- | --- | --- |
| BB-L0-01 / F060 | MUST / L0 | EN_COURS | Créer une branche, publier un commit atomique et relire ses fichiers sur GitHub ; versions du pilotage et single writer | branche docs/project-pilotage ; handoff et revue L0 |
| BB-L1-01 / A001 | MUST / L1 | APPROUVE | Nom produisant new rejeté ou rendu routable de façon cohérente ; cas normal et route de création inchangés ; pas de 500 | règles métier + DTO/service + frontend ; contrat documenté |
| BB-L1-02 / A002 | MUST / L1 | APPROUVE | mainAlcoholName:null traité comme absence facultative ; nom valide inchangé ; valeur mal typée rejetée en 400 ; aucun normalize sur null | tests DTO, service et HTTP pertinent |
| BB-L1-03 / A004 | MUST / L1 | APPROUVE | Audit runtime et complet daté ; chemins et exposition réels analysés ; correctifs compatibles testés ; aucune alerte exploitable connue laissée sans traitement ou décision tracée | locks ; npm audit ; verify frontend/backend ; aucun fix --force aveugle |
| BB-L2-01 / A003 / F057 | MUST / L2 | APPROUVE | Base PostgreSQL jetable identifiée ; migrations vierges et statut réels ; CHECK, FK composites et unicités prouvés | aucune DB de propriétaire ; pas de reset ni de seed réinitialisant |
| BB-L2-02 / F057 | MUST / L2 | APPROUVE | Inscription atomique, rollback de création et classement, concurrence et refus de liens cross-workspace vérifiés sur vraie DB | HTTP réel avec auth, DTO et config bootstrap de production partagée |
| BB-L2-03 / F057 | MUST / L2 | APPROUVE | Parcours inscription/connexion, création/relecture/classement/filtrage et expiration ; desktop/mobile ; traces sur échec | navigateur réel et API/PostgreSQL ; aucun mock ne remplace ces preuves |
| BB-L2-04 / F057 | MUST / L2 | APPROUVE | CI exécute les nouveaux tests et conserve Backend Quality/Frontend Quality ; échecs bloquants ; pas de secrets ni déploiement | YAML, résultats Actions et docs commandes |

Statuts : APPROUVE → EN_COURS → A_REVOIR → PR_OUVERTE → MERGE_AUTORISE → MERGE → VERIFIE_DANS_ENVIRONNEMENT. BLOQUE et DIFFERE doivent nommer une cause et un prochain pas. Un merge n'est pas autorisé implicitement par PR_OUVERTE.

Les dettes A005–A024 restent visibles dans l'audit. Elles ne sont pas toutes approuvées pour implémentation dans L1/L2 ; un défaut découvert qui empêche les tests des parcours existants doit être diagnostiqué et corrigé proportionnellement dans une branche adaptée, avec traçabilité. Aucune dette n'est considérée acceptée par le silence du propriétaire.
