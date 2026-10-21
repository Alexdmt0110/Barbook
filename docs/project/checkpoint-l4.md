# Checkpoint L4 — B4c intégré ; conception B4d

## Intégration vérifiée de #28 — 21 octobre 2026

Autorisation explicite exécutée. HEAD revu f44306a42ae232f725c5cabba123ea1fc44153e0, base90d9356 ; zéro commentaire/revue/thread, mergeable clean, six checks du dernier HEAD success (push et PR). Merge commit0c4a5580f3fe7d8e71c83c0434aadc3ce46d1e73, mergedAt2026-10-21T11:05:03Z ; parents90d9356/f44306a, arbre42fe8ccac17771d1e8367f276bf622ecfd63c557 identique au HEAD revu ; main confirmé à ce merge. Branches historiques conservées. Six checks post-merge success, logs relus :232backend/147frontend/118PG-HTTP/4Chromium, sept migrations jetables, audits zéro. Jobs119185986301/119185986485/119185986067/119185986403/119185986198/119185986930.

Branche feature/session-drafts créée depuis ce main qualifié ; [Design Review B4d](l4-b4d-design.md) avant code. B4d reste à implémenter. Aucun déploiement, migration propriétaire, changement infra, CONTRACT ni L5. Chaque nouvelle PR attend son propre accord de merge. Les états ci-dessous sont historiques.

# Checkpoint L4 — B4a/B4b intégrés, B4c qualifié sur branche

## État courant B4c — 21 octobre 2026

B4b intégré par #27 après accord explicite d'Alex ; main90d9356bae7a80ee3d0fa01ad1ce3e26b905d005, mergedAt07:39:25UTC, parents76f742b/1e52381 et arbre f817f3b identiques au head revu. Six checks post-merge main success, logs213backend/138frontend/111PG-HTTP/4Chromium relus. Branches historiques conservées ; aucune production.

B4c est développé et qualifié sur feature/private-beta-admission, code167d20b933523bd64cc33fb6c99c775ad543b956 après design70212e2 et admissionbca7b34. Admission dans AuthService avant lookup/hash/transaction ; REGISTRATION_ALLOWED_EMAILS vide/absente ferme les inscriptions, liste exacte normalisée côté serveur, aucune ouverture depuis UI/headers ni bypass d'environnement. Configuration invalide échoue sans exposer les valeurs. Refus403 générique, aucune ligne/Set-Cookie/révocation. Les comptes/sessions existants restent utilisables après retrait de la liste ; droits workspace inchangés.

BrowserStorageService protège getters ET méthodes local/session ; read→string|null, write/remove→booléen. Aucun clear global ni cache privé ; ThemeService conserve le signal mémoire et AuthService retire seulement l'ancienne clé JWT. La persistance de formulaires24h n'est pas encore implémentée.

Six checks code success : [Quality39567144917](https://github.com/Alexdmt0110/Barbook/actions/runs/39567144917), [Integration39567144688](https://github.com/Alexdmt0110/Barbook/actions/runs/39567144688), [Audits39567144907](https://github.com/Alexdmt0110/Barbook/actions/runs/39567144907). Logs relus : **232backend/22suites,147frontend/22fichiers,118PG-HTTP/8suites et4Chromium**. Sept migrations historiques fresh/redeploy/status/drift/smoke,10garde-fous, audits complets/runtime zéro. Local verify backend/frontend/Prisma/compatibilité NYC+CLI, tsc backend/E2E, safety et diffcheck passés ; PG/Chromium seulement en CI.

Sept nouveaux tests natifs admission : fermé/non admis, aucune création partielle/cookie/activité, exact/casse, aliases/suffixes refusés, champs/headers hostiles, comptes existants avec admission retirée et session préservée. Les historiques concurrence/rollback/isolation/CSRF/rejeu restent actifs. Fixtures : vraies listes exactes réservées avant bootstrap, zéro réservation pour fermeture, quatre inscriptions browser/quotas/retries conservés. Chromium étend le parcours d'expiration avec deux getters SecurityError, reconnexion cookie, thème mémoire puis reload/me sans persistance ni erreur JS ; aucune API simulée.

[Review Gate B4c](reviews/l4-b4c-review-gate.md) de toute la branche depuis main : aucun BLOCKER/P1 restant identifié. Code/migrations/locks/workflows/contrats/tests relus, pas de nouvelle dépendance ni modification de schéma/permission/ruleset. Publication documentaire seule puis vraie PR/diff/CI à vérifier, **merge soumis à Alex**.

B4d brouillons24h/restauration/purge/identité/workspace/version, B4e logout global/réauthentification et B4f qualification globale restent à réaliser. L4-01 et volet stockage de L4-14 exercés ; pas de clôture anticipée des critères brouillons/onglets/réseau complets. La liste privée n'est pas une vérification de possession d'email (D1 reporte celle-ci avant ouverture publique). Changer la liste demande un redémarrage ultérieur autorisé ; aucune liste réelle ni infra configurée ici. TLS/proxy/Safari/iOS/backup/restore/rollback propriétaire non qualifiés ; aucun L5/CONTRACT/déploiement.

## État courant — 21 octobre 2026, B4b qualifié sur branche

Main reste `76f742bc7de437fe7ed1d6528344be208d54159d` (#26 intégrée). La branche `feature/web-session-cutover` au code `8ff31b74b8643f21228fcfbf64fe1cc24e2ad1d8` active les sessions PostgreSQL, cookies HttpOnly, CSRF serveur, contexte attendu et bootstrap Angular ; Bearer/JWT et sa dépendance sont retirés. Aucun merge B4b ni déploiement. Les sections antérieures datées ci-dessous sont des preuves historiques, pas l'état actuel.

Six checks de ce code success : [Quality39559982719](https://github.com/Alexdmt0110/Barbook/actions/runs/39559982719), [Integration39559982657](https://github.com/Alexdmt0110/Barbook/actions/runs/39559982657), [Audits39559982741](https://github.com/Alexdmt0110/Barbook/actions/runs/39559982741). Logs relus : **213 backend,138 frontend,111 PostgreSQL/HTTP,4 Chromium desktop/mobile** ; dix garde-fous, sept migrations fresh/redeploy/status/drift et smoke, audits complets/runtime zéro. Local : verify backend/frontend, compatibilité NYC/CLI, tsc backend et E2E, safety et diffcheck passés ; pas de PostgreSQL/Chromium local prétendu.

Les quatre parcours réels incluent désormais deux onglets partageant le cookie, logout dans le second et invalidation du premier, rejeu401 du credential révoqué, reconnexion explicite, CSRF invalide403 sans dossier créé, expiration DB, cookie HttpOnly inaccessible à document.cookie et absence d'accessToken. Les unités avec le vrai AuthService/interceptor ordonnent un logout tardif après reconnexion et vérifient que la nouvelle session reste installée. HTTP/PG : compte A/contexte ancien avec cookie B refusé avant lecture/écriture/logout ; origine/CSRF manquants ou hostiles ne prolongent pas l'activité ; fixation/rotation, échéances et rollback testés. Aucune simulation d'API dans Chromium, aucune inscription ou retry supplémentaire ni quota assoupli.

[Review Gate B4b](reviews/l4-b4b-review-gate.md) repris sur toute la branche depuis main après les corrections Nest et dépendances : aucun BLOCKER/P1 restant identifié dans ce périmètre. Publication documentaire seule, puis vraie PR/diff/checks à contrôler ; **merge soumis à Alex**. Toutes les branches historiques conservées.

B4c admission privée/storage, B4d brouillons24h/restauration/purge/version et B4e logout global/courses approfondies restent à réaliser. La préservation de sessionStorage à expiration ne constitue pas une sauvegarde des formulaires. Aucun compte partagé/workspace sélectionnable n'est livré ; mismatch couvert par clients HTTP hostiles, pas par un sélecteur inexistant. TLS/Secure réel, proxy, Safari/iOS, backup/restore/rollback propriétaire et déploiement non qualifiés. L4 n'est pas terminé ; L5/CONTRACT/production restent exclus.

# Historique de qualification B4a

20 octobre 2026. Alex a validé D1a/D1b/D2a/D2b/D2c et autorisé les six blocs L4. **B4a est intégré par #26 après accord explicite ; B4b commence sur une nouvelle branche.** [Design et18critères](l4-design.md), [décisions](decisions.md), [Review Gate B4a](reviews/l4-b4a-review-gate.md), [handoff canonique](agent-handoff.md).

## Git et périmètre

| Référence vérifiée | État |
| --- | --- |
| main | `c99b08052e2e1494f621c7de8a7fb0831516bd1e`, inchangé ; #25 mergée le20octobre08:53:33UTC, six checks verts |
| branche active | `feature/secure-web-sessions`, depuis ce main ; aucun historique réécrit |
| conception | `51d4b675e0f30487edbc55887996a1f1a2939437`, décisions/design publiés avant code, six checks de baseline success |
| préparation initiale | `47b479d534effd8383aa3ab426b5c7d3436c3128`, store/migration/tests ; CI native rouge sur CASE sans cast |
| code corrigé et qualifié | `6ffc67b7b2c5f69437d3209ee335e4e0e1a1219e`, casts integer explicites ; six checks success |
| branche dossiers | `95e21bc0fd1ce1f289bc0a2ba07f7200ad5f0312`, conservée, ses trois commits initiaux ancêtres de main |
| checkpoint L3 | docs/l3-merge-checkpoint `39fd7303f20a15f81422cc20fe68b7473d505330`, conservée ; #24/#25 déjà intégrées |

Ce document précède sa propre publication. Son commit documentaire sera le successeur de6ffc67b, sans changement applicatif ; vérifier la ref exacte et la PR de cette branche sur GitHub. La description PR consigne le HEAD final et ses checks effectivement terminés. Aucun SHA auto-référentiel inventé, aucun second checkpoint/PR à créer à la reprise si déjà présent.

## Résultat B4a

- Modèle Session additif : hash unique du credential opaque, CSRF aléatoire indépendant, propriétaire User/FK cascade, échéances et révocation timestamptz/CHECK/index.
- Store transactionnel : création, validation/activité plafonnée à l'absolue, révocation individuelle/globale et purge500. ReadCommitted explicite, verrou User partagé ; contrôle d'expiration après verrou Session pour éviter une prolongation après attente.
- Politiques exactes décidées :2h inactive/12h absolue standard ; option7j/30j, sans activation implicite. Aucune horloge client utilisée par le store.
- Durabilité du code/pilotage : commits atomiques immédiatement publiés par API avec parent attendu, arbre entier comparé à l'index avant commit ; SHA/message/fichiers/blobs distants vérifiés puis clone fast-forward propre.

Le store est enregistré dans AuthModule mais **n'est pas appelé par les routes actuelles**. Login/register/me, JwtAuthGuard, les réponses accessToken et Angular/sessionStorage JWT restent identiques. La table seule ne fournit pas de cookie, CSRF HTTP, admission privée ni restauration de brouillon. Pas de fallback JWT à maintenir après la future bascule ; son retrait coordonné relève de B4b.

## Vérifications réellement exécutées

| Environnement | Exécution et résultat |
| --- | --- |
| local Node24.19/npm11.9 | backend verify : lint zéro warning, build,168tests/19suites, Prisma generate/validate et1test NYC ; tscnoEmit incluant tests,10garde-fous ; diffcheck et typage E2E |
| frontend local inchangé | verify : lint/build,131tests/21fichiers à la baseline ; code frontend non modifié ensuite |
| CI Quality | [run39406606827](https://github.com/Alexdmt0110/Barbook/actions/runs/39406606827), Backend Quality118573951607 et Frontend Quality118573951185 success ;168/131 confirmés dans les logs |
| CI PostgreSQL16 réel | [run39406606891/job118573952324](https://github.com/Alexdmt0110/Barbook/actions/runs/39406606891/job/118573952324) success ;10garde-fous,88tests/6suites,7migrations fresh/redeploy/status/drift sans différence et smoke compilé |
| CI Chromium réel | [même run/job118573952504](https://github.com/Alexdmt0110/Barbook/actions/runs/39406606891/job/118573952504) success ;4parcours existants desktop1365/mobile390 contre API/PG, sept migrations ; aucun mock API |
| CI sécurité dépendances | [run39406606861](https://github.com/Alexdmt0110/Barbook/actions/runs/39406606861), jobs118573951893/118573951667 success ; audits complets/runtime backend/frontend zéro, audit E2E zéro dans Browser |
| inspection statique |24fichiers contre main avant checkpoint ; DDL Session conforme à la référence Prisma hors CHECK additionnels ; six anciennes migrations et migration_lock inchangés ;66IDs et seules4fiches de suivi L4 changées ; liens/YAML/diff vérifiés |

Les26tests du store exercent PostgreSQL réel : deux modes/durées et renouvellement, plafond absolu, expirations/replay, expiration pendant attente de verrou sans modification de ligne, autre instance Nest, rollbacks, user disparu/isolation refusée, deux ordres création/global, activité/révocation, CHECK/FK/unicité/cascade et purge préservant les actives. Le test d'upgrade supplémentaire conserve comptes/workspaces/recettes/liens. Aucun test nouveau désactivé ou remplacé par un mock.

Première CI native47b479d :19échecs/69succès, erreur42883 text*interval dans le CASE ; corrigée par6ffc67b, même suite ensuite88succès. Review Gate repris sur toute la branche après correction : aucun BLOCKER/P1 restant identifié dans B4a. La CI rouge reste traçable. Aucun PostgreSQL/Chromium local exécuté ; les preuves natives/navigateur viennent uniquement d'Actions. Les suites existantes ne constituent pas des tests de la future UI cookie.

## Suite L4 et limites

| Bloc | Statut et prochaine preuve |
| --- | --- |
| B4a | qualifié sur branche, Review Gate terminé ; vraie PR/diff/checks à finaliser après publication documentaire ; merge à valider |
| B4b | autorisé, non commencé : contrats/cookie/CSRF, inscription transactionnelle avec Session, guard/endpoints, identité attendue et bootstrap Angular, retrait Bearer coordonné ; fixation/replay/CSRF/401 et tests web réels |
| B4c | autorisé, non commencé : admission serveur fermée/liste et getters/méthodes storage tolérants ; pas de bypass test |
| B4d | autorisé, non commencé : mémoire + sessionStorage24h, restauration explicite utilisateur/workspace/recette/version, purge volontaire/changement de compte et résultat inconnu sans replay |
| B4e | autorisé, non commencé : logout global après réauthentification, onglets/changement A→B/activité/réseau/requêtes en vol et tests UI/HTTP supplémentaires |
| B4f | non réalisé pour L4 complet : Review Gate global,18critères complets, parcours de sécurité/navigateurs, contrats/docs et checkpoint final |

Le store prouve des sous-cas de L4-05/06/07/18 ; aucun critère HTTP/UI entier n'est fermé par anticipation. L4-01/02/03/04/08–17 attendent leurs vrais parcours, même si des briques ou invariants internes sont déjà testés. Autre instance Nest ne vaut pas qualification du redémarrage d'un processus de production. Cookie Secure/TLS/cookies refusés, CSRF serveur et appareils partagés restent non qualifiés. La purge n'est pas planifiée et son scan n'est pas garanti borné à500 ; mesurer avant échelle supérieure.

D1b inclut édition/corbeille dans la V1, mais L5 et D5/rétention restent exclus du développement L4. D3/D4/D6/D7/D8 et CONTRACT non clos. Pas d'application sur base propriétaire, recovery Prisma/backup/restore/rollback de bascule, VPS ou production. Branches historiques préservées, ruleset inchangé (deux Quality requis ; quatre autres checks observés). Git : commits/push/PR seulement. VM : aucune. SQL : sept migrations uniquement en bases CI jetables. Infra : aucun changement.

## Intégration vérifiée de B4a et reprise B4b

#26 effectivement mergée le20octobre2026 à11:06:17UTC par76f742bc7de437fe7ed1d6528344be208d54159d, parentsc99b080/4c97d89, arbre4be600b0c3957131a0d021ed8a21655e080b36d3 identique au head revu. Main à ce SHA, six checks post-merge success : [Quality39412588451](https://github.com/Alexdmt0110/Barbook/actions/runs/39412588451), [Integration39412588433](https://github.com/Alexdmt0110/Barbook/actions/runs/39412588433), [Security39412588400](https://github.com/Alexdmt0110/Barbook/actions/runs/39412588400). Logs relus168backend,131frontend,88natifs,4Chromium, sept migrations et audits zéro. Branches historiques toutes conservées à leurs refs antérieures.

Nouvelle branche feature/web-session-cutover depuis76f742b ; [revue B4b](l4-b4b-design.md). Les photographies pré-merge ci-dessus sont conservées comme preuves historiques, pas comme état courant de la PR. B4b reste à réaliser ; aucune bascule cookie/CSRF ni protection de draft déjà livrée. Les autorisations/exclusions L4 restent inchangées.

## B4b — premier micro-bloc préparatoire qualifié

Code6500544141a5511fd76c5142990108b0712e1452, après design publiéa69daab : helpers web-session-security et44tests HTTP sur contrôleur de test exclu du build ; inspection Session sans activité et deux tests PG supplémentaires. Aucun nouveau guard/middleware actif, AuthController, contrat API, frontend ou dépendance modifié. B4b n'est pas terminé : les routes utilisent encore JWT, les helpers ne protègent pas encore les requêtes métier.

Six checks success : [Quality39414957581](https://github.com/Alexdmt0110/Barbook/actions/runs/39414957581), [Integration39414957572](https://github.com/Alexdmt0110/Barbook/actions/runs/39414957572), [Security39414957578](https://github.com/Alexdmt0110/Barbook/actions/runs/39414957578). Logs relus :212backend/20suites+NYC,131frontend,90natifs/6suites,4Chromium,10garde-fous, sept migrations/drift/smoke et audits zéro. Local verify/lint/build/Prisma/tsc/safety passés ; aucun PG/Chromium local prétendu.

Prochain bloc : guard/cookies/CSRF/login/register/me/logout et Angular coordonnés, adaptation des fixtures en conservant leurs assertions, qualification native et navigateur puis Review Gate complet avant une PR B4b. Aucune PR B4b ouverte pour cette préparation partielle. Risques de protocole avant activation : logout tardif vs login récent, réponse A tardive après B, absence de replay, cookies refusés après compte réellement créé. Journal de reprise courant obligatoire ; aucune nouvelle autorisation de développement L4 nécessaire, chaque merge futur reste distinct.

PR B4b : [#27](https://github.com/Alexdmt0110/Barbook/pull/27) ouverte, non mergée ; diff réel70fichiers/9commits vérifié au checkpoint479a4b8, aucun commentaire/revue/conflit. Ce complément est documentaire seulement ; vérifier les six checks du dernier HEAD puis attendre Alex pour le merge.

## B4d — premier micro-bloc mémoire/identité

Store borné versionné, TTL24h, lease après identité /me, suspension conservatrice, purge volontaire avant HTTP et invalidation des callbacks. Messages logout/identité inter-onglets sans secret. Mémoire de repli et signal explicite de purge impossible. Local frontend verify : lint/build,157tests/23fichiers, compatibilité CLI passés. Les formulaires ne l'utilisent pas encore ; B4d reste incomplet. Prochain bloc : intégration création/organisation/restauration/version et tests réels. CI de ce commit à observer, aucune PR ni merge.

## B4d — intégration des formulaires et des décisions explicites

Après store8debc7b (six checks success), création et organisation utilisent un brouillon brut borné, par identité/workspace/ID stable, avec TTL24h et restauration/abandon explicites. Version d’origine, refus des écritures anciennes et expectedVersion serveur conservés. Guard de sortie, avertissement mémoire et purge impossible, résultat inconnu avant envoi et absence de replay. Deux corrections préventives : purge mémoire lors de changements successifs sous storage bloqué ; anciens handles invalidés à toute suspension. Si marqueur incertain ET effacement refusés, mutation bloquée avant HTTP pour empêcher la résurrection d’un snapshot non marqué.

Local frontend verify :170tests/24fichiers, lint/build/compatibilité CLI success ; typage E2E success. Les quatre parcours Chromium existants sont étendus sans inscription/retry/quota ajouté : refresh création, restauration version obsolète après409, logout inter-onglets avec saisie, expiration/reconnexion même compte, mémoire/purge sous getters refusés, et POST réellement committé dont seule la réponse est coupée. Ces ajouts navigateur restent à exécuter en CI ; aucune preuve PG/Chromium locale prétendue. Prochaine étape : six checks, correction éventuelle, Review Gate complet depuis main et documentation avant nouvelle PR. Aucun merge/déploiement/SQL propriétaire/infra/L5/CONTRACT.

## B4d — correction avant Review Gate

Checkpointdde10833e7d5da20910414b540e7b6a733495b78 publié, arbreaad78750fc0e0522650791739366b9ccd43a4b3c et26blobs vérifiés, clone propre. CI : cinq checks success ; Browser Integration119212258119 échoue sur les quatre essais pour deux causes. La lecture de vérification directe omettait les headers de contexte (409 attendu par la protection serveur). Le logout détruit le router-outlet privé avant le guard : les traces Chromium desktop/mobile confirment « Cannot read properties of null (reading canLeave) ». Corriger le client de test sans desserrer le serveur ; guard tolérant au composant déjà détruit avec test de régression.

Revue supplémentaire : whitelist exacte des contrôles et version de création avant FormGroup.setValue (évite crash sur champ inconnu), validation répétée au moment de restaurer ; formulaire inerte pendant mutation pour éviter de perdre une saisie modifiée en vol.172tests frontend/25fichiers locaux passés après ces corrections, typecheck E2E passé. Requalifier six checks et reprendre toute la revue main...branche après publication ; aucune PR encore ouverte, aucun merge.
