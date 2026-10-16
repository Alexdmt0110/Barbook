# Roadmap autorisée

Autorisation explicite d'Alex, 16 octobre 2026 : commencer L0, puis L1 et L2. La validation de la phase A ne valide pas automatiquement les recommandations ou D1–D8.

| Lot | État initial | Critères de sortie | Branches |
| --- | --- | --- | --- |
| L0 — Reprise durable | PR #20, CI verte ; merge à valider | accès branche/commit/publication prouvé ; pilotage versionné ; handoff distant lisible ; branche dossiers préservée | docs/project-pilotage |
| L1 — Socle | EN_COURS : création corrigée/poussée ; dépendances ensuite | slug réservé new et mainAlcoholName:null corrigés ; régressions ; dépendances analysées/corrigées proportionnellement ; verify réels | fix/cocktail-creation-boundaries ; hardening/runtime-dependencies et/ou hardening/toolchain-dependencies selon analyse |
| L2 — Intégration | APPROUVE | migrations PostgreSQL exécutées ; contraintes/transactions/isolation vérifiées ; vrais HTTP et E2E ; CI renforcée sans contourner les échecs | test/critical-persistence-flows ; test/critical-browser-flows |
| L3 — Dossiers | SUSPENDUE_POUR_REMEDIATION_DU_SOCLE | checkpoint L2 et stratégie présentés au propriétaire ; autorisation de reprise à obtenir | feature/cocktail-folder-management existante |
| L4–L11 | PROPOSE_NON_APPROUVE | décisions et périmètre à approuver au moment utile | voir archive phase A |

La branche dossiers reste à `46321485d1d28351da7e0b555411199f40fa801a`, trois commits au-dessus de main `3f9dfdbd3115380960296db3c7025715d48db55c`. Ne pas supprimer, rebaser, recréer ou dupliquer ses commits. Après les merges approuvés de L1/L2, proposer une fusion de main dans cette branche sans réécriture, puis requalifier EXPAND/dual-write et reprendre les lectures/contrats/UI. La migration CONTRACT reste séparée et nécessite un accord destructif spécifique.

Les nouvelles branches partent du main distant vérifié. Les PR indépendantes peuvent être proposées sans merge automatique ; toute dépendance entre PR doit être explicite. Ne pas recopier un correctif d'une branche non mergée pour masquer une dépendance. Après intégration autorisée, rejouer les contrôles combinés sur main.

Les lots suivants, leurs alternatives et le chemin critique restent dans [la roadmap historique de phase A](audit/05-Roadmap-et-decisions.md). Aucun déploiement, accès VPS ou coût tiers n'est autorisé par L0–L2.
