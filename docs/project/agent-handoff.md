# Handoff canonique Barbook — L4 B4e/B4f

```yaml
checkpoint_utc: "2026-10-22T06:55:36+00:00"
source_of_truth: "https://github.com/Alexdmt0110/Barbook"
phase: "B"
work_owner: "WORK"
handoff_status: "EN_COURS"
feature: "B4e développé et scénarios natifs passés ; B4f revue/qualification finale en cours"
branch: "feature/global-session-revocation"
base_branch: "main"
base_sha: "de86dd0e11c938e202c038e9049876af651a0ccb"
remote_head_sha: "7d3bee2172b07465332b3e10b916d5a1327d76a1"
local_head_sha: "7d3bee2172b07465332b3e10b916d5a1327d76a1"
worktree: "maintenance, matrice et suivi B4f encore locaux ; ce handoff avant sa publication"
pr: "#29 MERGED ; aucune PR B4e/B4f ouverte"
tests: "238backend/191frontend/141PG-HTTP/4Chromium réels sur0ab0795 ; patch Vitest4.1.12 local verify191 et audits0, six checks actuels à confirmer"
migrations: "sept historiques sur CI jetables ; aucune nouvelle/personnelle/production"
changes_pushed: "1667810,7a10fb4,acbd2e8,4522bea,df6c890,f5a9132,66715a9,34fe83b,0ab0795,7d3bee2"
unpushed_changes: "docs/maintenance authentication/frontend-authentication/temporary-drafts/global-session-revocation ; docs/project backlog.json/backlog.md/decisions/roadmap/l4-b4f-qualification ; ce handoff"
decisions_validated: "développement B4e puis B4f autorisé ; D1/D2 inchangées ; WORK seul"
decisions_pending: "chaque nouveau merge exige Alex ; aucun déploiement/infra/CONTRACT/L5"
next_atomic_step: "observer six checks du successeur documentaire de7d3bee2 ; revue entière main...branche et matrice18critères ; publier docs puis vraie PR"
risks_and_blockers: "aucun défaut applicatif restant identifié ; audit Vitest corrigé mais dernière CI à confirmer ; Review Gate final et PR encore absents"
production_effect: "aucun"
```

Photographie précédant sa propre publication ; refs/HEAD/CI GitHub autoritaires. Aucun SHA auto-référentiel inventé.

## Faits d'intégration

#29 autorisée explicitement puis intégrée le21octobre2026 à13:15:45UTC (15:15:45Paris) : merge de86dd0, parents0c4a558/7d79500, arbre6db7ad7 identique au HEAD revu ; main/six checks post-merge et logs232/175/118/4 réellement lus. Branches historiques conservées. Main toujours de86dd0 à la reprise22octobre ; aucun autre merge autorisé.

## B4e et correctifs qualifiés

Backend7a10fb4 : logout-all réauthentifié, contexte/CSRF/origine, User→Session ReadCommitted, credential encore valide et hash password courant après attente, révocation de toutes les lignes sans renouvellement/Set-Cookie. Client4522bea : intention volontaire purge annoncée avant HTTP, mot de passe effacé, global non confirmé sur réseau/perte/erreur, retry explicite sans fallback local, réponses anciennes et notifications ciblées par empreinte de session.

Designdf6c890 puis correctionf5a9132 : masque pagehide synchrone et /me frais pageshow/retour visible ; contexte identique préserve formulaire/lease, changement user purge, nouveau cookie même compte exige reconnexion, expiry/réseau garde draft suspendu, revoked purge. Aucun heartbeat ni replay. Résultat tardif ne déconnecte pas B ou une nouvelle intention de logout.

CI66715a9 a passé238/191/141 mais échoué2/4browser à la preuve BFCache ; captures/traces relues, aucune assertion relaxée.34fe83b corrige le fixture : documentation officielle Playwright dit BFCache non supporté par Page.goBack ; Chromium complet et CDP natif vérifient la vraie restauration, masque au pageshow,401 SESSION_REVOKED/purge et absence de contenu privé. CI0ab0795 a réellement passé238backend/191frontend/141PG-HTTP et4Chromium45.4s : [CI39735903186](https://github.com/Alexdmt0110/Barbook/actions/runs/39735903186), [Integration39735903163](https://github.com/Alexdmt0110/Barbook/actions/runs/39735903163).23nouveaux natifs passés : plusieurs appareils/instances, isolement Bob, hostileheaders/DTO/rate429, rollback après UPDATE, révocation/password changés pendant attente, deux ordres login/global, expirySession et requête déjà autorisée. Sept migrations fresh/redeploy/status/drift/smoke et10garde-fous passés.

## Correctif sécurité et prochaines preuves

Audit frontend0ab0795 rouge : GHSA-qxg6-89mg-rqv8/GHSA-xp26-3454-mjgp sur Vitest4.1.11. Design préventif et patch7d3bee2 : minimum^4.1.12, lock limité à Vitest+sept modules@vitest ; Chai/tinyrainbow/backend/runtime/overrides inchangés. npmci585packages reproductible ; audits complets/runtime zéro ; `VITEST_MAX_WORKERS=1 npm run verify` code0, lint/build/191tests27fichiers/compatCLI. Réexécuter six contrôles du successeur documentaire ; ne pas attribuer la CI précédente à ce patch.

Locaux antérieurs : backend verify238/Prisma/tsc/NYC,6tests réauth detectOpenHandles sans handle signalé ; frontend191/191 après timeouts historiques sous charge (aucune limite modifiée), typageE2E et10garde-fous. Aucun PG/Chromium local installé ou prétendu. Captures de confirmation desktop1365/mobile390 sur66715a9 (même code UI) inspectées, lisibles sans débordement.

## Suite et limites

Terminer la revue entière après chaque correctionP1 : fonctionnel/validation/DB/erreurs/sécurité/tests/cohésion/a11y/performance/dépendances/docs/OPS/production readiness. Matrice18critères, limites et Review Gate complets puis vraie PR ; relire tous blobs/lignes du vrai diff, base/head/commits/discussions/mergeabilité et six checks du dernier HEAD. Catalogue66IDs : seuls F001/F002/F003/F051 suivis,62autres inchangés. Chaque nouveau merge attend l'accord explicite d'Alex. Conserver toutes les branches.

Limites : appareil offline/dormant non effaçable avant constat ; preuve de révocation peut disparaître après prune ; stockage complètement refusé empêche effacement garanti ; requête déjà autorisée peut finir ; cookie de connexion déjà en vol peut être remplacé mais contexte/CSRF refuse ancienne saisie. Réglage navigateur interdisant les cookies non exercé physiquement (unit UI et HTTP cookie absent couverts). Pas de Safari/iOS/TLS/proxy/backup/restore/rollback propriétaire qualifiés, sélecteur partagé ou édition/corbeilleL5.

Git : commits/push seulement depuis merge29 ; VM aucun ; SQL aucune nouvelle/personnelle/production ; Infra aucun, trois triggers exacts de branche seuls. Déploiement, CONTRACT et L5 exclus. Sources privées project_sources lues, non copiées au dépôt.
