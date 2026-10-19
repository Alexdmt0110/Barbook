# Handoff canonique Barbook

```yaml
checkpoint_utc: "2026-10-19T07:33:57.966632+00:00"
source_of_truth: "https://github.com/Alexdmt0110/Barbook"
phase: "B"
work_owner: "WORK"
handoff_status: "EN_COURS"
feature: "L3 B3a — migration additive de prévalidation, réconciliation sûre et versions"
branch: "feature/cocktail-folder-management"
base_branch: "main"
remote_head_sha: "ba84b0f0d3b850a687f15924663ea9927731a6e1"
local_head_sha: "ba84b0f0d3b850a687f15924663ea9927731a6e1"
worktree: "schéma/migration et tests de données préparés et vérifiés localement, à publier"
pr: "#20–#23 mergées ; aucune PR L3 avant Review Gate complet"
tests: "main combiné six checks verts ; baseline dossiers local 141 unitaires+NYC, 110 frontend, 10 garde-fous/lint/build/Prisma/tsc ; baseline dossiers six checks verts ; nouveau bloc natif 43 tests attendus, non exécuté localement"
migrations: "baseline 5 migrations CI vertes ; nouvelle sixième migration publiée à qualifier ; aucune base propriétaire/VPS"
changes_pushed: "quatre merges main et merge 69e54dc dans dossiers ; trois commits initiaux conservés"
unpushed_changes: "ce checkpoint/plan/backlog et déclencheurs CI avant publication ; aucun changement applicatif L3 nouveau"
decisions_validated: "merges #20–#23 et L3 B3a–B3c ; WORK seul ; décisions techniques ordinaires du Design Review"
decisions_pending: "merge de la future PR L3 ; nouveaux checks requis ; D1–D8 ; CONTRACT/production non autorisés"
next_atomic_step: "lire la nouvelle CI migrations/43 natifs/drift/navigateur ; si verte poursuivre contrats folders[] et expectedVersion, sans toucher une base réelle"
risks_and_blockers: "fenêtre legacy entre EXPAND et dual-write ; prévalidation refuse les liens ambigus au lieu d’en effacer ; contrats/UI multi-dossiers restent à réaliser"
production_effect: "aucun"
```

## Intégration vérifiée

- #20 merge 75fea4888cd2644fb633832c6393d631b6290b93, 19 octobre 07:09:14Z.
- #21 merge eaeeac8b9dc76b4b4af239e1b9d3063d424a30c8, 07:12:35Z.
- #22 merge eea1a636dc91d470694c40aba15fecbd69ec23fc, 07:19:47Z.
- #23 merge c0fc5fd3facd42c112673bbfc47285ba4547259b, 07:27:27Z, main actuel.

Chaque branche a reçu le main précédent par merge sans réécriture, puis Review Gate/diff réel et CI avant merge. Les correctifs et dépendances sont qualifiés ensemble : 141 unitaires backend+NYC, 110 frontend, 10 garde-fous, 37 PostgreSQL/HTTP (New/null et conflit canonique inclus), quatre parcours Chromium desktop/mobile enrichis de New, audits zéro. Runs PR #23 39215667798/39215667848/39215667932 ; sur main 39216105309/39216105483/39216105591, tous success. La dernière revue complète L2 et les preuves sont dans review-log.md.

## Branche L3 et prochain travail

Merge de main dans la branche existante : 69e54dc614a7c7241f58fe55370c5f877eab560e, parents 46321485d1d28351da7e0b555411199f40fa801a et c0fc5fd3facd42c112673bbfc47285ba4547259b ; arbre/blobs distants vérifiés et trois commits historiques encore ancêtres : 420357d2b0f7375c2121f9d62551607ef0cb561e, c5a87663cb3cd38815a661dcb89073034235ae55, 46321485d1d28351da7e0b555411199f40fa801a.

Lire l3-design.md et le backlog F023/F024 avant code. Premier bloc : baseline branch CI puis nouvelle migration additive, sans modifier l'EXPAND ni supprimer les liens existants. Tester fresh, deux ordres d'upgrade et refus transactionnel sur ambiguïtés. Puis contrats/versions, gestion locale des dossiers et UI, chacun dans un bloc testé/poussé. La colonne legacy reste présente et les vieux payloads ne doivent jamais effacer plusieurs appartenances. Aucune PR avant Review Gate entier, aucun merge L3 encore autorisé.

Local : Node24/npm11 ; node_modules de travail liés aux installations verrouillées déjà vérifiées, non versionnés. PostgreSQL/navigateur non exécutables localement ; preuves réelles via Actions PostgreSQL16 jetable. Les déclencheurs push de la branche L3 sont ajoutés aux trois workflows, sans modifier main/PR ni retirer de contrôle. Aucun changement de protection GitHub.

GitHub fait foi ; relire refs/commits/PR/CI et ce journal avant reprise. Un seul écrivain WORK, aucun relais annoncé. API Git avec parent attendu, publication non forcée, relecture SHA/message/fichiers/blobs puis fetch/avance rapide locale. Jamais de push du miroir bare ni de réécriture des trois commits. Les sources normatives privées restent à lire dans le projet ChatGPT. Les checkpoints L0–L2 historiques ne valent pas description actuelle des PR désormais mergées.

Git : branche dossiers actualisée et pilotage/configuration à publier. VM : aucune intervention. SQL : seulement CI jetable, aucune migration/seed/reset de propriétaire. Infra : déclencheurs CI uniquement, aucun déploiement, DNS/Nginx/firewall/certificat. Données réelles, récupération Prisma après migrate deploy échoué, sauvegardes/restauration/rollback de production restent inconnus/non qualifiés.


## Checkpoint données L3

Baseline ba84b0f0d3b850a687f15924663ea9927731a6e1 : six checks success, runs39217043698/39217043827/39217043832 ; EXPAND partagé et parcours legacy requalifiés. Nouveau bloc : migration 20261019073922_folder_organization_versions, deux champs Prisma, quatre cas d'upgrade et deux cas de contraintes ajoutés. Pas d'ancienne migration modifiée. Local :141 unitaires+NYC,10 garde-fous/lint/build/Prisma/tsc passés. Six migrations fraîches et43 natifs attendus dans la prochaine CI, pas annoncés réussis avant lecture. Le nouveau contrat/app UI n'est pas encore implémenté.
