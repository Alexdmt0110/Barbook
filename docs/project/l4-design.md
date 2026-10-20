# L4 — Design Review préventive et critères

20 octobre 2026. L4 seul autorisé par Alex après validation explicite de D1a/D1b/D2a/D2b/D2c. Branche `feature/secure-web-sessions` depuis main `c99b08052e2e1494f621c7de8a7fb0831516bd1e`. WORK reprend cette tranche ; aucun autre écrivain annoncé. #24/#25 sont mergées et les six checks de main sont verts. Les branches dossiers et historiques sont conservées.

## Périmètre décidé

Bêta privée avec admission serveur ; sessions opaques PostgreSQL (standard 2 h inactive/12 h absolues, option explicite 7 j/30 j) ; cookies HttpOnly/Secure en production et CSRF serveur ; révocation/expiration/fixation ; brouillons mémoire + sessionStorage avec expiration 24 h, restauration explicite strictement liée au compte/workspace/recette, purge volontaire et protection des versions. Voir [ADR 0005](../adr/0005-revocable-web-sessions.md).

L'édition et la corbeille font partie du produit V1 validé, mais L5 et la rétention D5 attendent une autorisation distincte. D3–D8 restent ouverts sauf garde-fous expressément établis. Pas de CONTRACT, migration propriétaire, infrastructure, déploiement ou merge autorisé par cette décision. Migrations additives uniquement sur bases de test jetables identifiées.

## Six blocs et sorties attendues

| Bloc | Responsabilités et périmètre | Preuve de sortie |
| --- | --- | --- |
| B4a — Contrats et préparation | décisions/ADR ; modèle additif Session ; politique de durée et store transactionnel testable, pas de bascule | historique immuable ; contraintes, expiration, révocation et concurrence natives ; parcours JWT encore verts |
| B4b — Session web | cookie/CSRF/guards/auth endpoints ; bootstrap et contexte Angular ; retrait complet Bearer coordonné | HTTP hostiles et parcours réels ; nouvelle session à chaque login ; aucun token de session en JS |
| B4c — Admission et stockage | fermé/liste serveur ; erreurs contrôlées ; getters et méthodes storage protégés/thème/mémoire | API directe non admise sans création partielle ; stockage refusé sans crash ni boucle |
| B4d — Brouillons | création et organisation existantes ; sérialisation bornée, TTL 24 h ; restauration/abandon explicites ; guard de sortie | refresh/reconnexion même compte ; compte/workspace différent refusé ; versions et saisies invalides conservées sans écrasement |
| B4e — Révocation et courses | logout global/réauthentification ; plusieurs onglets ; activité et requêtes en vol ; échecs réseau | ordres transactionnels prouvés ; aucune résurrection ni écriture A sous B ; logout honnête si résultat inconnu |
| B4f — Qualification | branche entière/main ; contrats, docs, sécurité et CI ; Review Gate et vraie PR | zéro BLOCKER/P1 ; six checks verts ; checkpoint complet et accord de merge demandé |

Chaque micro-bloc : revue préventive → développement → tests → commit atomique/push immédiat → contrôle distant du parent/arbre/message/fichiers/blobs → checkpoint. Trois workflows reçoivent seulement le déclencheur push exact de cette branche afin de vérifier les six contrôles avant PR ; aucune permission/action/check ou protection n'est retirée.

## Revue préventive B4a

SessionService est une responsabilité cohésive : créer dans la transaction appelante, authentifier/actualiser atomiquement, révoquer une ou toutes les sessions et purger de façon bornée. Politique de durée et primitives crypto Node isolées en fonctions courtes, aucun framework de store/clock/repository. AuthService conserve pour ce bloc son contrat JWT ; aucune route ne délivre encore de cookie. SessionService est préparé dans AuthModule et testé avec Prisma réel ; le raccorder et supprimer Bearer relèvent de B4b.

32 octets CSPRNG pour le credential, hash SHA-256 unique seulement en DB ; CSRF indépendant aléatoire et conservé côté serveur, insuffisant seul pour s'authentifier. Token mal formé refusé avant DB. FK user ; contraintes hash/CSRF et échéances ; indexes hash/user/expiration. Timestamps PostgreSQL, aucune horloge client. Le lock User précède création et révocation globale ; la validation/activité conditionnelle sur la ligne Session ne peut annuler revokedAt. Pas de N+1 ni requête de workspace supplémentaire dans ce store ; les droits restent dans les services métier. Purge limitée à 500 lignes et sans tâche d'infrastructure ajoutée. Les erreurs de DB remontent sans log de credential ; utilisateur disparu refusé. Les identifiants des fixtures sont synthétiques.

La nouvelle migration ne transforme aucun utilisateur, JWT ou donnée métier. Base fraîche et upgrade depuis les six migrations doivent préserver User/Workspace/recettes/liens. CHECK supplémentaires sont vérifiés directement en PostgreSQL ; Prisma diff reste sans dérive représentable. Les anciennes migrations ne sont pas retouchées. Pas de déploiement/rollback de propriétaire testé ici ; B4a reste compatible avec les binaires actuels. La nouvelle table seule ne sécurise pas l'auth courante.

## Inventaire des consommateurs à basculer en B4b

Backend : auth.controller/service/module/types, JwtAuthGuard et son spec, authenticated-request/CurrentUserId, controllers Cocktails/Folder/Ingredient et tests auth/unitaires/HTTP. AuthService crée actuellement un JWT après la transaction d'inscription ; la session devra être créée dans celle-ci. configure-application.ts : CORS et middleware cookie/CSRF partagés avec les tests ; throttling conservé.

Angular : core/auth service/interceptor/guard/specs, bootstrap app.config, formulaires login/register, navigation/logout, appels privés des services données et route guards. Supprimer lectures/écritures accessToken/sessionStorage ; ajouter CSRF seulement aux requêtes API de même origine et compte/workspace attendu capturé avec la saisie. Pas de credential vers URL externe. Rejeter réponse tardive d'une génération précédente. E2E/fixtures/README/config exemples doivent cesser de dépendre d'un JWT. Aucun consommateur externe n'a été inventorié sur une instance réelle : contrôle obligatoire avant un lancement autorisé.

Le contexte attendu ne remplace pas les permissions : session réelle puis comparaison de l'utilisateur attendu, workspace dérivé/membership vérifié puis comparaison du workspace attendu. Une notification BroadcastChannel n'est qu'une aide UX. GET privés et caches doivent aussi éviter l'affichage de B dans un ancien écran A ; /me rétablit l'identité réelle. Login/register exigent origine exacte et header personnalisé ; mutations authentifiées exigent en plus le CSRF lié à la session. Déconnexion explicite révoque ; une réponse perdue ne vaut pas confirmation. Aucun replay automatique de POST.

## Critères L4 et preuves requises

Tous sont à qualifier ; un plan ou le store B4a ne constitue pas la preuve d'un parcours web complet.

| ID | Cas | Résultat attendu |
| --- | --- | --- |
| L4-01 | fermé/non admis, API directe | refus serveur, aucune création User/Workspace/Member/Session |
| L4-02 | inscription concurrente/panne Session | au plus un compte, rollback de l'ensemble, erreur contrôlée |
| L4-03 | cookie imposé/login réussi | nouveau credential indépendant ; absent du JSON, DB, logs |
| L4-04 | redémarrage API | session DB retrouvée, droits/workspace revalidés |
| L4-05 | bornes inactive/absolue, horloge client manipulée | rejet serveur à l'échéance exacte ; absolue jamais étendue |
| L4-06 | logout/rejeu/expiration/réponse perdue | révocation réelle/idempotence ; UI indique l'incertitude réseau |
| L4-07 | logout-all contre création/activité | ordre défini par verrou User ; aucune résurrection |
| L4-08 | CSRF absent/étranger, origine croisée, login-CSRF, ancien Bearer | rejet sans effet et aucune voie de secours JWT |
| L4-09 | onglet A saisit, onglet B change de compte, notification retardée | aucune écriture de A sous B ; aucune restauration croisée |
| L4-10 | plusieurs 401/réponse tardive ancienne | une reconnexion cohérente, aucun cache d'identité antérieure |
| L4-11 | expiration + reconnexion même compte | restauration explicite du brouillon, champs/unités conservés, pas de POST automatique |
| L4-12 | navigation/abandon/refresh | guard de sortie ; abandon purge ; restauration explicite avant 24 h, refus après |
| L4-13 | POST committé/réponse perdue | résultat inconnu explicite, vérification proposée, pas de rejeu aveugle |
| L4-14 | getter/get/set/remove/quota/cookies refusés | pas de crash, repli mémoire ou erreur honnête, pas de boucle |
| L4-15 | organisation modifiée à distance | version d'origine conservée,409 préserve le brouillon, pas de force-save |
| L4-16 | retour arrière/cache/logout/appareil partagé | contenu privé inutilisable et authentification revalidée |
| L4-17 | mobile390/clavier/erreurs | parcours lisible, focus et validations accessibles |
| L4-18 | migration fraîche/upgrade/hostiles/purge | FK/CHECK/index ; historique immuable ; sessions actives préservées |

Preuves B4a ciblées : tests unitaires des primitives/politiques ; tests réels création/stockage haché/redémarrage du service, expirations et plafond, replay après révocation, isolation user, transaction rollback, ordres lock/création/logout-all/activité, contraintes et purge. CI existante doit aussi requalifier les 151 backend,131 frontend,61 natifs,4 Chromium et10 garde-fous de référence. Les futurs résultats sont consignés au checkpoint, sans déclarer aujourd'hui ces critères passés.
