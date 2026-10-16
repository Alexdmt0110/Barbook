# Handoff canonique Barbook

```yaml
checkpoint_utc: "2026-10-16T12:49:23.382182+00:00"
source_of_truth: "https://github.com/Alexdmt0110/Barbook"
phase: "B"
work_owner: "WORK"
handoff_status: "EN_COURS"
feature: "L0 — pilotage durable ; L1/L2 ensuite autorisés"
branch: "docs/project-pilotage"
base_branch: "main"
remote_head_sha: "3f9dfdbd3115380960296db3c7025715d48db55c"
local_head_sha: "3f9dfdbd3115380960296db3c7025715d48db55c"
worktree: "documents L0 préparés pour le premier commit ; aucun changement applicatif"
pr: "aucune au contrôle initial"
tests: "validation documentaire ; suites applicatives non exécutées pour L0"
migrations: "aucune appliquée ; état local propriétaire/VPS inconnu"
changes_pushed: "branche de pilotage créée et ref relue ; publication documentaire à vérifier"
unpushed_changes: "docs/project/ — premier bloc documentaire"
decisions_validated: "lots L0–L2 ; pas de merge ni de production ; suspension branche dossiers"
decisions_pending: "D1–D8 ; reprise L3 après checkpoint L2"
next_atomic_step: "publier le bloc L0 et vérifier SHA/message/fichiers ; puis branche fix/cocktail-creation-boundaries depuis main"
risks_and_blockers: "vérifier la publication du premier commit avant code ; pas d'autre écrivain annoncé"
production_effect: "aucun"
```

Les SHA ci-dessus sont ceux lus **avant le commit documentaire contenant ce fichier**. Ils ne prétendent pas être son propre SHA. Résoudre la ref distante et lire le journal de commits à chaque reprise ; une interruption peut survenir entre publication et mise à jour de ce journal.

## État vérifié

Connexion propriétaire Alexdmt0110, push=true ; création réelle de docs/project-pilotage réussie, puis ref relue à main `3f9dfdbd3115380960296db3c7025715d48db55c`. Le blocage précédent HTTP 403 de la connexion AlexxDmt est levé pour la création de branche ; le commit/publication restent à prouver par le premier bloc L0. Main protégé ; aucune PR ouverte lors du contrôle. Dernière CI connue sur main : [run 34056468143](https://github.com/Alexdmt0110/Barbook/actions/runs/34056468143), succès historique du 6 septembre, pas une exécution de cette session.

Branche `feature/cocktail-folder-management` : `46321485d1d28351da7e0b555411199f40fa801a`, statut SUSPENDUE_POUR_REMEDIATION_DU_SOCLE. Ses commits `420357d2b0f7375c2121f9d62551607ef0cb561e`, `c5a87663cb3cd38815a661dcb89073034235ae55`, `46321485d1d28351da7e0b555411199f40fa801a` sont conservés. Ne pas appliquer sa migration sur une instance inconnue.

## Reprise et passation

Lire les documents normatifs et ce handoff, contrôler refs, PR, CI et changements locaux avant d'écrire. Le pilotage est sur cette branche tant que sa PR n'est pas mergée ; les branches applicatives nouvelles partent de main et consultent ce document ici. En cas de divergence, arrêter et diagnostiquer sans force push. Un seul écrivain WORK/CHAT_CLASSIQUE/PROPRIETAIRE ; le propriétaire confirme tout changement de responsable. Ne jamais reconstruire les trois commits dossiers en les recopiant.

L0 → L1 (création, dépendances) → L2 (PostgreSQL/HTTP/E2E/CI). Aucun merge, migration destructive ou déploiement. À la fin de L2, présenter les résultats et la stratégie L3, puis attendre son autorisation.

Git : branche créée, premier commit documentaire à publier. VM : aucune. SQL : aucune. Infra : aucun changement.
