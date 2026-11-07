# Review Gate livraison Windows — PR49, en qualification

7novembre2026. Base18c1ee09, code135c5884, arbre1c51bf0ae9a10c2cc5b7f5cee2bea97305623680. Seize fichiers GitHub relus, chaque blob comparé exactement au clone, aucun fichier supprimé, trois commits avec Design Review préventive. Commentaires/revues/inline vides au contrôle initial. Aucune nouvelle dépendance, aucun lockfile modifié, aucune migration, aucun retrait d'API/CONTRACT.

## Résultats et revue

- Local : backend verify293/29suites et3compat, frontend verify287/42fichiers et2compat, lint et typage natif réussis, builds backend dist/main.js/frontend dist/frontend/browser confirmés. Diffcheck passé.
- Écoute : IP littérale validée, défautloopback ; launcher impose127.0.0.1. Host explicite0.0.0.0 reste possible pour autre environnement, pas utilisé par bêta. Fonctionne IPv4/IPv6, aucun DNS d'écoute implicite.
- HTTP : middleware opt-in sans dépendance ajoutée, api exclus avant fallback, méthodes sûres uniquement, assets manquants404, dotfiles/traversal/jonctions refusés, en-têtes cache/no-sniff. Trusted build seulement ; pas de répertoire sources/uploads mutable. Gestion fichier dans middleware cohésive ; validations startup failclosed. UI aucune modification, anciennes routes Angular conservées.
- Sécurité : SessionGuard/CSRF/cookie/CORS/origine et trustproxy1 inchangés ; nouveau vrai PG/HTTP vérifie productionHTTPS/proxy/sessions. Smoke buildAngular+PG ajouté, pas de changement de retry/timeout/seuil ni suppression d'assertion. Les protections du PC/Serve restent à constater, non prouvées parCI.
- Scripts : diagnostic ne collecte pas identités/IP/env ; Start foreground et Ctrl+C, Stop explicite ne tue pas d'autres processus ; Backup --filecustom/partial/rename/liste/SHA, pgpass externe, aucun passwordargument, restauration et purge non exécutées. Pas de persistance Windows planifiée sans accord.
- Compatibilité : six contrôles existants conservés, contrôle Windows Delivery additionnel pour runtime/builds/PowerShell5.1. Code135c5884 : Windows Delivery réussi (293backend/29suites, buildAngular et scriptsPowerShell5.1), PostgreSQL304/25suites avec nouveau testHTTPS/CSRF et smoke Angular compilé réussis, Chromium44 réussis. Six contrôles historiques :4réussis et2auditséchoués ; Windows supplémentaire réussi. Aucun résultat Windows réel sur le PC utilisateur ni restauration prétendu.

## Blocage constaté : audits des dépendances existantes

Deux contrôles échouent au code135c5884 : backend28constats(5low/23moderate), frontend31moderate dans les chaînes build/test. Racines : globGHSA-3g3m-2fjr-6pw4 (patch14.0.2), minimatchGHSA-g3hv-75wg-m249 (patch11.0.1), deepmergeGHSA-gcqx-w48m-w2h4 low/sanspatch. Les constats transitifs ne représentent pas autant de failles distinctes. Les deux audits locaux séparés --omit=dev rapportent0 ; cela ne dispense pas du Gate complet historique.

Les lockfiles étant identiques à main, vulnérabilités non introduites par cette PR, mais qualification du29octobre ne garantit pas auditau7novembre. Ne pas exécuter auditfixforce (NestCLI12/AngularCLI22/downgradeESLint suggérés), ni relever audit-level, ni ignorerlesdevdeps pour rendreCIverte. Les correctifs publiés glob/minimatch impliquent changements majeurs transitifs et qualification des consommateurs. Autorisation limitée aux deux adaptations : demander une tranche corrective de compatibilité/sécurité ciblée plutôt qu'élargir silencieusement la portée. Travail de livraison et diagnostic restent exploitables pour préparer la suite ; aucun merge ni déploiement tant que D8 non satisfait.

Gate global NON_ADMISSIBLE_AU_MERGE à ce checkpoint. Aucun main qualifié nouveau promis. Après correction autorisée : review entière depuis main, tous contrôles dernierHEAD, mergecommit non destructif, parents/arbre/mergedAt/postmain réellement vérifiés. Branches historiques conservées.
