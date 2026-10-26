# Backlog d'exécution

## Suivi L5 — 26 octobre 2026

Édition, brouillons d'édition et cycle personnel intégrés jusqu'à #37/main7a9464bf qualifié six contrôles. B5f/PR38 vérifie les dix critères et complète les courses de restauration ; BB0 non encore clos à ce checkpoint. Voir [matrice](l5-closure.md). F016 reste partielle au sens du catalogue : archivage et purge exclus. Prochain incrément prioritaire après qualification : BB1. Les observations d'audit du16octobre restent historiques ; les statuts d'exécution JSON reflètent la progression.


## Priorité courante — mandat Bêta Bar du 24 octobre 2026

Les66IDs sont conservés. [Plan/acceptation/dépendances/arbitrages](beta-bar-plan.md) remplace l'ordre historique. MUST : F016 récupération personnelle, F008–010 collaboration/copie, F011 attribution indispensable, F030 produits/conditionnements, F036–038 batchs indépendants du stock, F045/F046 compteurs manuels+historique simple+seuil/cible, F047 section À recommander uniquement. BB-INVENTAIRE-01 exclut consommation automatique/théorique, débit batch, mL restants, ledger comptable, réception attendue et commandes. Stock non négatif,0−1refusé ; si stock≤seuil suggestion=max(0,cible−stock). F055/056/058 : préparation OPS seulement ; F012 : retrait membre seulement.

Édition B5c intégrée via #34/98b6658 ; L5 encore partiel. Priorité immédiate : audits post-merge rouges à corriger puis main six checks avant B5d/e/f. Le statut approuvé ne signifie pas développé : aucun batch, ledger ou sélecteur partagé livré à ce checkpoint. Pas de fonctionnalité avancée d'une fiche implicitement autorisée par sa repriorisation.

## État courant L5 — B5a intégré, B5b développé sur branche

PR32 fusionnée avec accord explicite, main `dfe39a2` qualifié par six checks post-merge (238/191/160/4, audits zéro). B5b sur `feature/recipe-content-editing`, PR33 : design407b0b0, bascule API/Angular1e2bb39 et contenu atomique/ABV74999ee ; fixtures corrigées6a7b3d2/830c47d sans changement produit. **Code830c47d qualifié : sixchecks et sixlogs261backend/192frontend/187PG-HTTP/4Chromium, audits0** ; captures desktop/mobile inspectées. Derniers documents/checkpoint doivent obtenir leurs sixchecks avant ready. [Design](l5-b5b-design.md), [contrat](../maintenance/recipe-lifecycle.md), [Gate](reviews/l5-b5b-review-gate.md). B5c–f restent à réaliser après accords de merge et main qualifié. Aucun merge33 autorisé ; aucun OPS/L6–L8. Les anciens états ci-dessous sont historiques.


## L5 — autorisé le 22 octobre 2026, Design Review bloquée avant code

D5 validée (corbeille30joursserveur, expiration≠effacement, identité/slug/liens valides conservés, pas de purge/archivage/média). L5 B5a–B5f autorisé dans le carnet personnel ; chaque merge distinct. Main94552a9/#31 et sixchecks recontrôlés, aucune PR ouverte initialement. Branche feature/recipe-lifecycle-contracts publiée immédiatement depuis ce main dans un worktree propre, ancien instantané L4 intact.

[Design Review transversale](l5-design.md) : **L5-COMPAT-01 bloque avant modèle/code**. Les anciennes mutations de liens sans version ne permettent pas de distinguer une intention avant suppression/restauration d'une nouvelle intention. Proposition B : conserver les routes mais exiger une précondition adaptée sur toutes les écritures de classement ; accord d'Alex nécessaire sur cette incompatibilité, aucune règle implicite appliquée. [D5 et décisions](decisions.md), [checkpoint](checkpoint-l5.md). Aucun test applicatif/migration/SQL/workflow modifié, pas de PR avant arbitrage. Pas de L6–L8/CONTRACT/infra/déploiement ni basepropriétaire. Les états précédents sont historiques.


## Clôture technique courante — 22 octobre 2026

L4 B4a–B4f est **CLOTURE_TECHNIQUEMENT_SUR_MAIN**, après autorisation explicite et merge de [#30](https://github.com/Alexdmt0110/Barbook/pull/30). Main `0f63272ddbe7bb3a884384531e9b41a314d09525`, arbre `d1b5acab59c9077a7ba8ec5a968d84ae693f6526` identique au HEAD qualifié `5e1660f`. Les six contrôles post-merge sont success, leurs six journaux relus : **238 backend, 191 frontend, 141 PostgreSQL/HTTP, 4 Chromium** ; audits complets/runtime zéro. Les 18 critères sont satisfaits dans le périmètre de preuves et limites de la [matrice](l4-b4f-qualification.md), sans BLOCKER/P1 L4 identifié.

[Bilan de clôture](l4-closure.md) : fonctionnalités livrées, vérifications, risques résiduels et conditions avant production. Le présent suivi documentaire est publié sur `docs/l4-closure` et nécessite une nouvelle PR et une autorisation de merge distincte ; il n'est pas encore intégré à main. Développement arrêté : **L5 non autorisé**. Aucun déploiement, migration personnelle/production, changement d'infrastructure ou CONTRACT. Les états antérieurs ci-dessous sont historiques.

Le [catalogue détaillé](audit/03-Vision-et-catalogue.md) et [backlog.json](backlog.json) conservent les 66 identifiants. Le [registre des 24 constats](audit/02-Audit-qualite-securite-UX.md) est une photographie d'audit ; les preuves d'exécution ci-dessous et le handoff font foi pour la phase B. Une autorisation partielle ne valide pas toute la fiche associée.

| ID | Priorité / lot | État vérifié | Résultat attendu et critères | Preuve / dépendances |
| --- | --- | --- | --- | --- |
| BB-L0-01 / F060 | MUST / L0 | MERGE #20 ; main vert | Créer une branche, publier un commit atomique et relire ses fichiers sur GitHub ; versions du pilotage et single writer | branche docs/project-pilotage ; handoff et revue L0 |
| BB-L1-01 / A001 | MUST / L1 | MERGE #21 ; main vert | Nom produisant new rejeté ou rendu routable de façon cohérente ; cas normal et route de création inchangés ; pas de 500 | règles métier + DTO/service + frontend ; contrat documenté |
| BB-L1-02 / A002 | MUST / L1 | MERGE #21 ; main vert | mainAlcoholName:null traité comme absence facultative ; nom valide inchangé ; valeur mal typée rejetée en 400 ; aucun normalize sur null | tests DTO, service et HTTP pertinent |
| BB-L1-03 / A004 | MUST / L1 | MERGE #22 ; audits zéro et main vert | Audit runtime et complet daté ; chemins et exposition réels analysés ; correctifs compatibles testés ; aucune alerte exploitable connue laissée sans traitement ou décision tracée | locks ; npm audit ; verify frontend/backend ; aucun fix --force aveugle |
| BB-L2-01 / A003 / F057 | MUST / L2 | MERGE #23 ; main vert | Base PostgreSQL jetable identifiée ; migrations vierges et statut réels ; CHECK, FK composites et unicités prouvés | aucune DB de propriétaire ; pas de reset ni de seed réinitialisant |
| BB-L2-02 / F057 | MUST / L2 | MERGE #23 ; main vert | Inscription atomique, rollback de création et classement, concurrence et refus de liens cross-workspace vérifiés sur vraie DB | HTTP réel avec auth, DTO et config bootstrap de production partagée |
| BB-L2-03 / F057 | MUST / L2 | MERGE #23 ; main vert | Parcours inscription/connexion, création/relecture/classement/filtrage et expiration ; desktop/mobile ; traces sur échec | navigateur réel et API/PostgreSQL ; aucun mock ne remplace ces preuves |
| BB-L2-04 / F057 | MUST / L2 | MERGE #23 ; main vert | CI exécute les nouveaux tests et conserve Backend Quality/Frontend Quality ; échecs bloquants ; pas de secrets ni déploiement | YAML, résultats Actions et docs commandes |

Statuts : APPROUVE → EN_COURS → A_REVOIR → PR_OUVERTE → MERGE_AUTORISE → MERGE → VERIFIE_DANS_ENVIRONNEMENT. BLOQUE et DIFFERE doivent nommer une cause et un prochain pas. Un merge n'est pas autorisé implicitement par PR_OUVERTE.

Les dettes A005–A024 restent visibles dans l'audit ; A017 reçoit une correction ciblée dans #23 et A019 un pilotage versionné dans #20. Elles ne sont pas toutes approuvées pour implémentation dans L1/L2 ; un défaut découvert qui empêche les tests des parcours existants doit être diagnostiqué et corrigé proportionnellement dans une branche adaptée, avec traçabilité. Aucune dette n'est considérée acceptée par le silence du propriétaire.


## Résultats complémentaires révélés par L2

| ID | Branche / PR | Résultat vérifié | Suite |
| --- | --- | --- | --- |
| BB-L2-05 / A017 | test/critical-integration-flows / #23 | course Ingredient reprise dans une transaction neuve, ABV concurrents conservés, limite de trois tentatives | requalification combinée après merges |
| BB-L2-06 / A025 | même branche / #23 | dist/main.js et démarrage compilé /api verts | environnement réel non qualifié |
| BB-L2-07 / A026 | même branche / #23 | CHECK garniture TOP_UP et refus/rollback historique testés | aucun déploiement/migration propriétaire ; prévalidation et récupération Prisma avant toute opération réelle |
| BB-L2-08 / A027 | même branche / #23 | sélection DOM du dossier au chargement et après création corrigée, assertions rouges avant/vertes après | dossiers multiples réservés à L3 |

Le [checkpoint détaillé L0–L2](checkpoint-l0-l2.md) contient les preuves CI, limites, décisions attendues et stratégie L3. Les quatre PR sont mergées et main qualifié ; aucun environnement propriétaire/VPS n’a été vérifié.


## L3 — F023/F024 développées dans le périmètre approuvé

Statut MERGE dans le périmètre B3a–B3c, [PR #24](https://github.com/Alexdmt0110/Barbook/pull/24) fusionnée après accord explicite le 19 octobre à 14:08:14 UTC. Main `d7ea95f7827a5b96b5ad4b17ef73fa4982c2ad22`, six checks success ; code/tests identiques à b0bb757. Branche dossiers et ses trois commits préservés à 95e21bc. F023 garde CONTRACT non approuvé : MERGE_PARTIEL_B3A_B3C ; F024 est MERGE, sans prétention de validation en production.

| Sous-lot | Résultat / acceptation vérifiée | État |
| --- | --- | --- |
| BB-L3-01 | trois commits originaux conservés et main fusionné sans réécriture | qualifié |
| BB-L3-02 | migration additive, deux ordres SQL, refus sans perte, FK/versions | qualifié en CI uniquement |
| BB-L3-03 | classement complet multi/version, compatibilité legacy sûre, courses et rollback | qualifié |
| BB-L3-04 | fiche multi, sélection/recherche/pagination,409 conserve le brouillon | qualifié desktop/mobile |
| BB-L3-05 | index/détail/CRUD, ajout jusqu'à 100 recettes, retrait local/idempotence et suppression sans recette perdue | qualifié API/DB/UI |
| BB-L3-06 |131 frontend,151 backend+NYC, 61 natifs,4 Chromium, trois thèmes et clavier, documentation/revue | #24 mergée après accord ; six checks main success, logs relus |

Preuves et limites : [checkpoint-l3.md](checkpoint-l3.md), [Review Gate](reviews/l3-review-gate.md), [contrats](../maintenance/folder-management.md). F023 garde le CONTRACT futur ; A006 garde la bascule réelle à qualifier, A015 est partiel et A016 reste ouvert. Les autres fiches/décisions ne sont pas autorisées par ces résultats.

## L4 — autorisé le 20 octobre 2026

D1a/D1b/D2a/D2b/D2c validées, [design et critères](l4-design.md). #25 documentaire est mergée dans main c99b080 et qualifiée ; ne pas la recréer. Branche dédiée `feature/secure-web-sessions`, B4a intégré par #26 dans main76f742b, six checks post-merge success. B4b commence sur feature/web-session-cutover. Les fiches F001/F002/F003/F051 sont partiellement autorisées dans ce périmètre, pas toutes leurs évolutions futures.

| Bloc | Résultat attendu | État |
| --- | --- | --- |
| BB-L4-01 / B4a | contrats/ADR et store Session additif qualifiés ;88natifs dont26store, sept migrations ; auth actuelle préservée | MERGE #26 ; main76f742b qualifié |
| BB-L4-02 / B4b | API/UI cookie/CSRF et contexte coordonnés, retrait Bearer | MERGE #27 ; main90d9356 qualifié |
| BB-L4-03 / B4c | admission serveur fermée/liste, storage refusé toléré | MERGE #28 ; main0c4a558 qualifié |
| BB-L4-04 / B4d / A010 / A012 | brouillons mémoire/sessionStorage 24 h, restauration isolée explicite, versions | #29 MERGEE de86dd0 ; six checks main qualifiés |
| BB-L4-05 / B4e | révocation globale, activité/onglets/réseau et courses | MERGE #30 ; main0f63272 et six checks post-merge success |
| BB-L4-06 / B4f | Review Gate complet, six checks, vraie PR et handoff | CLOTURE_TECHNIQUEMENT_SUR_MAIN ; 18critères revalidés, aucun BLOCKER/P1 L4 |

État historique B4a : les critères L4-01 à L4-18 n’étaient pas encore déclarés passés ; voir la clôture courante en tête. B4a ne sécurise pas à lui seul les parcours JWT. L5, D5/rétention, CONTRACT, infrastructure et production restent exclus ; les branches historiques sont conservées.

Preuves B4a et limites : [checkpoint-l4.md](checkpoint-l4.md), [Review Gate](reviews/l4-b4a-review-gate.md). F003 demeure partielle ; F001/F002/F051 sont approuvées mais leur nouvelle implémentation web n'a pas commencé. Aucune inscription privée/cookie/CSRF HTTP/restauration de brouillon prétendue livrée par le store seul.

Reprise B4b : [design préventif](l4-b4b-design.md). Préparation des contrôles web puis bascule coordonnée API/UI ; transport des fixtures actualisé sans retirer leurs assertions. Aucun cookie/CSRF HTTP/draft encore opérationnel à ce jalon documentaire.

B4b première préparation qualifiée au code6500544 :44tests HTTP de primitives et2PG d'inspection supplémentaires, total212backend/90natifs. Les routes JWT et Angular restent inchangés ; bascule coordonnée non réalisée. Pas de PR B4b avant qualification complète. Handoff et checkpoint-l4.md contiennent la prochaine micro-tâche sans nouveau besoin d'autorisation L4.

## État courant — 21 octobre 2026, B4b qualifié sur branche

Main reste `76f742bc7de437fe7ed1d6528344be208d54159d` (#26 intégrée). La branche `feature/web-session-cutover` au code `8ff31b74b8643f21228fcfbf64fe1cc24e2ad1d8` active les sessions PostgreSQL, cookies HttpOnly, CSRF serveur, contexte attendu et bootstrap Angular ; Bearer/JWT et sa dépendance sont retirés. Aucun merge B4b ni déploiement. Les sections antérieures datées ci-dessous sont des preuves historiques, pas l'état actuel.

Six checks de ce code success : [Quality39559982719](https://github.com/Alexdmt0110/Barbook/actions/runs/39559982719), [Integration39559982657](https://github.com/Alexdmt0110/Barbook/actions/runs/39559982657), [Audits39559982741](https://github.com/Alexdmt0110/Barbook/actions/runs/39559982741). Logs relus : **213 backend,138 frontend,111 PostgreSQL/HTTP,4 Chromium desktop/mobile** ; dix garde-fous, sept migrations fresh/redeploy/status/drift et smoke, audits complets/runtime zéro. Local : verify backend/frontend, compatibilité NYC/CLI, tsc backend et E2E, safety et diffcheck passés ; pas de PostgreSQL/Chromium local prétendu.

Les quatre parcours réels incluent désormais deux onglets partageant le cookie, logout dans le second et invalidation du premier, rejeu401 du credential révoqué, reconnexion explicite, CSRF invalide403 sans dossier créé, expiration DB, cookie HttpOnly inaccessible à document.cookie et absence d'accessToken. Les unités avec le vrai AuthService/interceptor ordonnent un logout tardif après reconnexion et vérifient que la nouvelle session reste installée. HTTP/PG : compte A/contexte ancien avec cookie B refusé avant lecture/écriture/logout ; origine/CSRF manquants ou hostiles ne prolongent pas l'activité ; fixation/rotation, échéances et rollback testés. Aucune simulation d'API dans Chromium, aucune inscription ou retry supplémentaire ni quota assoupli.

[Review Gate B4b](reviews/l4-b4b-review-gate.md) repris sur toute la branche depuis main après les corrections Nest et dépendances : aucun BLOCKER/P1 restant identifié dans ce périmètre. Publication documentaire seule, puis vraie PR/diff/checks à contrôler ; **merge soumis à Alex**. Toutes les branches historiques conservées.

B4c admission privée/storage, B4d brouillons24h/restauration/purge/version et B4e logout global/courses approfondies restent à réaliser. La préservation de sessionStorage à expiration ne constitue pas une sauvegarde des formulaires. Aucun compte partagé/workspace sélectionnable n'est livré ; mismatch couvert par clients HTTP hostiles, pas par un sélecteur inexistant. TLS/Secure réel, proxy, Safari/iOS, backup/restore/rollback propriétaire et déploiement non qualifiés. L4 n'est pas terminé ; L5/CONTRACT/production restent exclus.

PR B4b : [#27](https://github.com/Alexdmt0110/Barbook/pull/27) ouverte, non mergée ; diff réel70fichiers/9commits vérifié au checkpoint479a4b8, aucun commentaire/revue/conflit. Ce complément est documentaire seulement ; vérifier les six checks du dernier HEAD puis attendre Alex pour le merge.

## État courant B4c — 21 octobre 2026

B4b intégré par #27 après accord explicite d'Alex ; main90d9356bae7a80ee3d0fa01ad1ce3e26b905d005, mergedAt07:39:25UTC, parents76f742b/1e52381 et arbre f817f3b identiques au head revu. Six checks post-merge main success, logs213backend/138frontend/111PG-HTTP/4Chromium relus. Branches historiques conservées ; aucune production.

B4c est développé et qualifié sur feature/private-beta-admission, code167d20b933523bd64cc33fb6c99c775ad543b956 après design70212e2 et admissionbca7b34. Admission dans AuthService avant lookup/hash/transaction ; REGISTRATION_ALLOWED_EMAILS vide/absente ferme les inscriptions, liste exacte normalisée côté serveur, aucune ouverture depuis UI/headers ni bypass d'environnement. Configuration invalide échoue sans exposer les valeurs. Refus403 générique, aucune ligne/Set-Cookie/révocation. Les comptes/sessions existants restent utilisables après retrait de la liste ; droits workspace inchangés.

BrowserStorageService protège getters ET méthodes local/session ; read→string|null, write/remove→booléen. Aucun clear global ni cache privé ; ThemeService conserve le signal mémoire et AuthService retire seulement l'ancienne clé JWT. La persistance de formulaires24h n'est pas encore implémentée.

Six checks code success : [Quality39567144917](https://github.com/Alexdmt0110/Barbook/actions/runs/39567144917), [Integration39567144688](https://github.com/Alexdmt0110/Barbook/actions/runs/39567144688), [Audits39567144907](https://github.com/Alexdmt0110/Barbook/actions/runs/39567144907). Logs relus : **232backend/22suites,147frontend/22fichiers,118PG-HTTP/8suites et4Chromium**. Sept migrations historiques fresh/redeploy/status/drift/smoke,10garde-fous, audits complets/runtime zéro. Local verify backend/frontend/Prisma/compatibilité NYC+CLI, tsc backend/E2E, safety et diffcheck passés ; PG/Chromium seulement en CI.

Sept nouveaux tests natifs admission : fermé/non admis, aucune création partielle/cookie/activité, exact/casse, aliases/suffixes refusés, champs/headers hostiles, comptes existants avec admission retirée et session préservée. Les historiques concurrence/rollback/isolation/CSRF/rejeu restent actifs. Fixtures : vraies listes exactes réservées avant bootstrap, zéro réservation pour fermeture, quatre inscriptions browser/quotas/retries conservés. Chromium étend le parcours d'expiration avec deux getters SecurityError, reconnexion cookie, thème mémoire puis reload/me sans persistance ni erreur JS ; aucune API simulée.

[Review Gate B4c](reviews/l4-b4c-review-gate.md) de toute la branche depuis main : aucun BLOCKER/P1 restant identifié. Code/migrations/locks/workflows/contrats/tests relus, pas de nouvelle dépendance ni modification de schéma/permission/ruleset. Publication documentaire seule puis vraie PR/diff/CI à vérifier, **merge soumis à Alex**.

B4d brouillons24h/restauration/purge/identité/workspace/version, B4e logout global/réauthentification et B4f qualification globale restent à réaliser. L4-01 et volet stockage de L4-14 exercés ; pas de clôture anticipée des critères brouillons/onglets/réseau complets. La liste privée n'est pas une vérification de possession d'email (D1 reporte celle-ci avant ouverture publique). Changer la liste demande un redémarrage ultérieur autorisé ; aucune liste réelle ni infra configurée ici. TLS/proxy/Safari/iOS/backup/restore/rollback propriétaire non qualifiés ; aucun L5/CONTRACT/déploiement.


État courant21octobre : #28 intégrée après autorisation explicite, main0c4a558/six checks post-merge success. B4d sur feature/session-drafts, code2062903 ;175frontend/232backend/118PG-HTTP/4Chromium requalifiés, six checks success. [Design](l4-b4d-design.md), [Review Gate](reviews/l4-b4d-review-gate.md), [contrat brouillons](../maintenance/temporary-drafts.md). Chaque nouvelle PR reste soumise à un accord de merge distinct ; B4e/B4f ne sont pas clôturés.

PR #29 ouverte,42fichiers/7commits au checkpointa80c160, vrai diff/blobs relus et douze checks push+PR success. Ce complément de pilotage est documentaire ; observer ses propres checks puis attendre Alex.


## État courant — 22octobre2026, B4e/B4f

#29 intégrée de86dd0 avec accord limité, main et six contrôles post-merge qualifiés, branches historiques conservées. B4e développé sur feature/global-session-revocation : backend global réauthentifié, User→Session et races natives ; UI volontaire/réseau inconnu/notifications liées à la session ; pagehide/pageshow et reprise visible masqués puis revalidés. Codef5a9132, qualification de la méthode BFCache34fe83b en cours.141PG-HTTP/238backend/191frontend réellement passés sur66715a9,2/4browser (BFCache manquant) ; ne pas annoncer L4 terminé. [Matrice18critères](l4-b4f-qualification.md) et [contrat](../maintenance/global-session-revocation.md). Les paragraphes antérieurs restent historiques. Seuls F001/F002/F003/F051 changent,62autres fiches identiques. Aucun merge futur, déploiement, migration propriétaire, infra, CONTRACT ou L5.


Qualification code9b7fa1e confirmée : six contrôles success, logs238backend/191frontend/141PG-HTTP/4Chromium relus, Vitest4.1.12/audits0. BFCache natif corrigé et réellement passé ; [Review Gate complet](reviews/l4-b4e-b4f-review-gate.md) sans BLOCKER/P1 restant identifié, [18critères et limites](l4-b4f-qualification.md). Publication documentaire puis vraie PR, aucune autorisation de merge future.


PR B4e/B4f réellement ouverte : [#30](https://github.com/Alexdmt0110/Barbook/pull/30), base de86dd0/head676f7fa au contrôle initial ;39fichiers/12commits, tous blobs et toutes lignes ajoutées/retirées comparés au clone, aucun patch manquant, zéro commentaire/revue/inline. Mergeable=true, état blocked pendant CI en cours, aucun conflit et aucun auto-merge. Code/fixture/sécurité déjà qualifiés sur9b7fa1e ; ce complément ne modifie que le suivi. Observer le dernier HEAD et ses six contrôles, puis attendre Alex : aucun merge de#30 autorisé.


## Reprise L5 après validation explicite de l’option B

BlocageL5-COMPAT-01 levé : routesconservées, préconditionsobligatoires sur toutesécrituresdeclassement,409sans effet siabsentes/périmées, aucuneinférence, lotatomique ; Angular actualisé conjointement à la bascule. B5a EN_COURS_PREPARATION_INACTIVE sur feature/recipe-lifecycle-contracts ; modèle/CHECK/defaults uniquement, activationcoordonnée au débutB5b. [Contrats](../maintenance/recipe-lifecycle.md), [design](l5-design.md). Les anciens étatsbloqués sont historiques, aucun nouveau merge autorisé.
# État courant L5 B5c — 23 octobre 2026

PR33 intégrée après accord sur main58461d1, six checks post-merge vérifiés261/192/187/4/audits0. F015/F019/F020/F029/F051 : interface complète et brouillons d'édition développés sur feature/recipe-editing-ui, code c254f98,218frontend/261backend locaux ; tests natifs à observer, pas encore intégrés. F016 cycle corbeille/restauration reste B5d/e ; aucun effacement/archivage. Nouvelle PR soumise au Review Gate et accord distinct avant merge ; aucun développement du bloc suivant avant main qualifié. Catalogue66fiches conservé, états historiques ci-dessous remplacés par cette photographie et le journal.
# Qualification B5c courante — PR34, 23 octobre 2026

0a89c05 :261backend/219frontend/187PG-HTTP/8Chromium et audits0, sixchecks/sixlogs réellement lus, captures inspectées, Gate entière sans BLOCKER/P1 restant B5c. F015/F019/F020/F029/F051 qualifiés dans ce périmètre sur branche ; F016 corbeille/restauration reste non livré B5d/e, L5 global partiel. Main58461d1 intègreB5b ; merge34 attend Alex et les checks du dernier checkpoint, aucune nouvelle PR documentaire séparée.66fiches/IDs conservés,60autres fiches identiques ; anciennes étapes ci-dessous historiques.
