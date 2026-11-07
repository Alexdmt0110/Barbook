# Première bêta Windows privée — procédure à autoriser séparément

7 novembre 2026. Aucune installation, base réelle, compte, Tailscale, DNS ou opération VPS autorisée par le développement de ces scripts. BB2b et copie Personnel→Bar reportés. D8 ne vaut pas autorisation d'ouverture. Utilisation réelle seulement après recette et acceptation du risque de sauvegarde locale.

## 1. Diagnostic à exécuter maintenant, lecture seule

Depuis une copie vérifiée du dépôt : `powershell -NoProfile -File scripts/windows/Diagnose-Barbook.ps1`, sans administrateur. Transmettre uniquement ce rapport : version/architecture Windows, versions des outils, RAM/disque et occupation3000/5432/443. Aucun .env, mot de passe, clé, capture Tailscale, IP, nom de machine ou sortie de processus. « Not on PATH » ne prouve pas l'absence d'un logiciel : inspecter ensuite son emplacement connu sans recherche globale. La liste des logiciels manquants dépend de ce rapport.

Cible proposée Windows11x64 maintenu, Node24/npm11.7, Git, PostgreSQL16 avec psql/pg_dump/pg_restore, Tailscale. Angular/Nest/Prisma proviennent uniquement des lockfiles via npm ci, pas de CLI globale, upgrade ou contournement antivirus. Pas de Docker/WSL. Installation des outils absents après accord. Binaires natifs construits sous Windows, jamais copier node_modules Linux.

## 2. Préparation de release — après accord machine

Clone dédié hors OneDrive, sources au commit qualifié réellement identifié. Exemple C:\Barbook\app ; ne pas écraser un clone sale. Copier .env.example vers .env privé uniquement après accord. Protéger ACL du dossier aux utilisateurs nécessaires ; secrets jamais committés. Le répertoire frontend/dist/frontend/browser doit contenir uniquement le build de confiance, pas uploads/secrets. Ne pas modifier les réglages Node/PG de tes autres projets.

Dans backend : `npm ci`, puis `npm run verify` ; dans frontend : `npm ci`, puis `npm run verify`. Vérifier chaque code de sortie. `npm run build` suffit aux reconstructions suivantes de la release déjà qualifiée. Ne pas définir NODE_ENV=production avant npm ci (les outils de build sont des devDependencies). Build backend attendu dist/main.js ; frontend dist/frontend/browser/index.html. Le launcher vérifie ces deux chemins.

Paramètres racine .env : POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DB, DATABASE_HOST=127.0.0.1, DATABASE_PORT=port local retenu, PORT=3000, FRONTEND_ORIGIN=https://nom-exact.ts.net (sans slash final), NODE_ENV=production, REGISTRATION_ALLOWED_EMAILS=deux emails exacts privés, LISTEN_HOST=127.0.0.1. Start fixe production/loopback/frontend absolu dans son propre environnement et restaure l'environnement parent après sortie. Aucun secret dans les scripts. Liste d'admission fermée par défaut, ne révoque pas les comptes existants.

## 3. Base neuve — après autorisation distincte

Créer cluster/service local uniquement si nécessaire, écoute loopback, aucune règle entrante publique. Base dédiée barbook_beta, rôle applicatif non superuser et rôle migration propriétaire dédié si nécessaire ; permissions minimales, secrets locaux. Vérifier serveur/port/nom et absence de données avant migration. Les mêmes variables POSTGRES_* sont utilisées par le CLI : fournir temporairement le rôle migration par environnement, puis revenir au rôle runtime sans imprimer son secret. Aucun reset/db push/seed/import d'exemples.

Depuis backend : `.\node_modules\.bin\prisma.cmd migrate deploy`, puis `migrate status` avec le même exécutable local. Appliquer l'ensemble des migrations versionnées, dont `20261107170000_recipe_canonical_names`. Cette dernière exige UTF8, inspecte les collisions sous verrou puis ajoute clé/trigger/CHECK/index unique ; les recettes et URLs ne sont pas corrigées automatiquement. En cas de collision ou erreur, arrêter et faire examiner le diagnostic avant toute résolution ou nouvel essai ; ne pas forcer/reset/db push. L'autorisation de tests jetables ne vaut pas accord d'application sur cette base réelle. Vérifier schéma et droits runtime. Pas de test natif contre cette base : les tests du dépôt exigent une base jetable gardée.

## 4. Accès privé Tailscale — après accord réseau

Références officielles consultées le7novembre2026 : https://tailscale.com/docs/features/tailscale-serve ; https://tailscale.com/docs/reference/tailscale-cli/serve ; https://tailscale.com/docs/solutions/host-private-server-docker ; https://tailscale.com/pricing . Serve privé ≠ Funnel public : ne jamais activer Funnel. Certificat pour nom Machine.tailnet.ts.net ; nom visible dans transparence des certificats, choisir un nom neutre. MagicDNS/HTTPS et invitations sont des opérations nécessitant accord.

Inspecter la politique existante et les mappings Serve/Funnel avant toute mutation. Ne jamais remplacer tout le fichier de politique pour appliquer un exemple. Privilégier un alias hosts qui cible uniquement l'adresse Tailscale stable de ce PC, sans tagger arbitrairement un PC personnel. Groupes composés des deux identités Tailscale exactes, distinctes des comptes Barbook. Fragment d'intention à intégrer après inspection :

```json
{
  "groups": { "group:barbook-beta": ["<identite-alex>", "<identite-mael>"] },
  "hosts": { "barbook-beta-pc": "<IP-Tailscale-PC>" },
  "grants": [{ "src": ["group:barbook-beta"], "dst": ["barbook-beta-pc"], "ip": ["tcp:443"] }]
}
```

Retirer/restreindre les anciennes règles générales qui autorisent Maël sur ce PC ou d'autres ressources ; ACL/grants sont additifs, un grant restrictif ne neutralise jamais allowall. Aucun subnet router/exitnode/RDP/SSH/SMB/3000/5432 pour Maël. Auditer les autres machines/routes du tailnet ; préserver les usages légitimes d'Alex sans privilèges implicites pour Maël. Tests de politique : Maël443autorisé,3000/5432/3389/445 et autre machine refusés ; troisième identité443refusée. Vérifier aussi l'exposition LAN Windows : le contrôle Tailscale n'est pas le pare-feu LAN. Aucun nouveau service d'administration exposé.

Personal est annoncé gratuit pour usage non commercial. Une validation personnelle sans exploitation peut entrer dans ce cadre ; une bêta destinée à un bar n'est pas automatiquement admissible parce qu'elle est privée ou temporaire. Confirmer le contexte exact et, en cas de doute, obtenir clarification de Tailscale avant activation. L'exploitation réelle du bar ne doit pas être présumée éligible. Aucun essai payant, abonnement ou dépense autorisé. Cela bloque l'activation concernée, pas la préparation locale.

## 5. Lancement/arrêt explicites

`powershell -NoProfile -File scripts/windows/Start-Barbook.ps1` : application au premier plan, aucune installation/migration/Serve. Ne pas cliquer sur une autorisation pare-feu publique. Vérifier TCP3000lié à127.0.0.1 seulement et PostgreSQLlocal. Une requête de session HTTP directe peut503en production : attendu, ne pas affaiblir Secure/CSRF.

Après contrôles et accord : dans console administrateur séparée, `tailscale serve status`, puis `tailscale serve --bg --https=443 http://127.0.0.1:3000`, puis status. Ne pas remplacer un mapping existant sans plan. Un seul proxy, routes /api inchangées, Angular /api relatif, origine exacte HTTPS. Vérifier request.secure/headers forwarded/IP/rate-limit, CORS, cookies __Host Secure/HttpOnly/SameSite=Lax sansDomain, csrf/no-store. Ne pas utiliser HTTP/IP/noms alternatifs comme origine. Les erreurs API ne doivent jamais devenir HTML ; recharger routes Angular profondes et assets. Tailscale n'authentifie pas automatiquement les comptes Barbook.

Arrêt : `powershell -NoProfile -File scripts/windows/Stop-Barbook.ps1 -DisableDedicatedServe`, vérifier le mapping affiché et confirmer seulement s'il est dédié à Barbook ; puis Ctrl+C dans la console de lancement et attendre fermeture. Le script ne tue aucun processus, ne stoppe pas PostgreSQL et ne modifie pas les autres mappings. Pas de tâche cachée ou lancement automatique par défaut. PC éveillé/connecté nécessaire ; fermeture session/reboot peut couper Tailscale, unattended seulement après accord. Tester redémarrage propre et reprise des données.

## 6. Sauvegarde locale et restauration

Créer dossier privé hors dépôt et configurer le fichier pgpass Windows (%APPDATA%\postgresql\pgpass.conf) avec ACL restrictives ; jamais mot de passe dans ligne de commande/conversation. Évaluer le disque, son chiffrement existant et la place avant planification. Script : `powershell -NoProfile -File scripts/windows/Backup-Barbook.ps1 -OutputDirectory C:\BarbookBackups -UserName <role> -Port <port>`. Le rôle backup doit pouvoir lire toute la base Barbook, sans accès aux autres bases métier. Format custom via --file évite corruption des flux binaires PowerShell5.1. .partial conservé en cas d'échec ; .dump renommé après succès, liste archive et SHA256. Cela ne prouve pas une restauration.

Proposition après mesure : tâche horaire pendant PC allumé, rattrapage après réveil, pas de chevauchement, code de sortie contrôlé et suivi local du dernier succès ; alerte visible à2h d'ancienneté, aucun RPOgaranti PCéteint. Rétention48hhoraires/14jquotidiens à valider selon volume. Aucune purge automatique incluse : examiner et autoriser séparément la suppression des seules archives Barbook. Sans purge, surveiller capacité avant saturation.

Avant ouverture : créer base isolée explicitement autorisée, restaurer avec pg_restore --exit-on-error --no-owner --no-privileges, rôle cible et droits adaptés ; jamais --clean sur base active. Vérifier comptes/hashes, workspace/rôles, recettes/ABV/versions/corbeille, inventaire/historique, plans/snapshots, migrations et démarrage d'une instance sans exposition externe. Mesurer délais, vérifier checksum et quantités ; une liste d'archive ou checksum ne suffit pas. Sauvegardes doivent inclure configuration de reconstruction/secrets protégés séparément et références média présentes, sans copier les autres projets.

Même disque = risque de perte totale, vol, ransomware/compromission communs. RPO4h/RTO24h objectifs seulement lorsque sauvegardes et machine restent exploitables, pas promesses. Présenter résultats et demander acceptation explicite avant ouverture.

## 7. Recette réelle et migration OVH future

Deux comptes séparés admis, Alex crée Bar OWNER, ajoute Maël MEMBER. Vérifier visibilité create/edit, isolation Personnel, permissions/refus OWNER, versions409/saisie conservée, expiration/brouillons, déconnexion/révocation, stockmanuel/historique/suggestions, plans sansstock, mobile/desktop, accès sans Tailscale refusé, ports directs LAN/tailnet refusés. Faire tests destructifs/révocation avec acteurs synthétiques avant comptes réels. Aucune inscription en ton nom sans accord. Ce qui est qualifié CI n'est pas encore installé.

OVH plus tard avec autorisation distincte : arrêt écritures PC, dumpfinal, transfert chiffréautorisé, restauration testée dans cible préparée, mêmes identifiants et hashes (pas de recréation comptes/recettes), migrations compatibles, sessions invalidées sans réactiver révoquées, reconnexion sur barbook.melioria.fr. Pas d'écritures parallèles PC/OVH. Brouillons navigateur ne suivent pas l'origine ; les traiter explicitement avant bascule. Conserver source en lecture seule/backup jusqu'à validation, jamais effacer automatiquement.


## Unicité des noms — conséquences d'exploitation

La corbeille réserve nom canonique et URL tant que la ligne existe, même après30jours ; restauration expirée ne signifie pas effacement. Pas de purge physique incluse. Le rollback applicatif conserve la migration additive : le trigger et l'index restent actifs pour l'ancien client, qui peut afficher un409 générique. Ne jamais désactiver ces protections pour accepter une ancienne écriture. Les sauvegardes/restaurations doivent porter sur schéma et données ensemble : fonction, trigger, CHECK et index sont nécessaires ; un export de seules recettes ne suffit pas. La restauration exercée, après autorisation distincte, devra aussi démontrer le refus d'un doublon. Tous les essais de cette tranche sont sur bases CI jetables, pas sur le PC réel.
