# B4b — Design Review de la bascule web

20 octobre 2026. Après accord explicite d'Alex, #26 est mergée à13h06Paris (11:06:17UTC), merge commit `76f742bc7de437fe7ed1d6528344be208d54159d`, parents c99b080 et4c97d89, arbre identique au head revu. Les six checks main sont success, logs168backend/131frontend/88natifs/4Chromium/sept migrations/audits zéro relus. Toutes les branches historiques sont conservées. Reprise WORK autorisée dans cette conversation ; aucun autre écrivain annoncé. Nouvelle branche `feature/web-session-cutover` depuis ce main, ancienne branche B4a conservée.

## Périmètre et blocs atomiques

L4 reste seul autorisé. B4b active ensemble la session PostgreSQL, le cookie, la protection CSRF serveur et Angular, sans fallback JWT. B4c ajoutera admission privée/getters storage ; B4d les vrais brouillons mémoire/sessionStorage24h ; B4e approfondira révocation globale/UI/races. L5, CONTRACT, base personnelle/production, infrastructure et déploiement exclus. Chaque nouvelle PR exige un accord de merge distinct.

1. Préparer et tester les primitives web (configuration, cookies, origine/CSRF/contexte), sans modifier les routes actives. Publier un état vert avant la bascule.
2. Basculer dans un même commit cohérent le contrat AuthService/Controller/guards, leurs consommateurs métier, Angular et les fixtures/tests. Aucun commit où le frontend attend un cookie encore ignoré par l'API, ni support Bearer conservé.
3. Qualifier les parcours réels, les cas hostiles et les erreurs, reprendre le Review Gate de toute la branche depuis main ; proposer une PR puis attendre son accord de merge.

Trois triggers push exacts de branche pour les six checks, sans changer actions/jobs/permissions/ruleset. Aucune migration supplémentaire prévue : réutiliser le schéma/store B4a. Aucune nouvelle abstraction repository/horloge ou cache de session.

## Responsabilités et contrats serveur

- Une configuration cohésive lit/valide FRONTEND_ORIGIN : origine exacte http/https sans chemin/credentials ; HTTPS exigé en production. Cookie `__Host-barbook-session` en production, nom distinct en HTTP de développement, HttpOnly, SameSite=Lax, Path=/, sans Domain. Max-Age seulement pour l'option explicite, plafonné à30jours. Une requête d'auth production non sécurisée est refusée ; le proxy de confiance reste celui déjà configuré, à qualifier avant production.
- Primitives courtes : parsing strict du seul cookie attendu (doublons/encodage invalide refusés), sérialisation Express et suppression avec les mêmes attributs, comparaison CSRF de taille fixée en temps constant. Pas de nouveau package ni de crypto maison : CSPRNG/hash existants et timingSafeEqual Node.
- Login/register exigent Origin exacte et header `X-Barbook-Request: 1`, sans accepter les types de contenu simples ; ces contrôles protègent aussi du login-CSRF. Pas de bypass NODE_ENV=test. Les fixtures HTTP envoient ces mêmes headers. CORS credentials uniquement pour l'origine exacte, aucun wildcard. Les requêtes privées/auth ne sont pas mises en cache.
- Toutes les mutations privées vérifient aussi `X-Barbook-CSRF` contre le token synchronizer lié à la session réelle ; les cookies seuls et SameSite ne suffisent pas. Aucun GET métier ne modifie des données (l'activité interne de session peut être actualisée).
- Toutes les requêtes métier portent `X-Barbook-Expected-User`; les écritures portent aussi `X-Barbook-Expected-Workspace`. Ces valeurs ne donnent aucun droit : le serveur authentifie le cookie puis dérive le workspace personnel/membership, compare au contexte attendu, et refuse un contexte différent avant écriture. /auth/me rétablit l'identité réelle et ne requiert pas une identité déjà connue.
- AuthService garde Argon2/erreurs génériques/rate limits ; transaction ReadCommitted explicite pour User/Workspace/Member/Session, rollback complet si Session échoue. Login crée toujours un nouveau credential ; s'il remplace une session connue de ce navigateur, elle est révoquée dans cette transaction pour éviter fixation/réutilisation. Aucune création depuis un identifiant de cookie fourni par le client.
- Réponse publique login/register/me : utilisateur minimal, workspace personnel et CSRF non credential ; métadonnées de session strictement utiles. Le credential reste interne et est extrait vers Set-Cookie, jamais sérialisé en JSON. Logout révoque réellement et expire le cookie ; idempotence des cookies déjà expirés/inconnus sans voie CSRF ouverte. Logout-all et réauthentification seront qualifiés dans B4e.

Le guard gère l'identité/session ; les services métier gardent leurs contrôles et contraintes workspace existants. Le cookie/CSRF/origine restent dans une responsabilité web dédiée, pas mélangés au store ou aux recettes. DB indisponible n'est pas maquillée en401. Aucun token dans URL/log/stockage JS.

## Contrats Angular et changements de contexte

- Plus de lecture/écriture accessToken, suppression tolérante de l'ancienne clé uniquement ; aucun secret d'auth en sessionStorage. /me au bootstrap/guard, restauration unique partagée et état explicite en cas d'indisponibilité, sans boucle automatique. Login/register vérifient que le cookie permet réellement /me avant de considérer la connexion établie (cookies refusés).
- Interceptor limité aux URL API de même origine : credentials, marker, CSRF pour mutations et contexte attendu ; aucune donnée d'auth envoyée vers URL externe. Aucun retry automatique de POST ou après401/409.
- Génération d'auth capturée par requête : rejeter réponses tardives d'une ancienne génération ; plusieurs401 ne lancent qu'une transition. Expiration involontaire et logout volontaire ont des chemins distincts, afin que B4d puisse conserver les brouillons à expiration et purger au logout. Ne jamais appeler un logout serveur depuis un simple401.
- Une identité/workspace différente ne doit jamais être installée dans un écran privé ancien encore monté : bloquer immédiatement les requêtes privées et effectuer une navigation complète/rebootstrap avant d'adopter ce contexte. Le contexte A envoyé par un vieil onglet est refusé avec le cookie B, même sans notification reçue. BroadcastChannel éventuel améliore l'UX mais ne remplace pas le refus serveur. Une session renouvelée du même compte peut rétablir le CSRF, sans rejouer l'écriture initiale.
- « Rester connecté » est une checkbox login non précochée, avec indication appareil partagé. Logout n'est confirmé qu'après réponse serveur ; échec réseau = contenu privé inutilisable et message explicite permettant un retry, sans prétendre à une révocation certaine. Une fermeture d'onglet ne promet pas de révocation.

Pas de vrai brouillon livré implicitement en B4b : B4d doit encore capturer champs/unités/sélections et version d'origine, TTL24h, restauration explicite et purge par identité. Aucune purge globale du sessionStorage ni resoumission lors d'une expiration. Les tests B4b ne doivent pas prétendre qualifier L4-11/12/15 avant ce raccordement.

## Preuves attendues

Primitives : Origin étrangère/absente/null, marker absent, contenu simple, cookie doublé/forgé/encodé, attributes production/développement/suppression, CSRF absent/étranger/tronqué, garde de contexte. Les helpers préparés ne sont pas considérés actifs avant raccordement et tests du vrai bootstrap.

HTTP/PG : inscription+session atomiques (dont panne Session et concurrence), login rotate/fixation/rejeu, me/cookie après une nouvelle instance/processus, idle/absolue/révocation effectives, logout idempotent, ancien Bearer refusé, CSRF/origine hostiles sans effet, A/B et mauvais workspace sans fuite ni écriture. Les tests natifs d'organisation/dossiers gardent toutes leurs assertions en remplaçant seulement le transport JWT.

Angular : bootstrap, cookies refusés,401 simultanés, réponse A tardive après B, aucune fuite externe, pas de retry POST, login/logout et option non cochée. Navigateur : parcours existants desktop/mobile conservés, vraie session cookie HttpOnly, aucune clé accessToken, CSRF hostile et contexte ancien refusés, expiration/reconnexion et deux onglets. Les expirations utilisent des fixtures DB jetables protégées, pas un JWT forgé ni une route de test exposée. Conserver les quotas d'inscription existants ; pas de retry pour les contourner.

Actualiser les contrats de maintenance, variables .env/CI et ADR historique après activation ; distinguer garanties prouvées en HTTP de test, attribut Secure sérialisé et vrai TLS de production non qualifié. Ne pas supprimer une dépendance JWT à l'aveugle : analyser ses consommateurs/lock ; aucune acceptation Bearer après bascule, même si le package doit être retiré dans un commit de nettoyage distinct. Review Gate complet avant PR, zéro BLOCKER/P1 du diff, vrai diff PR/CI à relire.

## Préparation : vérification sans prolongation

Le guard lira d'abord les métadonnées par inspect, sans écriture, pour vérifier CSRF et contexte ; puis authenticate revérifiera expiration/révocation sous verrou et actualisera l'activité. Inspect seul ne donne jamais l'autorisation finale. Une révocation/expiration entre les deux fait échouer authenticate. Cela évite de prolonger une session lors d'un refus CSRF/contexte ; coût explicite d'une lecture indexée supplémentaire, sans cache d'autorisation. Les droits métier restent revalidés par les services existants. Tests natifs supplémentaires : inspection sans effet, révocation/expiration et refus final après prélecture.

## Points de protocole à fermer avant activation

Une réponse logout ancienne peut arriver après un login d'un autre onglet : un Set-Cookie de suppression inconditionnel pourrait alors effacer le nouveau cookie. Le helper clearSessionCookie ne garantit pas à lui seul l'ordre des transitions. Définir/tester ce protocole avant son raccordement (coordination des transitions avec fallback sûr, ou révocation sans suppression globale inconditionnelle), sans demander une nouvelle décision produit. Le contrôle serveur du contexte reste obligatoire indépendamment des notifications.

Si le POST register a réussi mais que le navigateur refuse le cookie, le compte existe réellement : la vérification /me doit produire un message honnête de connexion non établie, pas prétendre que l'inscription a été annulée ou rejouer automatiquement le POST. Même exigence de distinction entre résultat certain et inconnu pour les erreurs réseau. Ces cas ne sont pas encore qualifiés par les44tests de primitives.
