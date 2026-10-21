# B4c — Design Review préventive : admission privée et stockage tolérant

21 octobre 2026. Alex autorise le merge #27 et la suite L4 uniquement. #27 : HEAD1e52381/base76f742b,70fichiers/10commits, douze checks push+PR verts, aucun commentaire/revue et mergeable/clean revérifiés. Merge commit90d9356bae7a80ee3d0fa01ad1ce3e26b905d005, mergedAt07:39:25UTC (09:39:25Paris), parents76f742b/1e52381, arbre identique au HEAD qualifié. Six checks main verts, logs213backend/138frontend/111PG-HTTP/4Chromium/sept migrations/drift/audits zéro relus. Branches historiques conservées. Nouvelle branche feature/private-beta-admission publiée depuis ce main propre ; WORK seul.

## Contrat et responsabilités avant code

- RegistrationAdmissionPolicy dans auth : configuration serveur REGISTRATION_ALLOWED_EMAILS, vide/absente = fermé. Liste d'adresses exactes séparées par virgules, trim/minuscules comme le DTO ; aucun domaine joker, suffixe, flag public, header client ou exception NODE_ENV=test. Configuration mal formée = échec au démarrage avec erreur sans adresses ni secrets. Chargée au démarrage, changer la liste demande un redémarrage autorisé ultérieurement ; aucun changement d'infrastructure effectué ici.
- AuthService.register appelle cette politique avant lookup/hash/transaction. Refus403 code REGISTRATION_NOT_ALLOWED et message générique identique pour compte existant/non existant ; aucune ligne User/Workspace/Member/Session ni rotation du cookie. Login, /me et les comptes existants ne dépendent pas de cette liste. Retirer une adresse n'est ni supprimer un compte ni révoquer ses sessions.
- AuthModule fournit la politique, sans endpoint public de consultation de liste. Les DTO, origine/CSRF et quotas actuels restent actifs ; aucune nouvelle dépendance ni migration.
- BrowserStorageService dans core/storage : petites opérations read/write/remove, zone local/session explicite, try englobant le getter window et le getter storage puis la méthode. Aucun clear global ni cache de données privées. Retour null/false si accès refusé ou quota plein. Les consommateurs gardent leur état mémoire : ThemeService conserve son signal ; AuthService ne fait que retirer l'ancien JWT sans lecture. B4d utilisera ce contrat pour ses brouillons24h ; aucune sauvegarde de formulaire n'est livrée par B4c.

## Tests et fixtures sans bypass

Politique unitaire : absent/vide/espaces, adresses exactes/casse/doublons, domaines et plus-address distincts, jokers/config invalide, même refus indépendamment de l'environnement. AuthService : refus avant toute DB/hash, login inchangé.

HTTP/PG réel : fermé/non admis403 sans ligne créée/Set-Cookie et sans changement de session active ; autorisé201 avec cookie puis login/me ; refus de champs/headers tentant l'ouverture ; compte préexistant peut se connecter même liste vide ; doublons/concurrence/rollback historiques conservés. Les tests injectent la vraie configuration d'une liste explicite, pas une politique permissive. Les helpers réservent avant le bootstrap des adresses synthétiques exactes pour leurs acteurs internes ; les tests d'inscription réservent aussi leurs adresses avant démarrage. Tests de fermeture : zéro acteur réservé, liste vide. Pas de wildcard ni flag de contournement.

Playwright garde les quatre inscriptions et les quotas/retries ; chaque projet/parcours reçoit une adresse synthétique exacte connue avant le démarrage API et configurée par le même REGISTRATION_ALLOWED_EMAILS que l'application. Les quatre parcours existants restent. Étendre le parcours d'expiration avec getters localStorage/sessionStorage qui lèvent SecurityError, connexion cookie, thème en mémoire et reload ; aucune simulation d'API ou cookie autorisé artificiellement.

Storage : getter de chaque zone refusé ; get/set/remove refusés/quota plein ; fenêtre absente ; aucune purge de clés tierces ; thème par défaut/restauration/persistance nominale et repli mémoire. Les cookies refusés restent traités par le contrat B4b, sans nouvelle boucle ni replay automatique.

## Découpage et sortie

1. Publier ce design, l'accord/merge #27 et les trois triggers push exacts. Pas de changement d'actions/jobs/permissions/ruleset.
2. Admission serveur + adaptation des fixtures/cas natifs/browser dans un bloc cohérent, verify/tsc/safety, commit/push immédiat et vraie CI.
3. Accès storage/thème/auth et cas d'erreur réels, verify/typecheck, commit/push et CI.
4. Review Gate de toute la branche contre main après tout P1 corrigé ; docs/contrats/checkpoint/backlog/handoff ; PR soumise à Alex, vrai diff et six checks vérifiés. Aucun merge de cette future PR préautorisé.

B4d brouillons24h/compte/workspace/version et B4e logout global/réauthentification restent requis. Aucun L5, CONTRACT, migration personnelle/production, déploiement ni changement d'infrastructure. Git : branche dédiée/commits atomiques/push immédiat. VM : aucune. SQL : aucune migration nouvelle, tests CI jetables seuls. Infra : aucune.
