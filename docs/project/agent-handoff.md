# Handoff canonique Barbook

## État courant B4b

#26 est intégrée après accord explicite, main76f742b qualifié et toutes branches historiques préservées. WORK reprend seul sur feature/web-session-cutover. [Design B4b](l4-b4b-design.md) avant code ; ce bloc est documentaire, sa publication est le prochain commit sur la base vérifiée. Les photographies B4a ci-dessous sont historiques ; ne pas recréer #26 ni réimplémenter le store. Relire GitHub et le dernier handoff de branche pour continuer. Aucun nouveau merge, déploiement, migration propriétaire, L5 ou CONTRACT.



```yaml
checkpoint_utc: "2026-10-20T11:15:10.337753+00:00"
source_of_truth: "https://github.com/Alexdmt0110/Barbook"
phase: "B"
work_owner: "WORK"
handoff_status: "EN_COURS"
feature: "#26 mergée/main qualifié ; B4b Design Review et préparation des contrôles web"
branch: "feature/web-session-cutover"
base_branch: "main"
remote_head_sha: "76f742bc7de437fe7ed1d6528344be208d54159d"
local_head_sha: "76f742bc7de437fe7ed1d6528344be208d54159d"
worktree: "bloc de conception/pilotage et triggers de branche avant publication ; aucun code B4b"
pr: "#26 mergée le20octobre11:06:17UTC ; aucune PR B4b"
tests: "main76f742b : six checks success ;168backend+NYC,131frontend,88natifs,4Chromium,7migrations et audits zéro ; logs relus"
migrations: "sept migrations CI jetables seulement ; aucune nouvelle B4b ni base propriétaire"
changes_pushed: "#26 intégrée par76f742b ; nouvelle branche B4b publiée depuis ce main"
unpushed_changes: "ce bloc documentaire uniquement avant publication"
decisions_validated: "merge #26 ; poursuite des blocs L4 et D1/D2 déjà autorisés"
decisions_pending: "chaque nouveau merge ; D3–D8 sauf garde-fous ; L5/CONTRACT/production exclus"
next_atomic_step: "publier le design B4b puis préparer/tester les primitives web sans modifier encore les contrats actifs"
risks_and_blockers: "JWT encore actif ; cookie/CSRF web et drafts non livrés ; bascule API/UI devra être coordonnée"
production_effect: "aucun"
```

Cette photographie précède son propre commit. Il doit être l'unique successeur documentaire de6ffc67b sur cette branche à ce jalon, sans changement des blobs applicatifs/tests/SQL. La ref, l'historique et la description de la vraie PR consigneront le HEAD final et ses CI. Comparer aux faits distants ; ne pas reproduire un checkpoint ou ouvrir une seconde PR s'ils existent déjà. Ce document n'est pas un verrou technique.

## Dernier checkpoint sûr

Main `c99b08052e2e1494f621c7de8a7fb0831516bd1e` inchangé, #24/#25 réellement mergées et main vert. Branche L4 publiée depuis ce main ; GitHub pull/push=true. Branches dossiers95e21bc et docs/l3-merge-checkpoint39fd730 conservées ; trois commits originaux dossiers ancêtres de main et migrations historiques inchangées. Aucun travail concurrent annoncé ; WORK a repris avec l'autorisation explicite d'Alex dans cette conversation.

[Checkpoint L4](checkpoint-l4.md) : B4a schéma/store additifs et politiques approuvées, sans modification des routes JWT/Angular. [Design L4](l4-design.md) et [ADR0005](../adr/0005-revocable-web-sessions.md) publiés avant code. SessionService163lignes, CSPRNG32octets/hash unique, CSRF indépendant, timestamps DB et CHECK/FK/index, ReadCommitted exigé/verrou User partagé, verrou Session avant contrôle d'expiration, purge500sans scheduler. D1/D2 sont versionnées,66fiches préservées ; F003 partielle, nouvelles parties F001/F002/F051 non commencées.

## Tests et correction tracée

Local : backend verify168tests/19suites+1NYC, lint/build/Prisma, tscnoEmit incluant tests,10garde-fous et typage E2E passés. Frontend inchangé, verify131tests/21fichiers passé à la baseline de branche. Pas de PostgreSQL/Docker/Chromium local détecté/exécuté ; preuves natives/navigateur exclusivement Actions.

Code6ffc67b, six contrôles success : [CI39406606827](https://github.com/Alexdmt0110/Barbook/actions/runs/39406606827), [Integration39406606891](https://github.com/Alexdmt0110/Barbook/actions/runs/39406606891), [Security39406606861](https://github.com/Alexdmt0110/Barbook/actions/runs/39406606861). Logs relus :168backend+NYC,131frontend,10garde-fous,88natifs/6suites dont26store,4Chromium desktop/mobile,7migrations fresh/redeploy/status/drift sans différence et smoke dist/main.js ; audits complets/runtime backend/frontend et E2E zéro.

La première CI47b479d a réellement échoué19tests (69succès) sur CASE text*interval ; casts integer corrigés dans6ffc67b, mêmes88tests ensuite verts. Aucun contrôle désactivé, aucune assertion assouplie. Le [Review Gate](reviews/l4-b4a-review-gate.md) a été repris intégralement depuis main après correction, pas seulement du patch ; aucun BLOCKER/P1 restant identifié dans B4a. La vraie PR et ses propres contrôles restent à relire après publication de ces documents ; ils ne sont pas présumés verts par ce snapshot.

## Périmètre et prochain travail

Alex a validé la bêta privée avec admission serveur, édition/corbeille V1 sans autoriser L5/D5, session opaque PostgreSQL/cookie HttpOnly/Secure/CSRF/révocation/fixation, standard2h/12h et option non précochée7j/30j. Brouillons mémoire + sessionStorage24h, restauration explicite liée utilisateur/workspace/recette/version, purge volontaire/changement de compte, aucun secret ou replay/écrasement récent. Les recommandations anciennes30min/mémoire seule sont remplacées. D3–D8 restent ouverts sauf garde-fous déjà explicites.

Seul B4a est qualifié et proposé en PR au terme de cette session. B4b–B4f sont autorisés mais non réalisés : bascule coordonnée API/Angular, suppression Bearer, admission fermée/liste côté serveur, tolérance au storage bloqué, brouillons et protections multi-onglets/réseau. Aucune nouvelle autorisation de développement L4 n'est requise pour ces blocs ; chaque PR reste soumise à Alex avant son merge. Ne pas modifier une PR présentée comme prête sans actualiser scope, Gate et preuves. À la reprise, vérifier d'abord l'état de cette PR et l'éventuel accord/merge, puis la prochaine micro-tâche B4b ; ne pas réimplémenter le store.

Le store testé ne prouve pas un parcours web cookie/CSRF, un redémarrage de processus, des cookies refusés/TLS production ou des drafts opérationnels. Les18critères complets, tests de sécurité HTTP/navigateurs et limitations restent à produire en B4f. Purge non planifiée et scan potentiellement supérieur à500 ; charge/backup/restore/recovery Prisma/rollback de bascule/production non qualifiés. Aucun L5, CONTRACT, autre lot, base personnelle/production, infrastructure ou déploiement autorisé.

## Git / VM / SQL / Infra et passation

Git : trois commits publiés, arbre complet comparé à l'index avant création puis ref/message/fichiers/blobs distants vérifiés ; clone fast-forward propre avant ce bloc documentaire. API Git avec parent attendu, aucun force-push/écriture directe main/merge/suppression de branche. VM : aucune. SQL : nouvelle migration additive testée seulement sur bases CI jetables identifiées, six historiques inchangées. Infra : aucun changement ; règles/permissions/actions/jobs inchangés, seulement triggers push exacts de branche. Deux Quality requis, quatre autres checks observés, ruleset non modifié.

La photographie de clôture B4a ci-dessous précède la reprise explicite B4b : WORK est désormais EN_COURS selon le YAML courant. Aucun travail ne continue hors session. Work↔Chat classique : transfert explicite du propriétaire et arrêt de l'écrivain précédent avant toute écriture ; lecture/diagnostic possible en parallèle. Toujours comparer main/branche/SHA/PR/checks/travail local au handoff ; GitHub fait foi. Arrêt sur divergence, secret, opération propriétaire/destructive ou décision hors périmètre ; préserver l'historique, pas de reset destructif. Sources normatives privées identiques aux copies déjà lues ; Reprise/handoff relus, aucune source privée copiée dans Git public.
