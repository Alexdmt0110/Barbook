# Handoff canonique Barbook — L4 B4e

```yaml
checkpoint_utc: "2026-10-21T13:19:04Z"
source_of_truth: "https://github.com/Alexdmt0110/Barbook"
phase: "B"
work_owner: "WORK"
handoff_status: "EN_COURS"
feature: "L4 B4e — conception préventive, puis révocation globale et courses"
branch: "feature/global-session-revocation"
base_branch: "main"
base_sha: "de86dd0e11c938e202c038e9049876af651a0ccb"
remote_head_sha: "de86dd0e11c938e202c038e9049876af651a0ccb"
local_head_sha: "de86dd0e11c938e202c038e9049876af651a0ccb"
worktree: "checkpoint merge29/design B4e et triggers push seuls en préparation"
pr: "#29 MERGED ; aucune PR B4e encore"
tests: "six checks main de86dd0 success ; logs232backend/175frontend/118PG-HTTP/4Chromium relus"
migrations: "sept historiques sur CI jetables ; aucune nouvelle/personnelle/production"
changes_pushed: "#29 mergée de86dd0 ; branche B4e publiée au même commit"
unpushed_changes: "documents de ce checkpoint et trois triggers exacts avant publication atomique"
decisions_validated: "développement B4e puis B4f ; D1/D2 inchangées ; WORK seul"
decisions_pending: "tout nouveau merge exige Alex ; aucun L5/CONTRACT/déploiement/infra"
next_atomic_step: "implémenter endpoint global réauthentifié et tests verrouillés selon l4-b4e-design.md"
risks_and_blockers: "B4e/B4f non encore implémentés/qualifiés ; limites offline, in-flight et stockage documentées"
production_effect: "aucun"
```

Photographie précédant sa propre publication ; relire refs/HEAD/checks GitHub. Aucun SHA auto-référentiel inventé.

#29 : autorisation limitée appliquée, HEAD7d79500/base0c4a558 vérifiés,42fichiers/8commits et vrai diff identiques à la qualification, zéro discussion/revue,12checks verts. mergedAt2026-10-21T13:15:45Z ; merge de86dd0 parents0c4a558/7d79500, arbre6db7ad7 identique. Main réellement lu au merge et ses six checks success, logs232/175/118/4. Tous les16anciens refs hors main conservés à leur SHA. Détails et IDs dans checkpoint-l4.md.

B4a/b/c/d intégrés ; récupération temporaire24h, isolation user/workspace/recette, confirmation /me et restauration explicite, versions et réponse perdue qualifiées sur #29. Aucun replay automatique. Les limites browser/stockage/effacement physique restent dans docs/maintenance/temporary-drafts.md. Le store interne revokeAll ne constitue pas encore un logout global public.

Reprendre B4e sur cette branche, design l4-b4e-design.md avant code : endpoint/UI après mot de passe, sérialisation User→Session, révocation pendant attente, courses identité/connexion/logout et erreurs réseau ; puis B4f avec18critères et Review Gate complet. Chaque commit testé/poussé immédiatement et six contrôles ; pas de nouvelle PR avant zéroBLOCKER/P1. Tout merge futur demande Alex. Conserver toutes les branches.

Git : merge29 et branche B4e ; VM aucun ; SQL aucune nouvelle/personnelle/production ; Infra aucun changement, triggers de branche seuls. Sources privées normatives déjà lues ; pas de copie au dépôt. Pas de déploiement, CONTRACT, L5. PG/Chromium qualifiés sur Actions uniquement ; pas de TLS réel/proxy/Safari/iOS/backup/restore/rollback qualifiés.
