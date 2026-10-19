# Roadmap autorisée

Phase A validée comme base. L0–L2 autorisés le 16 octobre ; merges #20–#23 et L3 B3a–B3c autorisés le 19 octobre. Les recommandations et D1–D8 ne sont pas automatiquement acceptées.

| Lot | État au 19 octobre 2026 | Résultat / prochaine validation |
| --- | --- | --- |
| L0 — Reprise durable | MERGE #20 | pilotage et relais versionnés, accès en écriture prouvé |
| L1 — Socle | MERGE #21/#22 | New/null corrigés, dépendances corrigées et audits zéro, combinaison qualifiée |
| L2 — Intégration | MERGE #23 | PostgreSQL/HTTP/Chromium et six checks sur main ; rien déployé |
| L3 — Dossiers B3a–B3c | A_REVOIR | développé/qualifié sur branche existante ; Review Gate complet puis PR ; merge à valider |
| B3d — CONTRACT | NON_APPROUVE | retrait legacy seulement après inventaire des usages, bascule compatible, backup/restore et accord destructif distinct |
| L4 — Sessions et saisie sûre | PROPOSE_NON_APPROUVE | cadrer D1/D2 avant session durable, expiration/reprise et isolation des brouillons |
| L5 — Cycle recette | PROPOSE_NON_APPROUVE | édition/version, suppression/restauration selon D5, quantités/ABV |
| L6 — Photos privées | PROPOSE_NON_APPROUVE | D2/D6 ; contrôles fichier, accès privé, stockage/cleanup et sauvegardes |
| L7 — Qualification V1 | PROPOSE_NON_APPROUVE | parcours, navigateurs/appareils, zoom/clavier, performances et docs exactes |
| L8 — Release/OPS | PROPOSE_NON_APPROUVE | D7/D8 ; inventaire VPS/staging, images, restauration/rollback, production avec accord distinct |
| L9 — Ergonomie/préparation | PROPOSE_NON_APPROUVE | évolutions V1.1 choisies et spécifiées |
| L10 — Collaboration | PROPOSE_NON_APPROUVE | D3/D4 ; droits, révocations, copies et dernier propriétaire |
| L11 — Exploitation métier | PROPOSE_NON_APPROUVE | produits/coûts/stock/préparation, règles approuvées par domaine |

Main intégré : `c0fc5fd3facd42c112673bbfc47285ba4547259b`, six checks verts. Les quatre merges ont été qualifiés dans l'ordre ; SHA et runs dans [checkpoint-l3.md](checkpoint-l3.md). Aucune PR n'est fusionnée par simple ouverture ou CI verte.

L3 utilise toujours `feature/cocktail-folder-management`, actualisée par merge `69e54dc614a7c7241f58fe55370c5f877eab560e`. Les trois commits420357d2/c5a87663/46321485 restent ancêtres, l'EXPAND est inchangé. Ne pas supprimer/rebaser/recréer/cherry-pick leurs changements pour la reprise. Le code qualifié courant est `b0bb7574e373a2876b93cf67abf22f671ae7fca3` ; la ref documentaire/PR actuelle se lit dans le handoff.

Le [design L3](l3-design.md), le [checkpoint](checkpoint-l3.md), le [Review Gate](reviews/l3-review-gate.md) et le [handoff canonique](agent-handoff.md) documentent les critères et preuves. Après accord de merge L3 : relire main/head/CI/discussions, actualiser sans réécriture si nécessaire, rejouer tout le gate et la CI si le code/base change, merger avec SHA attendu puis vérifier main. Aucun autre lot n'est autorisé par ce merge.

Prochaine décision produit utile après L3 : D1 audience bêta privée/publique et D2 session/durée/reprise, nécessaires à L4. Recommandations et alternatives dans [decisions.md](decisions.md), sans les considérer acceptées. Aucun accès VPS, déploiement, migration propriétaire, coût tiers ou nouveau ruleset n'est activé ici. Les66 fiches et le chemin critique détaillé restent dans l'archive de phase A.
