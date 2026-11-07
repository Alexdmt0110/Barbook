# Livraison bêta Windows — revue préventive, 7 novembre 2026

Mandat : écoute IP explicite, build Angular sur le même serveur et scripts opérateur. Base vérifiée main18c1ee09 ; BB2b/copie et branche historique conservés. Aucune opération PC/VPS réelle autorisée.

## Choix et invariants

- LISTEN_HOST est une adresse IP littérale validée, défaut127.0.0.1 (IPv4/IPv6 supportées). PORT conserve son contrat. Aucune résolution DNS implicite. Les environnements qui exigent une autre interface doivent la déclarer explicitement.
- FRONTEND_DIST_DIR est optionnel ; sans valeur, API seule inchangée. Avec valeur, chemin absolu vers le dossier browser Angular, index.html requis au démarrage. Ne jamais exposer la racine du dépôt ou .env ; refuser dotfiles, traversal et liens symboliques, servir seulement des fichiers publics du build. Pas de listing, pas de cache privé.
- API /api et /api/* toujours exclue du fallback (y compris casse/encodage), erreurs HTTP conservées. Fallback uniquement GET/HEAD acceptant HTML, navigation sans extension. Assets manquants404, méthodes non sûres jamais index. Cache index/no-store et assets/no-cache pour éviter une release périmée.
- Tailscale Serve est le seul proxy HTTPS vers loopback. trustproxy1 et protections L4 restent inchangés. Pas de ngserve, Docker, WSL, second proxy ou Funnel.
- Scripts PowerShell opérateur : lancement au premier plan, arrêt Ctrl+C gracieux, désactivation Serve explicite et ciblée. Ne jamais tuer des Node/PostgreSQL étrangers ni modifier services/pare-feu/politique Tailscale. Sauvegarde pg_dump custom vers dossier externe au dépôt, pgpass hors Git ; publication atomique après succès, pas de purge automatique. Restauration uniquement vers cible isolée après accord distinct.
- Diagnostic lecture seule et rapport sans noms de machine/utilisateurs/IP/secrets. Politique Tailscale à adapter à l'état réel : deux identités -> seul PC/443 ; supprimer les permissions plus larges applicables, préserver les autres usages. Personal non commercial seulement ; usage au bar nécessite confirmation d'éligibilité, aucun achat.

## Qualification

Unités : host/port, config statique invalide. HTTP réel : fichiers, routes profondes, assets absents, API404/403/401, méthodes, dotfiles/traversal, entêtes/cookies et CSRF existants. Serve/Windows/pg_restore réellement testés séparément avant ouverture, jamais revendiqués depuis Linux. Six CI historiques non affaiblies ; Gate entier puis D8 mergecommit/postmain. Scripts analysés et testés sur Windows synthétique si environnement disponible ; sinon limite bloquant leur utilisation sans recette locale.

## Risques et alternatives

Servir depuis Nest évite un deuxième proxy et ses ambiguïtés CSRF. Middleware dédié cohésif, aucune dépendance ajoutée. Build statique de confiance uniquement, aucun upload dans ce dossier. Loopback ne protège pas d'un processus malveillant sur le PC. PC endormi/arrêté indisponible. Sauvegarde même disque ne couvre pas perte/vol/compromission ; RPO4h/RTO24h non garantis dans ces scénarios. Migration OVH par dump complet, identités conservées, sessions invalidées et reconnexion, brouillons navigateur non transférés.

Qualification supplémentaire : job Windows Delivery (septième contrôle, six historiques conservés), backend verify/Angular build Windows, analyse PowerShell5.1/diagnostic et refus avant toute opération sans configuration ou destination sûre. Smoke release Linux avec vrai build Angular et PostgreSQL jetable. Les tests de jonctions utilisent une jonction Windows sans privilèges de création de symlink fichier.
