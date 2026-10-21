# Pilotage Barbook

La phase A est validée. **L0–L3 et B4a/B4b sont intégrés ; main90d9356, six checks post-merge #27 verts. B4c est qualifié sur feature/private-beta-admission, code167d20b ; PR et merge distinct à vérifier au handoff. B4d/B4e restent à réaliser.** Aucun déploiement ; L5 et CONTRACT exclus.

- [Design Review B4c](l4-b4c-design.md)
- [Review Gate B4c](reviews/l4-b4c-review-gate.md)

- [Design Review B4b — bascule web](l4-b4b-design.md)
- [Checkpoint L4 — B4a intégré et limites](checkpoint-l4.md)
- [Review Gate B4b](reviews/l4-b4b-review-gate.md)
- [Review Gate B4a](reviews/l4-b4a-review-gate.md)
- [Design Review, six blocs et critères L4](l4-design.md)
- [ADR sessions PostgreSQL](../adr/0005-revocable-web-sessions.md)
- [Checkpoint L3, résultats, limites et décisions](checkpoint-l3.md)
- [Review Gate complet L3](reviews/l3-review-gate.md)
- [Photographie historique L0–L2 avant merges](checkpoint-l0-l2.md)
- [Design Review et découpage L3](l3-design.md)
- [Roadmap et périmètre autorisé](roadmap.md)
- [Backlog exécutable et critères](backlog.md)
- [Catalogue complet : 66 fiches](audit/03-Vision-et-catalogue.md) ; [backlog structuré](backlog.json)
- [Audit : 24 constats et preuves](audit/02-Audit-qualite-securite-UX.md)
- [Décisions ouvertes et garde-fous](decisions.md)
- [Handoff canonique : lire ici à chaque reprise](agent-handoff.md)
- [Revues préventives et Review Gates](review-log.md)

Les PR #20–#25 sont mergées. #25 était limitée à huit documents et ses six contrôles sur main sont verts. La branche `feature/cocktail-folder-management` reste conservée à 95e21bc et docs/l3-merge-checkpoint à 39fd730. L4 n'autorise aucun merge, L5, CONTRACT ou production. Un seul écrivain actualise le journal ; confronter toujours main, la branche active et leurs handoffs à GitHub.

## Méthode

Lire le prompt maître V2, le PDF de workflow, les règles de travail et les prompts de reprise/relais fournis dans le projet ChatGPT. Ces sources privées ne sont pas recopiées dans ce dépôt public. Les demandes explicites récentes du propriétaire priment sur leurs photographies historiques.

Un seul responsable actif par tranche et branche. Vérifier GitHub et le travail local avant d'écrire. Design Review → changement limité → tests réels → commit Conventional Commit atomique → push immédiat → lecture du SHA, du message et des fichiers distants → Checkpoint Barbook. Revue complète de la branche contre sa base avant PR ; après correction BLOCKER/P1, recommencer cette revue entière. Ne pas désactiver les contrôles en échec.

Les tests, PR, merges, migrations et déploiements ont des états distincts. Une CI verte ne prouve pas la production. Un document de handoff ne remplace jamais les références distantes. Ne jamais forcer un push, réécrire ou supprimer la branche dossiers pour simplifier la reprise.

PR B4b : [#27](https://github.com/Alexdmt0110/Barbook/pull/27) ouverte, non mergée ; diff réel70fichiers/9commits vérifié au checkpoint479a4b8, aucun commentaire/revue/conflit. Ce complément est documentaire seulement ; vérifier les six checks du dernier HEAD puis attendre Alex pour le merge.
