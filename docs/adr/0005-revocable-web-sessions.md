# ADR 0005 — Sessions web révocables en PostgreSQL

Statut : décision acceptée par Alex le 20 octobre 2026 (D2). B4a intégré ; bascule API/Angular implémentée sur branche B4b, qualification et merge à vérifier au handoff. L'ADR 0002 décrit le fonctionnement historique retiré. B4c–B4e restent distincts.

## Décision et limites

Session opaque côté serveur dans PostgreSQL, sans Redis ni fournisseur d'identité. Le cookie contient 32 octets CSPRNG encodés en base64url, renouvelés à chaque authentification ; seul SHA-256 de ce secret est enregistré. Aucun token de session dans JSON, URL, JavaScript ou logs après la bascule. Un identifiant public de session n'est pas un moyen d'authentification.

| Mode choisi explicitement | Inactivité maximale | Durée absolue maximale |
| --- | --- | --- |
| Standard, par défaut | 2 heures | 12 heures |
| « Rester connecté », jamais précoché | 7 jours | 30 jours |

L'horloge PostgreSQL décide des échéances. L'activité valide prolonge seulement l'échéance inactive, plafonnée à l'échéance absolue ; aucun heartbeat permanent. Révocation et vérification/activité sont conditionnelles et atomiques. Création et révocation globale prennent le même verrou User avant de modifier Session : les créations committées avant la révocation sont révoquées, celles ordonnées après peuvent établir une nouvelle session. Une requête déjà autorisée en vol n'est pas annulée rétroactivement.

L'inscription inclura la session dans la transaction User/Workspace/Membership ; une panne de session annulera l'ensemble. Le store accepte explicitement le client transactionnel, sans repository générique. Le hash unique, la FK User avec cascade et les contraintes temporelles protègent les lignes. La purge sera bornée et ne touchera que des sessions expirées/révoquées ; elle ne décide jamais de leur validité. Aucune donnée IP ou user-agent stockée par défaut.

## Contrat web à activer en B4b

- Cookie production `__Host-barbook-session` : HttpOnly, Secure, Path=/, sans Domain, SameSite=Lax. Nom distinct pour le développement HTTP. Standard sans Max-Age ; persistant plafonné à 30 jours. La fermeture du navigateur ne constitue pas une preuve de révocation.
- Synchronizer token CSRF indépendant, aléatoire, lié à la ligne Session ; conservé côté serveur et transmis au client authentifié en mémoire, jamais comme credential. Toutes les mutations authentifiées exigent sa vérification serveur. Origin exacte et header personnalisé requis sur login/register empêchent aussi le login-CSRF ; SameSite ne remplace pas ces contrôles. Pas de mutation en GET ni de CORS à origine wildcard avec credentials.
- Login/register : nouveau cookie et identité minimale ; `GET /api/auth/me` : état authentifié/CSRF non credential ; `POST /api/auth/logout` : révocation effective et idempotente ; `POST /api/auth/logout-all` : révocation globale après vérification du mot de passe. Réponses privées/auth sans cache.
- Les requêtes privées portent le contexte utilisateur attendu capturé côté client ; les écritures portent aussi le workspace de la saisie. Le serveur compare à la véritable session et aux droits dérivés côté serveur, sans utiliser ces headers comme autorisation. Un changement de compte refuse l'ancienne requête avant effet métier. Une génération d'état client rejette les réponses d'un ancien compte.
- Bascule API/UI coordonnée ; aucun fallback Bearer après activation. Les clients historiques devront se reconnecter. Avant toute bascule réelle, inventorier les consommateurs et binaires, migrations, cookie/proxy/TLS et rollback ; rien déployé dans L4.

## Brouillons et admission

La bêta privée est contrôlée côté serveur : fermée par défaut, liste explicite d'emails admis hors Git ; pas de contournement test ni d'activation publique par le frontend. Les comptes existants ne sont pas supprimés par cette liste. Vérification email et récupération d'accès feront l'objet d'un lot avant ouverture publique.

Les brouillons sont en mémoire et temporairement en sessionStorage, pour 24 heures maximum, avec identité utilisateur/workspace/recette, version serveur d'origine et version de schéma. Restauration explicite après vérification de l'identité réelle ; purge à la déconnexion volontaire/changement de compte, aucun secret et aucun rejeu automatique. Une expiration involontaire conserve le brouillon pour une reconnexion du même compte. Le serveur refuse l'écrasement d'une version plus récente. Getters/méthodes storage refusés ou quota plein doivent permettre le repli mémoire. La persistance serveur, l'édition et la corbeille ne sont pas développées dans L4.

## Alternatives et conséquences

JWT mémoire + refresh rotatif impose deux durées, rotation/concurrence et un store de révocation ; non retenu. JWT sessionStorage sans révocation ne répond pas à D2. Le store PostgreSQL ajoute une écriture d'activité par requête privée ; c'est explicite et acceptable pour la bêta, à mesurer avant optimisation. Aucun cache ne peut autoriser une session révoquée. CSRF, cookies bloqués, onglets, rollback et expirations nécessitent les tests HTTP/PostgreSQL/navigateur du [design L4](../project/l4-design.md).

Références techniques consultées le 20 octobre : [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [OWASP CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html), [transactions Prisma](https://www.prisma.io/docs/orm/fundamentals/transactions). Ces références éclairent l'implémentation ; les durées et le périmètre proviennent d'Alex.
