# Handoff canonique Barbook

```yaml
checkpoint_utc: "2026-10-21T07:44:04Z"
source_of_truth: "https://github.com/Alexdmt0110/Barbook"
phase: "B"
work_owner: "WORK"
handoff_status: "EN_COURS"
feature: "L4 B4c : Design Review publiée avant code, B4b intégré et main qualifié"
branch: "feature/private-beta-admission"
base_branch: "main"
remote_head_sha: "90d9356bae7a80ee3d0fa01ad1ce3e26b905d005"
local_head_sha: "90d9356bae7a80ee3d0fa01ad1ce3e26b905d005"
worktree: "checkpoint documentaire en publication finale ; aucune modification applicative non poussée"
pr: "#27 MERGEE ; aucune PR B4c"
tests: "213 backend/138 frontend/111 PostgreSQL-HTTP/4 Chromium ; six checks code success ; voir checkpoint-l4.md"
migrations: "sept migrations historiques inchangées ; seulement CI jetables, aucune base propriétaire"
changes_pushed: "bascule2b7b924 ; correctif Nest4807e5d ; deps7d90508 ; qualification8ff31b7"
unpushed_changes: "documents de ce checkpoint avant leur propre publication"
decisions_validated: "D1/D2 et L4 seuls ; reprendre branche existante"
decisions_pending: "tout nouveau merge ; L5/CONTRACT/production non autorisés"
next_atomic_step: "implémenter admission serveur/fixtures selon l4-b4c-design.md, puis stockage tolérant ; chaque nouveau merge à valider"
risks_and_blockers: "aucun BLOCKER/P1 identifié B4b ; B4c/B4d/B4e restent nécessaires avant clôture L4"
production_effect: "aucun"
```

Cette photographie précède sa propre publication. Lire les refs GitHub, les PR et les derniers commits : le SHA ci-dessus est le code qualifié, pas le futur commit documentaire. Clone propre à8ff31b7 avant ces seuls documents ; sources privées prompt maître/règles/PDF/reprise relues. WORK reprend seul selon l'autorisation du propriétaire ; aucune branche recréée/réécrite/supprimée.

## État courant — 21 octobre 2026, B4b qualifié sur branche

Main reste `76f742bc7de437fe7ed1d6528344be208d54159d` (#26 intégrée). La branche `feature/web-session-cutover` au code `8ff31b74b8643f21228fcfbf64fe1cc24e2ad1d8` active les sessions PostgreSQL, cookies HttpOnly, CSRF serveur, contexte attendu et bootstrap Angular ; Bearer/JWT et sa dépendance sont retirés. Aucun merge B4b ni déploiement. Les sections antérieures datées ci-dessous sont des preuves historiques, pas l'état actuel.

Six checks de ce code success : [Quality39559982719](https://github.com/Alexdmt0110/Barbook/actions/runs/39559982719), [Integration39559982657](https://github.com/Alexdmt0110/Barbook/actions/runs/39559982657), [Audits39559982741](https://github.com/Alexdmt0110/Barbook/actions/runs/39559982741). Logs relus : **213 backend,138 frontend,111 PostgreSQL/HTTP,4 Chromium desktop/mobile** ; dix garde-fous, sept migrations fresh/redeploy/status/drift et smoke, audits complets/runtime zéro. Local : verify backend/frontend, compatibilité NYC/CLI, tsc backend et E2E, safety et diffcheck passés ; pas de PostgreSQL/Chromium local prétendu.

Les quatre parcours réels incluent désormais deux onglets partageant le cookie, logout dans le second et invalidation du premier, rejeu401 du credential révoqué, reconnexion explicite, CSRF invalide403 sans dossier créé, expiration DB, cookie HttpOnly inaccessible à document.cookie et absence d'accessToken. Les unités avec le vrai AuthService/interceptor ordonnent un logout tardif après reconnexion et vérifient que la nouvelle session reste installée. HTTP/PG : compte A/contexte ancien avec cookie B refusé avant lecture/écriture/logout ; origine/CSRF manquants ou hostiles ne prolongent pas l'activité ; fixation/rotation, échéances et rollback testés. Aucune simulation d'API dans Chromium, aucune inscription ou retry supplémentaire ni quota assoupli.

[Review Gate B4b](reviews/l4-b4b-review-gate.md) repris sur toute la branche depuis main après les corrections Nest et dépendances : aucun BLOCKER/P1 restant identifié dans ce périmètre. Publication documentaire seule, puis vraie PR/diff/checks à contrôler ; **merge soumis à Alex**. Toutes les branches historiques conservées.

B4c admission privée/storage, B4d brouillons24h/restauration/purge/version et B4e logout global/courses approfondies restent à réaliser. La préservation de sessionStorage à expiration ne constitue pas une sauvegarde des formulaires. Aucun compte partagé/workspace sélectionnable n'est livré ; mismatch couvert par clients HTTP hostiles, pas par un sélecteur inexistant. TLS/Secure réel, proxy, Safari/iOS, backup/restore/rollback propriétaire et déploiement non qualifiés. L4 n'est pas terminé ; L5/CONTRACT/production restent exclus.


## Reprise sûre et autorisations

Ne pas refaire la bascule. Lire la PR existante avant toute création, son HEAD/base/main, discussions, diff et six checks. Le merge de #26 était autorisé et exécuté le20octobre11:06:17UTC ; main76f742b, parentsc99b080/4c97d89 et six checks post-merge vérifiés. L'autorisation ne s'étend pas au merge B4b. Après accord distinct et merge contrôlé, poursuivre B4c depuis main vert, avec revue préventive et sans migration propriétaire.

Store/guards : inspect sans activité, contexte/CSRF puis authenticate final sous verrou ; droits métier conservés. Login/register créent une session dans la transaction ; seul son hash est en DB, credential exclusivement en Set-Cookie. Logout révoque sans Set-Cookie, empêchant une réponse ancienne d'effacer une nouvelle connexion. Les requêtes déjà autorisées peuvent finir ; pas d'annulation rétroactive. Angular garde identité/CSRF en mémoire, vérifie/me et rejette les réponses anciennes sans retry de mutation. Une panne logout masque le privé et propose un retry explicite. Les notifications invalident les autres onglets ; elles ne donnent aucun droit.

Branches historiques conservées : dossiers95e21bc, secure-web-sessions4c97d89 et docs/l3-merge-checkpoint39fd730, ainsi que les archives. Git : commits/push/PR uniquement, aucun merge B4b autorisé. VM : aucun déploiement. SQL : aucune migration nouvelle/personnelle/production, tests CI jetables seuls. Infra : aucun changement, jobs/actions/permissions/ruleset conservés.

## PR #27 réellement ouverte et relue

Ouverte le21octobre2026 à07:16:29UTC ; base76f742b/head479a4b8 vérifiés,70fichiers et9commits. Toutes les lignes ajoutées/retirées et les blobs des fichiers présents correspondent au diff local main...HEAD ; les deux suppressions JWT sont conformes. Aucun commentaire/revue/thread, mergeable=true ; aucun merge effectué. Le présent commit final ajoute seulement les références de PR dans six documents, sans modifier le code8ff31b7 ni son Review Gate. Les six checks code sont verts ; les contrôles push/PR du checkpoint documentaire sont encore à observer jusqu'à leur fin. Vérifier les runs du dernier HEAD sur GitHub plutôt qu'une ancienne photographie.

La description de #27 sera actualisée après les contrôles finaux avec leurs liens. Aucun commentaire ou message n'est envoyé à un tiers. PRET_A_PASSER signifie code/pilotage disponibles pour reprise ; il ne vaut ni accord merge ni clôture de L4.

## Reprise B4c après merge autorisé de #27

État courant : #27 mergée à07:39:25UTC par90d9356, parents/arbre/main et six checks post-merge confirmés. Les sections B4b précédentes sont historiques et leur attente de merge levée par le nouvel accord explicite d’Alex. Branche feature/private-beta-admission publiée depuis ce main, clone propre avant design. Voir [Design Review B4c](l4-b4c-design.md). Aucune migration nouvelle/propriétaire, VM/Infra aucune action ; B4d/B4e/L4f restent à réaliser, L5/CONTRACT/production exclus.
