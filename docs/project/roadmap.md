# Roadmap autorisée

Phase A validée comme base. L0–L2 autorisés le 16 octobre ; merges #20–#24 et L3 B3a–B3c autorisés le 19 octobre. Le merge documentaire #25 est autorisé/exécuté le 20 octobre ; D1/D2 et L4 seuls sont désormais approuvés. Chaque merge L4 reste à valider. Les recommandations et D1–D8 ne sont pas automatiquement acceptées.

| Lot | État au 20 octobre 2026 | Résultat / prochaine validation |
| --- | --- | --- |
| L0 — Reprise durable | MERGE #20 | pilotage et relais versionnés, accès en écriture prouvé |
| L1 — Socle | MERGE #21/#22 | New/null corrigés, dépendances corrigées et audits zéro, combinaison qualifiée |
| L2 — Intégration | MERGE #23 | PostgreSQL/HTTP/Chromium et six checks sur main ; rien déployé |
| L3 — Dossiers B3a–B3c | MERGE #24 ; main vert | merge commit d7ea95f autorisé/exécuté, six checks main success ; checkpoint documentaire #25 également intégré |
| B3d — CONTRACT | NON_APPROUVE | retrait legacy seulement après inventaire des usages, bascule compatible, backup/restore et accord destructif distinct |
| L4 — Sessions et saisie sûre | APPROUVE ; B4a MERGE #26 ; B4b QUALIFIE_SUR_BRANCHE | D1/D2 validées, six blocs du design L4 ; session PostgreSQL et brouillons sessionStorage24h ; PR/merge distincts |
| L5 — Cycle recette | PROPOSE_NON_APPROUVE | édition/version, suppression/restauration selon D5, quantités/ABV |
| L6 — Photos privées | PROPOSE_NON_APPROUVE | D2/D6 ; contrôles fichier, accès privé, stockage/cleanup et sauvegardes |
| L7 — Qualification V1 | PROPOSE_NON_APPROUVE | parcours, navigateurs/appareils, zoom/clavier, performances et docs exactes |
| L8 — Release/OPS | PROPOSE_NON_APPROUVE | D7/D8 ; inventaire VPS/staging, images, restauration/rollback, production avec accord distinct |
| L9 — Ergonomie/préparation | PROPOSE_NON_APPROUVE | évolutions V1.1 choisies et spécifiées |
| L10 — Collaboration | PROPOSE_NON_APPROUVE | D3/D4 ; droits, révocations, copies et dernier propriétaire |
| L11 — Exploitation métier | PROPOSE_NON_APPROUVE | produits/coûts/stock/préparation, règles approuvées par domaine |

Main courant : `c99b08052e2e1494f621c7de8a7fb0831516bd1e`, six checks verts après #25 (huit documents seulement). Les six PR #20–#25 ont été intégrées dans l'ordre ; preuves historiques dans [checkpoint-l3.md](checkpoint-l3.md) et [checkpoint-l4.md](checkpoint-l4.md). Aucune PR n'est fusionnée par simple ouverture ou CI verte.

L3 utilise toujours `feature/cocktail-folder-management`, actualisée par merge `69e54dc614a7c7241f58fe55370c5f877eab560e`. Les trois commits 420357d2/c5a87663/46321485 restent ancêtres, l'EXPAND est inchangé. Ne pas supprimer/rebaser/recréer/cherry-pick leurs changements pour la reprise. Le code qualifié courant est `b0bb7574e373a2876b93cf67abf22f671ae7fca3` ; la ref documentaire/PR actuelle se lit dans le handoff.

Le [design L3](l3-design.md), le [checkpoint](checkpoint-l3.md) et le [Review Gate](reviews/l3-review-gate.md) conservent les preuves historiques. #24/#25 sont intégrées et leurs branches conservées. La reprise L4 est sur `feature/secure-web-sessions` depuis c99b080 ; [design L4](l4-design.md), [décisions](decisions.md) et [handoff](agent-handoff.md) font foi pour le périmètre actuel.

D1a bêta privée, D1b édition/corbeille V1 et D2 sessions/durées/brouillons sont validées. L5 reste non autorisé ; D5 fixera la rétention avant tout développement de corbeille. D3/D4, D6, D7/D8 restent à trancher au moment utile. Aucun accès VPS, déploiement, migration propriétaire, coût tiers ou changement de ruleset ici. Aucun CONTRACT. Le catalogue de 66 fiches est préservé, sans autorisation générale.

B4a (store additif) est qualifié sur branche au code6ffc67b :168backend,131frontend,88natifs,4Chromium, sept migrations et audits zéro, six checks success. Le [checkpoint L4](checkpoint-l4.md) et le [Review Gate B4a](reviews/l4-b4a-review-gate.md) définissent exactement les preuves et limites. Les autres blocs restent à réaliser ; aucun merge L4 autorisé.

#26 a été mergée après accord le20octobre à11:06:17UTC, main76f742b/six checks post-merge verts. B4a est intégré, feature/secure-web-sessions conservée. B4b reprend sur feature/web-session-cutover ; design l4-b4b-design.md. Aucune nouvelle phase ni aucun merge suivant n'est implicitement autorisé.

B4b est EN_COURS_PREPARATION : premier micro-bloc6500544 qualifié, contrôles web encore inactifs côté application ;212backend/90natifs et six checks verts. La bascule API/Angular, admission, brouillons et qualification globale restent à réaliser dans L4. Aucune nouvelle PR ouverte ni nouveau merge autorisé.

## État courant — 21 octobre 2026, B4b qualifié sur branche

Main reste `76f742bc7de437fe7ed1d6528344be208d54159d` (#26 intégrée). La branche `feature/web-session-cutover` au code `8ff31b74b8643f21228fcfbf64fe1cc24e2ad1d8` active les sessions PostgreSQL, cookies HttpOnly, CSRF serveur, contexte attendu et bootstrap Angular ; Bearer/JWT et sa dépendance sont retirés. Aucun merge B4b ni déploiement. Les sections antérieures datées ci-dessous sont des preuves historiques, pas l'état actuel.

Six checks de ce code success : [Quality39559982719](https://github.com/Alexdmt0110/Barbook/actions/runs/39559982719), [Integration39559982657](https://github.com/Alexdmt0110/Barbook/actions/runs/39559982657), [Audits39559982741](https://github.com/Alexdmt0110/Barbook/actions/runs/39559982741). Logs relus : **213 backend,138 frontend,111 PostgreSQL/HTTP,4 Chromium desktop/mobile** ; dix garde-fous, sept migrations fresh/redeploy/status/drift et smoke, audits complets/runtime zéro. Local : verify backend/frontend, compatibilité NYC/CLI, tsc backend et E2E, safety et diffcheck passés ; pas de PostgreSQL/Chromium local prétendu.

Les quatre parcours réels incluent désormais deux onglets partageant le cookie, logout dans le second et invalidation du premier, rejeu401 du credential révoqué, reconnexion explicite, CSRF invalide403 sans dossier créé, expiration DB, cookie HttpOnly inaccessible à document.cookie et absence d'accessToken. Les unités avec le vrai AuthService/interceptor ordonnent un logout tardif après reconnexion et vérifient que la nouvelle session reste installée. HTTP/PG : compte A/contexte ancien avec cookie B refusé avant lecture/écriture/logout ; origine/CSRF manquants ou hostiles ne prolongent pas l'activité ; fixation/rotation, échéances et rollback testés. Aucune simulation d'API dans Chromium, aucune inscription ou retry supplémentaire ni quota assoupli.

[Review Gate B4b](reviews/l4-b4b-review-gate.md) repris sur toute la branche depuis main après les corrections Nest et dépendances : aucun BLOCKER/P1 restant identifié dans ce périmètre. Publication documentaire seule, puis vraie PR/diff/checks à contrôler ; **merge soumis à Alex**. Toutes les branches historiques conservées.

B4c admission privée/storage, B4d brouillons24h/restauration/purge/version et B4e logout global/courses approfondies restent à réaliser. La préservation de sessionStorage à expiration ne constitue pas une sauvegarde des formulaires. Aucun compte partagé/workspace sélectionnable n'est livré ; mismatch couvert par clients HTTP hostiles, pas par un sélecteur inexistant. TLS/Secure réel, proxy, Safari/iOS, backup/restore/rollback propriétaire et déploiement non qualifiés. L4 n'est pas terminé ; L5/CONTRACT/production restent exclus.

PR B4b : [#27](https://github.com/Alexdmt0110/Barbook/pull/27) ouverte, non mergée ; diff réel70fichiers/9commits vérifié au checkpoint479a4b8, aucun commentaire/revue/conflit. Ce complément est documentaire seulement ; vérifier les six checks du dernier HEAD puis attendre Alex pour le merge.

État21octobre après accord : B4b intégré par#27, main90d9356/six checks post-merge verts ; B4c EN_COURS sur feature/private-beta-admission, [design](l4-b4c-design.md). B4d/B4e et qualification globale restent à réaliser ; aucun nouveau merge autorisé.
