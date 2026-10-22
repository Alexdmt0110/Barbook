# L4 B4f — Matrice des18critères et limites

Base main de86dd0 (#29 intégrée et six checks post-merge qualifiés). Code B4e f5a9132, fixture34fe83b, sécurité7d3bee2, checkpoint9b7fa1e. Qualification du code confirmée au22octobre2026 : six checks success sur9b7fa1e,238backend/191frontend/141PG-HTTP/4Chromium ; logs relus. Cette matrice n'autorise aucun merge ni déploiement. Les résultats distinguent type de preuve et limites ; le détail des runs figure à la fin.

| ID | Critère et preuves effectivement visées | Portée et limites |
| --- | --- | --- |
| L4-01 | registration-admission.e2e-spec : API directe non admise/fermée, exact set serveur, aucun User/Workspace/Member/Session/cookie partiel ; policy unit | Liste exacte privée ; ce n'est pas une vérification de possession d'email. Pas d'ouverture publique. |
| L4-02 | http-persistence et web-sessions natifs : inscription concurrente unique, rollback membre/Session ; transaction unique ReadCommitted | Bases jetables et vrais triggers de panne, aucune migration propriétaire. |
| L4-03 | web-sessions/sessions natifs : cookie imposé remplacé, secret indépendant, hash seulement en DB, JSON sans credential/hash, cookie HttpOnly | Fixtures synthétiques ; pas d'audit des logs d'un serveur propriétaire. Secure/HTTPS validé en code, pas sur TLS réel. |
| L4-04 | sessions natifs : une seconde instance Nest/service lit la même session PostgreSQL et revalide ses droits ; guards HTTP réels | Reconstruction réelle Nest/connexionDB ; pas de redémarrage de VPS testé. |
| L4-05 | sessions/web-sessions natifs : durées2h/12h et7j/30j, frontières DB exacte, activité plafonnée, expiration pendant lock | clock_timestamp PostgreSQL seul décide, aucun timestamp client n'autorise/renouvelle. Pas de heartbeat. |
| L4-06 | logout simple natif idempotent/rejeu ; global-logout natif password, multi-appareils, rollback et replay ; Chromium coupe la vraie réponse204 après commit |204 seul confirme global ;401 après réponse perdue ne prouve pas lequel des autres appareils fut révoqué. Nouvelle réauthentification/action explicites, aucun retry aveugle. |
| L4-07 | sessions + global-logout natifs : les deux ordres User login/global, credential révoqué pendant attente, expiration Session, hash changé pendant Argon2, activité derrière révocation | Ordre par verrous PG observés, pas de sleep fixant l'ordre. Requête métier autorisée avant révocation peut terminer ; nouvelle autorisation refuse. |
| L4-08 | web-sessions/global-logout natifs : origine/CSRF/marker absents ou étrangers, contexte étranger, Bearer réel/forgé, DTO ciblant un autre user ; rate limit réel429 | Aucun fallback JWT ni droit donné par header client. Quotas inchangés. |
| L4-09 | HTTP cookieB/contexteA refuse avant effet ; DraftStore et auth unit isolent user/workspace/recette ; notifications retardées ciblées par empreinte et génération ; Chromium onglets actifs | Aucun sélecteur workspace partagé dans L4 ; mismatch workspace testé par clients hostiles et store, pas par une UI inexistante. |
| L4-10 | auth/interceptor/SessionResume unit :401 concurrents, vieux bootstrap/mutation/logout/revalidation après B, pas de replay ; /me compare aussi CSRF | Un Set-Cookie de connexion déjà en vol peut remplacer le cookie navigateur ; les préconditions refusent l'ancienne saisie, sans promesse de contrôle rétroactif du navigateur. |
| L4-11 | Chromium expiration réelle de lignePG, login même compte puis restauration explicite ; champs/cL conservés ; DraftStore/FormDraft unit | TTL24h borné local à l'onglet, pas de stockage serveur. Aucune mutation au restore. |
| L4-12 | store/FormDraft/création unit : TTL exact, données corrompues/futures, navigation/abandon/handles invalidés ; Chromium refresh/restore/quota | Effacement à l'accès si le navigateur accepte ; aucune promesse d'effacement d'un navigateur fermé. |
| L4-13 | Chromium POST recette réellement committé puis seule réponse abort, GET de vérification, aucune duplication ; FormDraft marque résultat inconnu avant envoi ; global204 perdu réel | Pas de clé d'idempotence serveur nouvelle : vérification explicite avant tout nouvel envoi. |
| L4-14 | BrowserStorage/DraftStore unit getter/get/set/remove/quota ; Chromium getters refusés + QuotaExceededError ; auth unit cookie non confirmé et HTTP réel sans cookie refusé | Le réglage navigateur qui interdit les cookies n'est pas exercé physiquement ; comportement UI couvert en unité et frontière cookie absente en HTTP. Aucun crash/replay ni promesse24h impossible. |
| L4-15 | organisation natifs : versions, concurrence et rollback ; DOM409 conserve draft ; Chromium second client change version, restauration compare et bloque puis reload explicite | Pas de force-save. ID stable et expectedVersion serveur requis. |
| L4-16 | SessionResume unit + Chromium indépendant BFCache activé : pageshow.persisted réel, wrapper caché avant revalidation,401 revoked puis purge ; retour visible revalide | Chromium réel passé sur9b7fa1e ; Safari/iOS réel non qualifié. Appareil offline/dormant ne peut effacer un draft avant constat serveur ; preuve de révocation supprimée par prune devient inconnue. |
| L4-17 | Quatre parcours Chromium desktop1365/mobile390, clavier/Enter réauth, labels/erreurs/status, absence de débordement et captures du formulaire | Automatisation clavier/DOM et inspection captures ; pas d'audit lecteur d'écran humain ni d'appareil iOS réel. |
| L4-18 | migrations/sessions/contraintes natives : sept historiques fresh/redeploy/status/drift/upgrade, FK/CHECK/index, prune borné500 et sessions actives préservées ;10fixture guards | Aucune migration nouvelle B4e, aucune base propriétaire, aucune tâche de cleanup/infra ajoutée ; backup/restore/rollback propriétaire non qualifiés. |

## Invariants de données et d'exploitation

Admission privée contrôlée avant création côté serveur ; inscription et bootstrap n'ont pas de bypass test. Isolation user/workspace en guards/services/FK ; brouillons liés au user/workspace/recette, schéma et version,24h, restauration explicite et aucun replay. Révocation volontaire constatée purge, expiration/réseau conserve avec suspension. Effacement storage refusé garde l'avertissement de nettoyage manuel avant partage.

Le catalogue conserve66IDs : seuls F001/F002/F003/F051 suivent L4 ; les62autres restent identiques. Les trois workflows ne reçoivent que le trigger de branche exact, aucune permission/job/action/limite modifiée. Les branches historiques sont conservées. VM : aucun ; SQL propriétaire/production : aucun ; Infra : aucun ; CONTRACT/L5/déploiement : exclus.

## Condition de clôture

Les six checks du code et logs PG/browser ont été lus, les captures inspectées, et toute la branche relue après corrections. Publier ces documents puis observer leur dernier HEAD avant vraie PR. Chaque nouvelle PR exige l'autorisation explicite d'Alex avant merge. Main ne contient pas encore B4e/B4f tant que cette future PR n'est pas mergée.


## Preuves finales du code — checkpoint9b7fa1e

Code applicatif f5a9132, fixtureBFCache34fe83b et patchsécurité7d3bee2 inclus dans9b7fa1e151771a7517cbc51b1c2d4a21560c93ca ; six checks success réellement lus et logs relus : [CI39737042589](https://github.com/Alexdmt0110/Barbook/actions/runs/39737042589), [Integration39737042497](https://github.com/Alexdmt0110/Barbook/actions/runs/39737042497), [Audits39737042545](https://github.com/Alexdmt0110/Barbook/actions/runs/39737042545). Backend238/23suites, frontend191/27fichiers sous Vitest4.1.12, PG-HTTP141/9suites dont23cas globaux, quatre parcoursChromium. Sept migrations historiques fresh/redeploy/status/drift/smoke,10garde-fous, audits complets/runtime0 backend et frontend. Les assertions de vraie restauration BFCache, masque avant revalidation,401code/purge et perte du204 ont toutes passé.

Statut : QUALIFIE_SUR_BRANCHE pour les18critères dans la portée de preuves/limites de chaque ligne ; aucune qualification production propriétaire. Les prochains commits sont documentaires ; lire aussi leurs six contrôles avant merge de la future PR.
