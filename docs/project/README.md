# Pilotage Barbook

La phase A est validée comme base de travail. **L0–L2 sont intégrés ; L3 B3a–B3c est autorisé depuis le 19 octobre 2026.** Le catalogue ne vaut pas autorisation générale. Les merges, migrations destructives, décisions métier structurantes et opérations de production restent à valider par Alex.

- [Checkpoint L0–L2, preuves et reprise L3 à valider](checkpoint-l0-l2.md)
- [Design Review et découpage L3](l3-design.md)
- [Roadmap et périmètre autorisé](roadmap.md)
- [Backlog exécutable et critères](backlog.md)
- [Catalogue complet : 66 fiches](audit/03-Vision-et-catalogue.md) ; [backlog structuré](backlog.json)
- [Audit : 24 constats et preuves](audit/02-Audit-qualite-securite-UX.md)
- [Décisions ouvertes et garde-fous](decisions.md)
- [Handoff canonique : lire ici à chaque reprise](agent-handoff.md)
- [Revues préventives et Review Gates](review-log.md)

La PR de pilotage #20 est mergée : ces documents font partie de main. Pendant L3, le checkpoint le plus récent est sur la branche active `feature/cocktail-folder-management`, au même chemin canonique. Un seul écrivain actualise ce journal ; confronter toujours le checkpoint de main et celui de la branche active aux références GitHub, sans créer un autre chemin de journal.

## Méthode

Lire le prompt maître V2, le PDF de workflow, les règles de travail et les prompts de reprise/relais fournis dans le projet ChatGPT. Ces sources privées ne sont pas recopiées dans ce dépôt public. Les demandes explicites récentes du propriétaire priment sur leurs photographies historiques.

Un seul responsable actif par tranche et branche. Vérifier GitHub et le travail local avant d'écrire. Design Review → changement limité → tests réels → commit Conventional Commit atomique → push immédiat → lecture du SHA, du message et des fichiers distants → Checkpoint Barbook. Revue complète de la branche contre sa base avant PR ; après correction BLOCKER/P1, recommencer cette revue entière. Ne pas désactiver les contrôles en échec.

Les tests, PR, merges, migrations et déploiements ont des états distincts. Une CI verte ne prouve pas la production. Un document de handoff ne remplace jamais les références distantes. Ne jamais forcer un push, réécrire ou supprimer la branche dossiers pour simplifier la reprise.
