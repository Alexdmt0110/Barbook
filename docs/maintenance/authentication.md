# Authentification Barbook — sessions web PostgreSQL

B4b remplace le transport JWT dans l'API et Angular. L'état d'intégration et les résultats réellement observés se lisent dans le [handoff](../project/agent-handoff.md). Aucun déploiement ni migration propriétaire n'est réalisé.

## Contrat HTTP

- POST /api/auth/register : email normalisé, displayName 2–80 caractères, mot de passe 15–128 caractères. Transaction ReadCommitted User + workspace PERSONAL + membership OWNER + Session ; rollback complet si une écriture échoue.
- POST /api/auth/login : email/password, rememberMe booléen facultatif (false par défaut). Argon2id et erreur générique ; nouveau credential, révocation transactionnelle du cookie précédent après succès.
- GET /api/auth/me : bootstrap authentifié, retourne user minimal, workspaceId personnel et csrfToken ; aucun credential/hash/accessToken dans JSON.
- POST /api/auth/logout : révocation serveur, 204 idempotent pour cookie déjà expiré/révoqué/absent. Une session active exige les preuves de contexte et CSRF. Aucun Set-Cookie de suppression : une réponse tardive ne doit pas effacer une connexion plus récente.

Toutes les routes métier utilisent SessionGuard. Les droits/scopes et contraintes workspace restent dans les services et PostgreSQL. Les headers attendus sont des préconditions, jamais une autorisation de choisir un autre workspace.

## Frontière web

FRONTEND_ORIGIN est une origine exacte sans chemin ni slash final. NODE_ENV=production impose HTTPS, transport sécurisé et cookie __Host-barbook-session ; sinon barbook-session-dev. HttpOnly, SameSite=Lax, Path=/, sans Domain. Standard sans Max-Age ; option explicite Max-Age 30 jours. Les échéances serveur font foi : standard 2h idle/12h absolues ; option 7j/30j.

Login/register et toute mutation : Origin exacte, X-Barbook-Request:1, contenu JSON si présent. Toute mutation authentifiée exige aussi X-Barbook-CSRF lié à la session. Les lectures et mutations privées exigent X-Barbook-Expected-User et X-Barbook-Expected-Workspace exacts ; /auth/me est le seul bootstrap sans contexte déjà connu. Origin étrangère et Sec-Fetch-Site:cross-site sont refusés, y compris sur lecture avec Origin fournie.

Le guard fait inspect sans prolongation, dérive le propriétaire/workspace, valide contexte/CSRF, puis authenticate revérifie révocation/expiration sous verrou et touche l'activité. Les refus avant authentification ne prolongent pas la session. Une panne DB reste une erreur serveur. Cache-Control:no-store sur réponses privées/auth ; CORS credentials seulement vers l'origine exacte. Aucun fallback Bearer.

Codes : 400 DTO invalide ; 401 session absente/expirée/révoquée ou mauvais identifiants ; 403 origine/CSRF/contenu ; 409 AUTH_CONTEXT_CHANGED ou conflit métier ; 429 quota ; 5xx indisponibilité/invariant. Le client ne rejoue pas automatiquement une mutation après un refus.

## Limites de livraison

Le cookie révoqué peut rester présent mais n'accorde aucun accès ; la prochaine connexion le remplace. Ne pas l'effacer depuis une réponse asynchrone ancienne. Les requêtes déjà autorisées avant révocation peuvent terminer : pas d'annulation rétroactive d'un commit.

B4c doit encore fermer l'admission serveur et traiter les stockages ; B4d les vrais brouillons 24h et leurs purges ; B4e logout global et approfondissement des courses. Aucun logout-all public livré ici. TLS/proxy/Safari/iOS, inventaire des consommateurs réels et rollback demandent leur qualification avant production. Les clients JWT doivent se reconnecter ; déployer ultérieurement API/UI ensemble, avec table Session préalable et procédure autorisée.

Commandes : npm --prefix backend run verify ; npm --prefix frontend run verify ; intégrations réelles selon [integration-tests.md](integration-tests.md). Les résultats/limites ne sont pas déduits de la présence des tests.
