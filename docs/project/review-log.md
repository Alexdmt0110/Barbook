# Revues de développement

## L0 — Revue préventive, 16 octobre 2026

Besoin : reprise durable et mécanisme d'écriture réel avant code. Périmètre : documents canoniques, catalogue/audit validés, branche dédiée et handoff. Exclusions : changement applicatif, dépendance, DB, production et branche dossiers. Risques : publication de sources privées/secrets, état Git obsolète, confusion autorisation/catalogue, double écrivain. Mesures : uniquement livrables d'audit sans sources privées, refs distantes contrôlées, champs d'autorisation explicites, publication non forcée et un propriétaire WORK. Tests : cohérence JSON/IDs/liens, scan des fichiers ajoutés, diff --check, lecture des SHA/message/fichiers distants après publication.

## L0 — Review Gate du premier bloc documentaire

Fonctionnel/validation : lots L0–L2 explicites, D1–D8 ouvertes, catalogue 66 IDs conservés. DB/erreurs/sécurité : aucun code ni SQL modifié ; aucun secret ou source normative privée ajouté. Tests : validation documentaire avant publication ; tests applicatifs non relancés pour ce changement documentaire. Maintenabilité/dépendances : chemins canoniques, archive datée séparée du suivi ; aucun paquet changé. Frontend/performance/OPS : sans impact d'exécution. Production readiness : toujours à qualifier dans les lots ultérieurs. BLOCKER/P1 du diff : aucun identifié à la revue documentaire ; nouvelle lecture GitHub et CI requises avant la PR. Les risques applicatifs de phase A ne sont pas présentés comme corrigés.

## L1 création — Revue préventive et Review Gate complet

Portée : fix/cocktail-creation-boundaries depuis main 3f9dfdbd3115380960296db3c7025715d48db55c ; 9 fichiers, sans migration. Choix : nom New conservé, slug new-cocktail réservé à sa génération ; mainAlcoholName:null équivaut à absence, types DTO/API alignés. Aucun changement de session ou de propriété. Cas limites : accents/casse/ponctuation, ingrédients nommés New non affectés, collision canonique toujours 409, noms/alcools habituels conservés. Revue du service, de ses règles, du DTO, des appels Angular et des tests avant changement.

Preuve de régression avant correctif : test ciblé réellement exécuté, 3 échecs (null/normalize, New, NÉW !!!), 24 succès. Après correction : backend npm run verify, 18 suites / 139 tests, lint, build, Prisma validate passés ; frontend npm run verify, 17 fichiers / 110 tests, lint et build passés. git diff origin/main...HEAD --check passé, arbre propre après synchronisation du commit e925cbbe99e2ff3b93d26e32c3d41509726fb0a3.

Revue complète de la branche contre main après publication : fonctionnel/validation (null, mauvais types, slugs, noms usuels) ; DB/transactions/isolations inchangées ; erreurs 400/409 conservées ; auth, secrets et droits inchangés ; tests significatifs, casts supprimés ; responsabilités cohésives et aucune dépendance ajoutée ; frontend utilise le slug renvoyé ; aucune modification visuelle ou coût de requête ajouté ; documentation et absence de migration/VPS confirmées. Aucun BLOCKER/P1 introduit identifié. Les vrais tests HTTP/DB/navigateur restent L2. Les éventuels anciens slugs new nécessitent un contrôle de données avant utilisation sur une base existante ; pas de réécriture de données implicite. PR autorisée, merge non autorisé.

## L0 — Contrôle de la PR réelle

PR #20 : 12 fichiers documentaires conformes au commit publié, base main et head d3bf5138e3c6fffc58bd473377b175ac75940d94 relus. CI run 38904129204 terminé success. Le patch du gros backlog JSON n'est pas rendu par la liste des fichiers GitHub ; son contenu a été validé localement et son blob versionné reste la référence. Aucune modification applicative, SQL ou production.
