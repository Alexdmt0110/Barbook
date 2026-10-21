# Handoff canonique Barbook

```yaml
checkpoint_utc: "2026-10-21T06:50:53Z"
source_of_truth: "https://github.com/Alexdmt0110/Barbook"
phase: "B"
work_owner: "WORK"
handoff_status: "EN_COURS"
feature: "L4 B4b : bascule API/Angular implémentée ; qualification CI et Review Gate à réaliser"
branch: "feature/web-session-cutover"
base_branch: "main"
remote_head_sha: "ecf94629c858031102c026ad097e540851e4d70f"
local_head_sha: "ecf94629c858031102c026ad097e540851e4d70f"
worktree: "bloc de bascule coordonnée en cours de publication ; fichiers listés dans son commit"
pr: "aucune PR B4b ; #26 intégrée"
tests: "verify backend/frontend locaux ; tsc backend/E2E et10 garde-fous ; PostgreSQL/Chromium non exécutés localement"
migrations: "aucune nouvelle ; sept historiques conservées ; aucune base propriétaire"
changes_pushed: "B4a #26/main76f742b ; préparation6500544 ; checkpointb579ef6 ; design préciséecf9462"
unpushed_changes: "ce bloc avant son propre commit ; lire la ref actuelle pour sa publication"
decisions_validated: "L4 et reprise WORK seuls explicites ; D1/D2 inchangées"
decisions_pending: "chaque nouveau merge ; L5/CONTRACT/production non autorisés"
next_atomic_step: "vérifier les six checks du commit de bascule et corriger toute régression avant Review Gate"
risks_and_blockers: "qualification PG/Chromium réelle en attente ; B4c–B4e non terminés"
production_effect: "aucun"
```

Cette photographie précède son propre commit et ne peut contenir son SHA. GitHub/ref et les derniers commits font foi. Alex a confirmé la reprise exclusive de WORK ; aucun autre écrivain annoncé. Sources privées prompt maître/règles/PDF/reprise relues, non copiées dans Git public. Clone ecf9462 propre avant code, main76f742b, aucune PR ouverte et six checks checkpointb579ef6 success réellement relus.

## État technique de B4b

AuthService crée Session dans la transaction ReadCommitted de register/login ; login révoque l'ancien credential dans cette transaction. AuthController ne sérialise que user/workspaceId/csrfToken, credential seulement vers Set-Cookie HttpOnly. SessionGuard/WebSessionService protègent tous les contrôleurs privés : Origin/transport/cookie, inspect sans activité, contexte propriétaire/workspace et CSRF, authenticate final sous verrou. Aucun fallback Bearer ; ancien guard, package JWT et JWT_SECRET de l'exemple/CI retirés. Les primitives et tests B4a/B4b existants restent conservés.

Logout révoque effectivement, ne renvoie jamais Set-Cookie et est idempotent si le cookie n'a plus d'autorité. Une réponse tardive ne peut effacer un nouveau cookie. Un cookie résiduel révoqué reste HttpOnly et inerte. Les requêtes déjà autorisées peuvent terminer : pas d'annulation rétroactive. Le contexte attendu protège les vieux onglets même sans notification.

Angular conserve seulement identité/workspace/CSRF en mémoire, vérifie /me après login/register, retire l'ancienne clé JWT sans lire son contenu, ne rejoue aucune mutation. Génération par requête et invalidation sur401/contexte409. BroadcastChannel invalide les autres onglets sans leur installer une nouvelle identité dans une vue ancienne. L'expiration involontaire n'appelle pas logout ni purge de sessionStorage. Logout masque l'outlet privé, confirme seulement après réponse et propose un retry explicite si réseau incertain. Rester connecté n'est pas coché par défaut.

Les assertions dossiers/recettes des tests PG sont conservées ; seul le transport change. Le test d'expiration navigateur ne forge plus de JWT : CLI de fixture DB protégé par requireTestDatabase, jamais route HTTP ni code compilé de production. Quatre essais existants desktop/mobile et quota d'inscription conservés. Le nouveau web-sessions.e2e-spec couvre CSRF/contexte/origine/refus sans activité, rotation/rejeu, échéances et rollback Session. Ces tests doivent encore passer réellement en CI avant toute conclusion.

## Vérifications et prochaine étape

Local : npm run verify backend/front, npx tsc --noEmit --incremental false backend, npm run typecheck E2E ; npm run test:integration:safety dix passés ; audits lock backend complet/runtime zéro après retrait JWT. Les quatre scénarios Playwright sont listés avec configuration synthétique jetable ; ce listing ne lance ni DB ni navigateur. Aucun PostgreSQL/Docker/Chromium local disponible prétendu. La CI doit exécuter les natifs et le vrai navigateur, lire ses logs et corriger les échecs sans ignorer/relâcher les contrôles.

Avant PR : qualification des courses et parcours critiques B4b, puis Review Gate complet main...branche (tous axes), zéro BLOCKER/P1. Pas de PR fondée sur le seul build. Après correction BLOCKER/P1 reprendre toute la revue. Lire la vraie PR et ses six checks, puis attendre Alex pour tout merge.

B4c admission serveur fermée/liste et accès storage, B4d vrais brouillons24h/purge/version/restauration et B4e logout global/approfondissement des courses restent à réaliser ; ne pas les annoncer opérationnels. Le contenu sessionStorage existant n'est pas supprimé à expiration mais les formulaires ne sont pas encore sauvegardés/restaurés par B4d. Safari/iOS/TLS/proxy réels, backup/restore et rollback propriétaire restent non qualifiés. Aucun inventaire VPS ni déploiement dans ce travail.

## Git et autorisations

Main76f742bc7de437fe7ed1d6528344be208d54159d contient #26, mergedAt2026-10-20T11:06:17Z, six checks post-merge success et preuves au checkpoint-l4/#26. Toutes les branches historiques sont conservées, notamment dossiers95e21bc, secure-web-sessions4c97d89, docs/l3-merge-checkpoint39fd730. Ne pas rebaser, réécrire, supprimer ou dupliquer.

Git : commit atomique de bascule puis push immédiat API avec parent attendu/arbre index complet, contrôle ref/parent/message/fichiers/blobs et clone fast-forward. VM : aucun déploiement. SQL : aucune migration nouvelle/propriétaire ; seulement CI jetables autorisées. Infra : aucune ; retrait des variables JWT inutilisées uniquement, sans changement de jobs/actions/permissions/ruleset. Développement L4 déjà autorisé, chaque merge distinct attend Alex. Aucun L5, CONTRACT, production, coût tiers ni changement d'infrastructure.
