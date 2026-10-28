# Store des sessions — préparation B4a

État de branche B4b : store raccordé à l'API/Angular ; JWT retiré. Voir [contrat web](authentication.md), [ADR 0005](../adr/0005-revocable-web-sessions.md), [critères L4](../project/l4-design.md), [handoff](../project/agent-handoff.md). Aucun changement propriétaire/production.

## Contrats internes

Session appartient à User, sans workspace arbitraire ni rôle figé. Seul SHA-256 du credential CSPRNG32octets est enregistré (`tokenHash`, unique) ; `id` n'est pas un credential. Le CSRF est indépendant, stocké côté serveur et insuffisant pour authentifier. Ne jamais loguer ces valeurs ou les placer dans une URL. B4b délivrera le credential uniquement en cookie HttpOnly et le CSRF en mémoire du client authentifié.

Les cinq timestamps sont timestamptz(3), décidés par PostgreSQL. CHECK pour hash/format CSRF/ordre temporel, FK User cascade et indexes hash/user/échéances. Standard2h inactive/12h absolue ; option explicite7j/30j. Échéance absolue immuable dans le service ; token inconnu, mal encodé, expiré ou révoqué refusé.

`SessionService.create(tx,userId,persistent=false)` reçoit la transaction d'inscription complète ou de login, sans transaction imbriquée indépendante. `revokeAll(tx,userId)` prend le même verrou User. **ReadCommitted obligatoire** : une autre isolation est refusée pour éviter un snapshot manquant un login committé pendant l'attente. Les appelants doivent passer `isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted`. Le store ne réalise pas de réauthentification HTTP ; AuthService/guards le feront en B4b/B4e.

`authenticate(credential)` verrouille puis valide/actualise dans une requête SQL. Un CTE matérialisé place le contrôle d'expiration après la prise du verrou, y compris après attente. Prolongation inactive plafonnée à l'absolue ; jamais de remise à null de revokedAt ou de raccourcissement d'échéance. `revoke` est idempotent, même expiré/inconnu ; global reste limité au user. Une requête déjà autorisée n'est pas annulée rétroactivement. Supprimer un user supprime ses sessions.

`prune()` supprime au plus500 lignes expirées/révoquées avec SKIP LOCKED, en préservant les actives. La validité ne dépend pas de la purge. Le nombre supprimé est borné, le scan peut examiner davantage de métadonnées ; mesurer avant audience importante. Aucun job planifié ou changement d'infrastructure activé en B4a.

## Migration et vérification

`20261020095600_web_sessions` ajoute seulement table/index/FK/CHECK dans une transaction ; six migrations historiques inchangées. Aucune conversion de token/donnée métier. Upgrade compare comptes/workspaces/recettes/liens ; fresh/redeploy/status/diff restent requis. Les CHECK non représentés par Prisma sont testés directement.

Exécuter `npm --prefix backend run verify`, `npm --prefix backend run test:integration:safety`, puis prepare/test:e2e exclusivement selon les [garde-fous](integration-tests.md) sur loopback `barbook_test_*` explicitement optée. Pas de connexion DB mockée. Unitaires : encodage/durées ; natifs : stockage haché, autre instance Nest, expiration/plafond/attente, replay, transactions, verrous réellement observés, FK/CHECK/unicité/cascade et purge. Les résultats réellement passés se lisent au checkpoint/CI.

Aucune base propriétaire inventoriée/migrée. Backup/restore, recovery Prisma, rollback de bascule et TLS/cookies réels restent à qualifier avant livraison autorisée. B4a était additif ; B4b raccorde maintenant cookie/CSRF/UI. L'admission privée, les brouillons complets et la révocation globale restent dans leurs blocs ; aucun L5 ou CONTRACT.

## Frontière web B4b

WebSessionService et SessionGuard raccordent les primitives origine/cookie/CSRF/contexte aux routes réelles. inspect lit sans renouveler ; authenticate après les contrôles doit encore réussir. Une prélecture n'autorise jamais une opération. Les44tests de primitives sont conservés et les tests HTTP/PG exercent le vrai bootstrap. revoke accepte un client transactionnel pour la rotation au login ; aucun Set-Cookie sur logout ou401. Consulter le handoff pour les résultats réellement passés.
