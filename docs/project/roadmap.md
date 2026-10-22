# Roadmap autorisée

## État courant L5 — B5a qualifié, PR32 en attente de merge autorisé

D5 et L5-COMPAT-01B validés ; blocageinitial levé. B5a prépare le modèle/contrats inactifs, PR32 depuis main94552a9. Codeb273dcf qualifié par sixchecksfd3e890 :238backend/191frontend/160PG-HTTP/4Chromium/audits0 ;19cas natifs nouveaux. [Contrat](../maintenance/recipe-lifecycle.md), [Gate](reviews/l5-b5a-review-gate.md). Aucun endpointédition/corbeille ou nouvelleadmissibilitélegacy actif. B5b commencera par basculecoordonnée API/Angular après accordmergeB5a et mainqualifié. Complémentdocumentaire du dernierHEAD à contrôler, aucunmergeautorisé. Les étatsbloqués ci-dessous sont historiques.


## L5 — autorisé le 22 octobre 2026, Design Review bloquée avant code

D5 validée (corbeille30joursserveur, expiration≠effacement, identité/slug/liens valides conservés, pas de purge/archivage/média). L5 B5a–B5f autorisé dans le carnet personnel ; chaque merge distinct. Main94552a9/#31 et sixchecks recontrôlés, aucune PR ouverte initialement. Branche feature/recipe-lifecycle-contracts publiée immédiatement depuis ce main dans un worktree propre, ancien instantané L4 intact.

[Design Review transversale](l5-design.md) : **L5-COMPAT-01 bloque avant modèle/code**. Les anciennes mutations de liens sans version ne permettent pas de distinguer une intention avant suppression/restauration d'une nouvelle intention. Proposition B : conserver les routes mais exiger une précondition adaptée sur toutes les écritures de classement ; accord d'Alex nécessaire sur cette incompatibilité, aucune règle implicite appliquée. [D5 et décisions](decisions.md), [checkpoint](checkpoint-l5.md). Aucun test applicatif/migration/SQL/workflow modifié, pas de PR avant arbitrage. Pas de L6–L8/CONTRACT/infra/déploiement ni basepropriétaire. Les états précédents sont historiques.


## Clôture technique courante — 22 octobre 2026

L4 B4a–B4f est **CLOTURE_TECHNIQUEMENT_SUR_MAIN**, après autorisation explicite et merge de [#30](https://github.com/Alexdmt0110/Barbook/pull/30). Main `0f63272ddbe7bb3a884384531e9b41a314d09525`, arbre `d1b5acab59c9077a7ba8ec5a968d84ae693f6526` identique au HEAD qualifié `5e1660f`. Les six contrôles post-merge sont success, leurs six journaux relus : **238 backend, 191 frontend, 141 PostgreSQL/HTTP, 4 Chromium** ; audits complets/runtime zéro. Les 18 critères sont satisfaits dans le périmètre de preuves et limites de la [matrice](l4-b4f-qualification.md), sans BLOCKER/P1 L4 identifié.

[Bilan de clôture](l4-closure.md) : fonctionnalités livrées, vérifications, risques résiduels et conditions avant production. Le présent suivi documentaire est publié sur `docs/l4-closure` et nécessite une nouvelle PR et une autorisation de merge distincte ; il n'est pas encore intégré à main. Développement arrêté : **L5 non autorisé**. Aucun déploiement, migration personnelle/production, changement d'infrastructure ou CONTRACT. Les états antérieurs ci-dessous sont historiques.

Phase A validée comme base. L0–L2 autorisés le 16 octobre ; merges #20–#24 et L3 B3a–B3c autorisés le 19 octobre. Le merge documentaire #25 est autorisé/exécuté le 20 octobre ; D1/D2 et L4 seuls sont désormais approuvés. Chaque merge L4 reste à valider. Les recommandations et D1–D8 ne sont pas automatiquement acceptées.

| Lot | État au 22 octobre 2026 | Résultat / prochaine validation |
| --- | --- | --- |
| L0 — Reprise durable | MERGE #20 | pilotage et relais versionnés, accès en écriture prouvé |
| L1 — Socle | MERGE #21/#22 | New/null corrigés, dépendances corrigées et audits zéro, combinaison qualifiée |
| L2 — Intégration | MERGE #23 | PostgreSQL/HTTP/Chromium et six checks sur main ; rien déployé |
| L3 — Dossiers B3a–B3c | MERGE #24 ; main vert | merge commit d7ea95f autorisé/exécuté, six checks main success ; checkpoint documentaire #25 également intégré |
| B3d — CONTRACT | NON_APPROUVE | retrait legacy seulement après inventaire des usages, bascule compatible, backup/restore et accord destructif distinct |
| L4 — Sessions et saisie sûre | CLOTURE_TECHNIQUEMENT_SUR_MAIN ; #26–#30 MERGE | 18critères satisfaits dans leur portée ; six checks main0f63272 success ; bilan/limites et clôture documentaire en PR distincte |
| L5 — Cycle recette | APPROUVE_B5a_B5f ; DESIGN_BLOQUE | D5 validée ; arbitrage L5-COMPAT-01 avant modèle/code ; aucune PR |
| L6 — Photos privées | PROPOSE_NON_APPROUVE | D2/D6 ; contrôles fichier, accès privé, stockage/cleanup et sauvegardes |
| L7 — Qualification V1 | PROPOSE_NON_APPROUVE | parcours, navigateurs/appareils, zoom/clavier, performances et docs exactes |
| L8 — Release/OPS | PROPOSE_NON_APPROUVE | D7/D8 ; inventaire VPS/staging, images, restauration/rollback, production avec accord distinct |
| L9 — Ergonomie/préparation | PROPOSE_NON_APPROUVE | évolutions V1.1 choisies et spécifiées |
| L10 — Collaboration | PROPOSE_NON_APPROUVE | D3/D4 ; droits, révocations, copies et dernier propriétaire |
| L11 — Exploitation métier | PROPOSE_NON_APPROUVE | produits/coûts/stock/préparation, règles approuvées par domaine |

Main au checkpoint historique du 20 octobre : `c99b08052e2e1494f621c7de8a7fb0831516bd1e`, six checks verts après #25 (huit documents seulement). Les six PR #20–#25 ont été intégrées dans l'ordre ; preuves historiques dans [checkpoint-l3.md](checkpoint-l3.md) et [checkpoint-l4.md](checkpoint-l4.md). Aucune PR n'est fusionnée par simple ouverture ou CI verte.

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

## État courant B4c — 21 octobre 2026

B4b intégré par #27 après accord explicite d'Alex ; main90d9356bae7a80ee3d0fa01ad1ce3e26b905d005, mergedAt07:39:25UTC, parents76f742b/1e52381 et arbre f817f3b identiques au head revu. Six checks post-merge main success, logs213backend/138frontend/111PG-HTTP/4Chromium relus. Branches historiques conservées ; aucune production.

B4c est développé et qualifié sur feature/private-beta-admission, code167d20b933523bd64cc33fb6c99c775ad543b956 après design70212e2 et admissionbca7b34. Admission dans AuthService avant lookup/hash/transaction ; REGISTRATION_ALLOWED_EMAILS vide/absente ferme les inscriptions, liste exacte normalisée côté serveur, aucune ouverture depuis UI/headers ni bypass d'environnement. Configuration invalide échoue sans exposer les valeurs. Refus403 générique, aucune ligne/Set-Cookie/révocation. Les comptes/sessions existants restent utilisables après retrait de la liste ; droits workspace inchangés.

BrowserStorageService protège getters ET méthodes local/session ; read→string|null, write/remove→booléen. Aucun clear global ni cache privé ; ThemeService conserve le signal mémoire et AuthService retire seulement l'ancienne clé JWT. La persistance de formulaires24h n'est pas encore implémentée.

Six checks code success : [Quality39567144917](https://github.com/Alexdmt0110/Barbook/actions/runs/39567144917), [Integration39567144688](https://github.com/Alexdmt0110/Barbook/actions/runs/39567144688), [Audits39567144907](https://github.com/Alexdmt0110/Barbook/actions/runs/39567144907). Logs relus : **232backend/22suites,147frontend/22fichiers,118PG-HTTP/8suites et4Chromium**. Sept migrations historiques fresh/redeploy/status/drift/smoke,10garde-fous, audits complets/runtime zéro. Local verify backend/frontend/Prisma/compatibilité NYC+CLI, tsc backend/E2E, safety et diffcheck passés ; PG/Chromium seulement en CI.

Sept nouveaux tests natifs admission : fermé/non admis, aucune création partielle/cookie/activité, exact/casse, aliases/suffixes refusés, champs/headers hostiles, comptes existants avec admission retirée et session préservée. Les historiques concurrence/rollback/isolation/CSRF/rejeu restent actifs. Fixtures : vraies listes exactes réservées avant bootstrap, zéro réservation pour fermeture, quatre inscriptions browser/quotas/retries conservés. Chromium étend le parcours d'expiration avec deux getters SecurityError, reconnexion cookie, thème mémoire puis reload/me sans persistance ni erreur JS ; aucune API simulée.

[Review Gate B4c](reviews/l4-b4c-review-gate.md) de toute la branche depuis main : aucun BLOCKER/P1 restant identifié. Code/migrations/locks/workflows/contrats/tests relus, pas de nouvelle dépendance ni modification de schéma/permission/ruleset. Publication documentaire seule puis vraie PR/diff/CI à vérifier, **merge soumis à Alex**.

B4d brouillons24h/restauration/purge/identité/workspace/version, B4e logout global/réauthentification et B4f qualification globale restent à réaliser. L4-01 et volet stockage de L4-14 exercés ; pas de clôture anticipée des critères brouillons/onglets/réseau complets. La liste privée n'est pas une vérification de possession d'email (D1 reporte celle-ci avant ouverture publique). Changer la liste demande un redémarrage ultérieur autorisé ; aucune liste réelle ni infra configurée ici. TLS/proxy/Safari/iOS/backup/restore/rollback propriétaire non qualifiés ; aucun L5/CONTRACT/déploiement.


## Reprise courante — B4d,21octobre2026

#28 intégrée par0c4a558 après accord explicite ; six checks post-merge qualifiés, branches historiques conservées. B4d développé sur feature/session-drafts au code2062903, tests locaux175frontend/232backend ; six checks success et [Review Gate](reviews/l4-b4d-review-gate.md) complet favorables à la nouvelle PR, sans accord de merge. Mémoire/sessionStorage24h, restauration explicite liée à identité/workspace/recette/version, purge et absence de replay ; [contrat](../maintenance/temporary-drafts.md). B4e global/réauthentification et B4f restent distincts. Aucun nouveau merge autorisé, aucune production/infra/L5/CONTRACT. Les états B4c antérieurs ci-dessus sont historiques.

PR B4d [#29](https://github.com/Alexdmt0110/Barbook/pull/29) ouverte et relue, base0c4a558/heada80c160,42fichiers/7commits et douze checks success. Dernier complément documentaire à vérifier ; aucun merge sans accord explicite Alex.


## Reprise courante — 22octobre2026, B4e/B4f

#29 intégrée par merge commitde86dd0, six checks main qualifiés, branches conservées. B4e développé et poussé ; backend238/frontend191/PG-HTTP141 réellement passés sur66715a9. La preuve BFCache native reste à qualifier après échec2/4browser ;34fe83b corrige le fixture selon la documentation officielle, sans assertion ni délai assouplis. [Matrice des18critères](l4-b4f-qualification.md), revue entière après corrections puis vraie PR ; chaque merge futur attend Alex. Main ne contient pas encore B4e. L5, CONTRACT, déploiement et infra restent exclus. Les reprises précédentes sont historiques.


Qualification code9b7fa1e confirmée : six contrôles success, logs238backend/191frontend/141PG-HTTP/4Chromium relus, Vitest4.1.12/audits0. BFCache natif corrigé et réellement passé ; [Review Gate complet](reviews/l4-b4e-b4f-review-gate.md) sans BLOCKER/P1 restant identifié, [18critères et limites](l4-b4f-qualification.md). Publication documentaire puis vraie PR, aucune autorisation de merge future.


PR B4e/B4f réellement ouverte : [#30](https://github.com/Alexdmt0110/Barbook/pull/30), base de86dd0/head676f7fa au contrôle initial ;39fichiers/12commits, tous blobs et toutes lignes ajoutées/retirées comparés au clone, aucun patch manquant, zéro commentaire/revue/inline. Mergeable=true, état blocked pendant CI en cours, aucun conflit et aucun auto-merge. Code/fixture/sécurité déjà qualifiés sur9b7fa1e ; ce complément ne modifie que le suivi. Observer le dernier HEAD et ses six contrôles, puis attendre Alex : aucun merge de#30 autorisé.


## Reprise L5 après validation explicite de l’option B

BlocageL5-COMPAT-01 levé : routesconservées, préconditionsobligatoires sur toutesécrituresdeclassement,409sans effet siabsentes/périmées, aucuneinférence, lotatomique ; Angular actualisé conjointement à la bascule. B5a EN_COURS_PREPARATION_INACTIVE sur feature/recipe-lifecycle-contracts ; modèle/CHECK/defaults uniquement, activationcoordonnée au débutB5b. [Contrats](../maintenance/recipe-lifecycle.md), [design](l5-design.md). Les anciens étatsbloqués sont historiques, aucun nouveau merge autorisé.
