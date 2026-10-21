# Reprise courante — L4 B4d

21 octobre 2026 : #28 intégrée avec autorisation explicite, main0c4a5580f3fe7d8e71c83c0434aadc3ce46d1e73 qualifié, six checks success ; preuves dans [checkpoint](checkpoint-l4.md). Branche feature/session-drafts publiée depuis ce main. [Design Review préventive](l4-b4d-design.md) préparée avant code. Prochain commit : store de brouillons borné et cycle identité/expiration/purge, tests de sécurité ; puis formulaires et Chromium, Review Gate et nouvelle PR sans merge. B4e/B4f restent autorisés dans L4 mais distincts ; aucune production/L5/CONTRACT. WORK seul. Photographies ci-dessous historiques, lire les refs GitHub réelles à la reprise.

# Handoff canonique Barbook

```yaml
checkpoint_utc: "2026-10-21T08:16:42Z"
source_of_truth: "https://github.com/Alexdmt0110/Barbook"
phase: "B"
work_owner: "WORK"
handoff_status: "PRET_A_PASSER"
feature: "L4 B4c : PR #28 ouverte, diff vérifié ; merge à valider"
branch: "feature/private-beta-admission"
base_branch: "main"
remote_head_sha: "5de0790dd7685fb4cf30f363b32c2fe63b239912"
local_head_sha: "5de0790dd7685fb4cf30f363b32c2fe63b239912"
worktree: "checkpoint documentaire seul en préparation ; code qualifié poussé et propre avant ces documents"
pr: "https://github.com/Alexdmt0110/Barbook/pull/28 ; OPEN, non mergée ; base main90d9356 ; vérifier checks du dernier HEAD"
tests: "232backend/147frontend/118PG-HTTP/4Chromium ; six checks code success ; PG/navigateur seulement CI"
migrations: "sept historiques inchangées ; aucune nouvelle, personnelle ou production"
changes_pushed: "design70212e2 ; admissionbca7b34 ; stockage167d20b"
unpushed_changes: "documents de ce checkpoint avant leur propre publication"
decisions_validated: "merge #27 et suite L4 seuls ; D1/D2 inchangées ; WORK seul"
decisions_pending: "tout nouveau merge ; L5/CONTRACT/production non autorisés"
next_atomic_step: "vérifier les six checks du dernier HEAD de #28 puis attendre accord merge ; après merge/main vert reprendre B4d"
risks_and_blockers: "aucun BLOCKER/P1 B4c identifié ; B4d/B4e/B4f restent à réaliser"
production_effect: "aucun"
```

Cette photographie précède sa propre publication. Lire les refs/PR/CI réelles, ne pas réécrire l'historique ni refaire le code poussé. Sources privées déjà relues, pas recopiées dans Git public. Clone propre au code167d20b avant ces seuls documents. Le numéro de PR doit être consigné après ouverture et relecture, sans présumer de sa CI.

## État courant B4c — 21 octobre 2026

B4b intégré par #27 après accord explicite d'Alex ; main90d9356bae7a80ee3d0fa01ad1ce3e26b905d005, mergedAt07:39:25UTC, parents76f742b/1e52381 et arbre f817f3b identiques au head revu. Six checks post-merge main success, logs213backend/138frontend/111PG-HTTP/4Chromium relus. Branches historiques conservées ; aucune production.

B4c est développé et qualifié sur feature/private-beta-admission, code167d20b933523bd64cc33fb6c99c775ad543b956 après design70212e2 et admissionbca7b34. Admission dans AuthService avant lookup/hash/transaction ; REGISTRATION_ALLOWED_EMAILS vide/absente ferme les inscriptions, liste exacte normalisée côté serveur, aucune ouverture depuis UI/headers ni bypass d'environnement. Configuration invalide échoue sans exposer les valeurs. Refus403 générique, aucune ligne/Set-Cookie/révocation. Les comptes/sessions existants restent utilisables après retrait de la liste ; droits workspace inchangés.

BrowserStorageService protège getters ET méthodes local/session ; read→string|null, write/remove→booléen. Aucun clear global ni cache privé ; ThemeService conserve le signal mémoire et AuthService retire seulement l'ancienne clé JWT. La persistance de formulaires24h n'est pas encore implémentée.

Six checks code success : [Quality39567144917](https://github.com/Alexdmt0110/Barbook/actions/runs/39567144917), [Integration39567144688](https://github.com/Alexdmt0110/Barbook/actions/runs/39567144688), [Audits39567144907](https://github.com/Alexdmt0110/Barbook/actions/runs/39567144907). Logs relus : **232backend/22suites,147frontend/22fichiers,118PG-HTTP/8suites et4Chromium**. Sept migrations historiques fresh/redeploy/status/drift/smoke,10garde-fous, audits complets/runtime zéro. Local verify backend/frontend/Prisma/compatibilité NYC+CLI, tsc backend/E2E, safety et diffcheck passés ; PG/Chromium seulement en CI.

Sept nouveaux tests natifs admission : fermé/non admis, aucune création partielle/cookie/activité, exact/casse, aliases/suffixes refusés, champs/headers hostiles, comptes existants avec admission retirée et session préservée. Les historiques concurrence/rollback/isolation/CSRF/rejeu restent actifs. Fixtures : vraies listes exactes réservées avant bootstrap, zéro réservation pour fermeture, quatre inscriptions browser/quotas/retries conservés. Chromium étend le parcours d'expiration avec deux getters SecurityError, reconnexion cookie, thème mémoire puis reload/me sans persistance ni erreur JS ; aucune API simulée.

[Review Gate B4c](reviews/l4-b4c-review-gate.md) de toute la branche depuis main : aucun BLOCKER/P1 restant identifié. Code/migrations/locks/workflows/contrats/tests relus, pas de nouvelle dépendance ni modification de schéma/permission/ruleset. Publication documentaire seule puis vraie PR/diff/CI à vérifier, **merge soumis à Alex**.

B4d brouillons24h/restauration/purge/identité/workspace/version, B4e logout global/réauthentification et B4f qualification globale restent à réaliser. L4-01 et volet stockage de L4-14 exercés ; pas de clôture anticipée des critères brouillons/onglets/réseau complets. La liste privée n'est pas une vérification de possession d'email (D1 reporte celle-ci avant ouverture publique). Changer la liste demande un redémarrage ultérieur autorisé ; aucune liste réelle ni infra configurée ici. TLS/proxy/Safari/iOS/backup/restore/rollback propriétaire non qualifiés ; aucun L5/CONTRACT/déploiement.

## Reprise et autorisations

Après vraie PR : attendre Alex pour le merge. Son accord sur #27 a été exécuté et ne vaut pas accord pour B4c. Après merge distinct/main vert, reprendre B4d avec revue préventive : création/organisation existantes, mémoire+sessionStorage24h, restauration explicite compte/workspace/recette/version et purge volontaire/changement de compte, sans replay. Utiliser BrowserStorageService pour getter/méthodes refusés et conserver repli mémoire honnête. Ne pas commencer édition/corbeille L5 ni D5 non décidé.

B4e doit encore exposer et tester logout global après réauthentification ; ne pas prétendre cette route livrée parce que le store interne sait révoquer. Une requête déjà autorisée peut finir ; pas d'annulation rétroactive. Les réponses anciennes et le contexte A/B restent couverts par B4b et ses régressions, sans inventer un sélecteur partagé.

Branches historiques conservées, notamment feature/web-session-cutover1e52381, secure-web-sessions4c97d89, dossiers95e21bc, docs/l3-merge-checkpoint39fd730 et archives. Git : commits/push/PR uniquement, aucun nouveau merge. VM : aucun déploiement. SQL : aucune migration nouvelle/propriétaire, seulement CI jetables. Infra : aucun changement ; seuls triggers push exacts ajoutés aux trois workflows, sans modification d'actions/jobs/permissions/ruleset.

## PR #28 ouverte et contrôlée

Checkpoint5de0790 publié/vérifié ; PR #28 créée, base90d9356/head5de0790,37fichiers et4commits. Tous les blobs et toutes les lignes ajoutées/retirées de la vraie PR correspondent au diff local main...HEAD. Aucune revue/commentaire/thread ni conflit ; mergeable=true. Ce dernier complément modifie seulement le handoff, le backlog structuré et l'index pour y enregistrer #28 ; code167d20b inchangé et déjà six checks verts. Les contrôles push/PR du dernier HEAD documentaire doivent être observés jusqu'à la fin ; leurs liens seront consignés dans la description de #28.

PRET_A_PASSER indique une reprise durable, pas un accord merge ni la fin de L4. Aucun démarrage de B4d sur cette branche en attendant la décision de merge B4c. Toutes les autorisations restantes et exclusions précédentes restent inchangées.
