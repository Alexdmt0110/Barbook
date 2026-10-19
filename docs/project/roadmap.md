# Roadmap autorisée

Autorisation explicite d'Alex, 16 octobre 2026 : commencer L0, puis L1 et L2. La validation de la phase A ne valide pas automatiquement les recommandations ou D1–D8.

| Lot | État au 19 octobre 2026 | Critères de sortie | Branches |
| --- | --- | --- | --- |
| L0 — Reprise durable | MERGE #20 ; main qualifié | accès branche/commit/publication prouvé ; pilotage versionné ; handoff distant lisible ; branche dossiers préservée | docs/project-pilotage |
| L1 — Socle | MERGE #21/#22 ; qualification combinée verte | slug réservé new et mainAlcoholName:null corrigés ; régressions ; dépendances analysées/corrigées proportionnellement ; verify réels | fix/cocktail-creation-boundaries ; hardening/dependency-security |
| L2 — Intégration | MERGE #23 ; six contrôles sur main verts | migrations PostgreSQL exécutées ; contraintes/transactions/isolation vérifiées ; vrais HTTP et E2E ; CI renforcée sans contourner les échecs | test/critical-integration-flows |
| L3 — Dossiers | EN_COURS — B3a–B3c autorisés le 19 octobre | checkpoint L2 et stratégie présentés au propriétaire ; autorisation de reprise à obtenir | feature/cocktail-folder-management existante |
| L4–L11 | PROPOSE_NON_APPROUVE | décisions et périmètre à approuver au moment utile | voir archive phase A |

La branche dossiers reste à `46321485d1d28351da7e0b555411199f40fa801a`, trois commits au-dessus de main `3f9dfdbd3115380960296db3c7025715d48db55c`. Ne pas supprimer, rebaser, recréer ou dupliquer ses commits. Après les merges approuvés de L1/L2, proposer une fusion de main dans cette branche sans réécriture, puis requalifier EXPAND/dual-write et reprendre les lectures/contrats/UI. La migration CONTRACT reste séparée et nécessite un accord destructif spécifique.

Les nouvelles branches partent du main distant vérifié. Les PR indépendantes peuvent être proposées sans merge automatique ; toute dépendance entre PR doit être explicite. Ne pas recopier un correctif d'une branche non mergée pour masquer une dépendance. Après intégration autorisée, rejouer les contrôles combinés sur main.

Les lots suivants, leurs alternatives et le chemin critique restent dans [la roadmap historique de phase A](audit/05-Roadmap-et-decisions.md). Aucun déploiement, accès VPS ou coût tiers n'est autorisé par L0–L2.


## Checkpoint de sortie proposé

L0–L2 sont préparés en PR, sans intégration dans main ni production. Voir [checkpoint-l0-l2.md](checkpoint-l0-l2.md) pour les SHA, résultats, limites et le découpage B3a–B3d. Ordre d'intégration recommandé après accord : #20 → #21 → #22 → #23, en actualisant les branches sans réécriture, puis Review Gate et CI à chaque fois. La combinaison n'est pas encore qualifiée. L3 ne démarre qu'après autorisation distincte ; CONTRACT reste séparé et destructif.


## Intégration effective et démarrage L3

Les quatre PR ont été mergées avec accord du propriétaire. Main c0fc5fd3facd42c112673bbfc47285ba4547259b : six checks verts (Quality backend/frontend, audits backend/frontend, PostgreSQL, Browser). Runs main 39216105309, 39216105483, 39216105591. La branche dossiers a reçu ce main par merge commit 69e54dc614a7c7241f58fe55370c5f877eab560e ; ses trois commits historiques restent ancêtres. Le statut de suspension et les demandes de validation ci-dessus décrivaient la préparation antérieure ; le présent jalon fait foi.

[L3 — Design Review et contrats prévus](l3-design.md) définit les blocs cohérents à réaliser. Aucun CONTRACT ni merge de la future PR L3 n'est autorisé. Les nouveaux checks requis restent à valider séparément.
