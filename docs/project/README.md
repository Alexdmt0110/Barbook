# Pilotage Barbook

La phase A est validée comme base de travail. **Seuls L0, L1 et L2 sont autorisés au 16 octobre 2026.** Le catalogue ne vaut pas autorisation générale. Les merges, migrations destructives, décisions métier structurantes et opérations de production restent à valider par Alex.

- [Roadmap et périmètre autorisé](roadmap.md)
- [Backlog exécutable et critères](backlog.md)
- [Catalogue complet : 66 fiches](audit/03-Vision-et-catalogue.md) ; [backlog structuré](backlog.json)
- [Audit : 24 constats et preuves](audit/02-Audit-qualite-securite-UX.md)
- [Décisions ouvertes et garde-fous](decisions.md)
- [Handoff canonique : lire ici à chaque reprise](agent-handoff.md)
- [Revues préventives et Review Gates](review-log.md)

Ces documents sont sur `docs/project-pilotage` tant que sa PR n'est pas mergée. Les branches de code basées sur main doivent consulter cette branche pour le pilotage canonique. Ne pas créer de journaux concurrents sur chaque branche.

## Méthode

Lire le prompt maître V2, le PDF de workflow, les règles de travail et les prompts de reprise/relais fournis dans le projet ChatGPT. Ces sources privées ne sont pas recopiées dans ce dépôt public. Les demandes explicites récentes du propriétaire priment sur leurs photographies historiques.

Un seul responsable actif par tranche et branche. Vérifier GitHub et le travail local avant d'écrire. Design Review → changement limité → tests réels → commit Conventional Commit atomique → push immédiat → lecture du SHA, du message et des fichiers distants → Checkpoint Barbook. Revue complète de la branche contre sa base avant PR ; après correction BLOCKER/P1, recommencer cette revue entière. Ne pas désactiver les contrôles en échec.

Les tests, PR, merges, migrations et déploiements ont des états distincts. Une CI verte ne prouve pas la production. Un document de handoff ne remplace jamais les références distantes. Ne jamais forcer un push, réécrire ou supprimer la branche dossiers pour simplifier la reprise.
