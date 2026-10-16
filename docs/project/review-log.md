# Revues de développement

## L0 — Revue préventive, 16 octobre 2026

Besoin : reprise durable et mécanisme d'écriture réel avant code. Périmètre : documents canoniques, catalogue/audit validés, branche dédiée et handoff. Exclusions : changement applicatif, dépendance, DB, production et branche dossiers. Risques : publication de sources privées/secrets, état Git obsolète, confusion autorisation/catalogue, double écrivain. Mesures : uniquement livrables d'audit sans sources privées, refs distantes contrôlées, champs d'autorisation explicites, publication non forcée et un propriétaire WORK. Tests : cohérence JSON/IDs/liens, scan des fichiers ajoutés, diff --check, lecture des SHA/message/fichiers distants après publication.

## L0 — Review Gate du premier bloc documentaire

Fonctionnel/validation : lots L0–L2 explicites, D1–D8 ouvertes, catalogue 66 IDs conservés. DB/erreurs/sécurité : aucun code ni SQL modifié ; aucun secret ou source normative privée ajouté. Tests : validation documentaire avant publication ; tests applicatifs non relancés pour ce changement documentaire. Maintenabilité/dépendances : chemins canoniques, archive datée séparée du suivi ; aucun paquet changé. Frontend/performance/OPS : sans impact d'exécution. Production readiness : toujours à qualifier dans les lots ultérieurs. BLOCKER/P1 du diff : aucun identifié à la revue documentaire ; nouvelle lecture GitHub et CI requises avant la PR. Les risques applicatifs de phase A ne sont pas présentés comme corrigés.
