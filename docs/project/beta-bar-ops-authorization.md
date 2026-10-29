# Bêta privée — état de préparation OPS et autorisations à distinguer

29 octobre2026. Main réel18c1ee09f4a8264ff8ce665374f3dce8345a39a3 revérifié sur GitHub. PR48 intégrée et six contrôles post-merge/journaux287backend/287frontend/303PostgreSQL-HTTP/44Chromium réussis. Ce document prépare une décision ; aucune opération VPS/base réelle/compte/domaine n'est autorisée ou exécutée. BB2b est en pause de développement conformément à la priorité OPS demandée. Sa conception et sa branche sont conservées, pas abandonnées.

## État réel et proposition de phasage à arbitrer

Qualifié en développement : carnet personnel isolé avec édition/corbeille personnelle, carnet Bar partagé et sélection profil, création de Bar nom/palette/OWNER, ajout de comptes existants comme membres/révocation, inventaire physique manuel et historique, suggestions expliquées, plans de batch avec snapshot/versions/base/service/arrondis. Stock entièrement indépendant des recettes/batchs, aucun achat. Les tests utilisent des comptes synthétiques et des bases CI jetables ; aucun staging permanent ou usage réel Alex/Maël n'est prouvé.

Proposition A pour la première ouverture : déployer seulement ce périmètre intégré après qualification OPS. Alex et Maël s'inscrivent séparément via HTTPS après autorisation de création des comptes et allowlist exacte ; Alex crée le Bar dans l'interface puis ajoute Maël MEMBER. Recettes partagées créées directement dans Bar. Dossiers/tags/corbeille partagés ne sont pas annoncés disponibles. Les plans ne constituent pas des déclarations de fabrication.

Proposition B, après cette première ouverture : BB2b déclaration du réalisé puis copie explicite Personnel→Bar, dans leurs incréments et Gates propres. Aucun déplacement SQL, partage implicite ou synchronisation pour contourner l'absence de copie. Si le premier service nécessite des recettes personnelles déjà existantes dans Bar, la copie peut redevenir bloquante : arbitrage d'Alex requis. Ces reports ne sont pas considérés acceptés sans sa réponse.

L'objectif du30octobre reste conditionnel : cible et état inconnu, release/exercice de restauration à qualifier et autorisations OPS distinctes. Impossible d'annoncer aujourd'hui une ouverture sûre à date certaine. Ne pas raccourcir les contrôles de récupération/sécurité pour tenir la date.

## Ce qui manque concrètement pour HTTPS

| Sujet | Preuve actuelle | Travail restant avant ouverture |
| --- | --- | --- |
| Hébergement | Anciennes notes OVH/Ubuntu22.04/Nginx/Certbot/barbook.melioria.fr ; aucune inspection actuelle | Confirmer cible, propriétaire, accès approuvé, services/sites/données existants, ressources et ports |
| Release | Builds et tests Linux CI, Node24/PostgreSQL16 comme références testées | Packaging API/client Prisma/runtime et Angular statique, version exacte/manifeste/checksums, démarrage supervisé/redémarrage, permissions et rollback qualifiés sur environnement isolé autorisé |
| Déploiement | Compose de développement ne décrit que PostgreSQL ; pas de Dockerfile/release Nginx/supervision livrés | Choisir mode de livraison après inventaire, préparer les fichiers minimaux et les tester ; pas d'installation Docker ou changement système présumé |
| Réseau/HTTPS | NODE_ENV=production impose origine HTTPS et cookie __Host-barbook-session Secure/HttpOnly/SameSite=Lax ; trust proxy=1 | Proxy/TLS/renouvellement et origine exacte réels ; API/PG privés et non contournables ; proxy unique maîtrisé, en-têtes transmis/écrasés correctement |
| Écoute API | app.listen(port) sans adresse locale explicite | Prouver la restriction par binding/conteneur/réseau et test externe ; le commentaire de configuration n'est pas une protection réseau |
| Santé | /api retourne Hello World! ; healthcheck Compose PostgreSQL local | Contrôle de disponibilité métier/DB à qualifier, endpoint interne ou contrôle externe équivalent ; ne pas assimiler200API à DB saine |
| Données | Douze migrations versionnées, fresh/redeploy/drift et tests sur CI jetable | État/checksums des migrations et schéma cible inconnus ; données à préserver et exercice de transition sur copie isolée autorisée |
| Exploitation | Dossier préparé, aucune sauvegarde réelle restaurée | D7, destination/protection/rétention, planification vérifiable, restauration mesurée, logs protégés/alertes de panne/disque/sauvegarde et contact incident |
| Comptes | Admission serveur fermée par défaut et contrôles de membership | Deux emails exacts, comptes existants à inventorier, inscription réelle autorisée et recette à deux comptes sur leurs appareils |

Une seule instance API tant que le throttling est en mémoire. Aucun cache de réponses privées ; fallback des routes Angular et actualisation des assets à tester. Les secrets restent hors dépôt/bundle. L'allowlist contrôle les nouvelles inscriptions, pas le login des comptes existants : aucun compte préexistant ne sera supprimé/révoqué implicitement. Le parcours autonome de récupération de mot de passe n'est pas livré ; prévoir une procédure d'assistance sécurisée avant usage réel.

## D7 et informations demandées à Alex

1. Confirmer hôte/cible, domaine retenu et propriété DNS, possibilité d'un espace isolé de validation, moyen d'accès sécurisé à utiliser seulement après autorisation. L'ancienne cible n'est pas un constat actuel.
2. Base neuve ou données existantes à conserver/importer ? Localisation des données personnelles du projet, autres applications/sites/DB/volumes à ne pas perturber, comptes déjà présents à préserver. Aucune copie de données privées n'est présumée autorisée.
3. RPO : perte maximale acceptable ; RTO : durée maximale d'indisponibilité. Proposition à discuter : cibles1h/4h pour une petite bêta, non adoptées ni garanties avant l'exercice. Les anciennes24h/4h n'étaient pas une décision.
4. Destination de sauvegarde hors VPS déjà disponible et sans coût nouveau, protection/chiffrement, détenteurs des accès, durée de rétention et suppression contrôlée des copies ; rétention des logs à définir. Aucune purge physique automatisée autorisée par ce dossier.
5. Fenêtre de maintenance, heure de service visée et personne disponible pour la recette/incident. Adresse d'inscription d'Alex et Maël à communiquer hors Git ; aucun mot de passe partagé.
6. Arbitrage de phasage : ouverture du périmètre intégré sans BB2b/copie, ou l'une de ces fonctions indispensable dès le premier service ?

## Opérations et autorisations

Déjà possible dans le mandat : revue locale du dépôt/CI/migrations et des documents, inventaire des écarts, rédaction de configs/commandes et plan de tests. Aucune connexion distante n'est nécessaire pour ce bilan ; aucune réalisée. Toute préparation de code/config de livraison suivra sa Design Review, ses tests et D8, sans modifier l'infrastructure réelle.

Premier accord distinct, si souhaité : inventaire réel ciblé en lecture seule, sur l'hôte et les bases nommément confirmés. Relever OS/versions/services/ports, capacité mémoire/disque, déploiements existants et volumes, métadonnées proxy/TLS/DNS, version PostgreSQL et journal des migrations/schéma. Compte rendu expurgé, aucune lecture de recettes ou mots de passe, pas de contenu de secrets dans les sorties ; aucune installation, redémarrage, copie/dump, création, renouvellement de certificat ou modification. Accès/logs/audits peuvent laisser les traces normales d'une connexion : lecture seule ne signifie pas absence totale de traces.

Accords suivants, distincts : (a) préparation de staging/stockage/supervision/TLS et sauvegardes ; (b) exercice de restauration et éventuelle copie de données privées sur une cible isolée expressément désignée ; (c) migrations réelles, mise en service et création des comptes/Bar. Chacun exige environnement, données préservées, opérations exactes, risques et retour arrière. D8 ne vaut jamais accord OPS.

Le choix Docker ou services hôte, les commandes finales et les chemins ne sont pas décidés avant l'inventaire. Aucun domaine/contact ACME/compte réel créé ou utilisé pour un test sans accord spécifique. Aucun achat ou service externe ajouté.

## Vérifications et critères de décision d'ouverture

- Avant toute mutation réelle : sauvegarde cohérente des données/configuration nécessaires, manifeste de release et migrations, références/médias réellement présents, protection des autres services. Pour une base existante : checksum/taille ne suffisent pas, restaurer le dump sur cible isolée autorisée et vérifier qu'il est exploitable. Pour une base neuve : exercice avec données synthétiques avant ouverture, puis sauvegarde vérifiée dès les premiers contenus réels.
- Restauration : contrôler schéma/FK, nombres d'objets et contenu échantillonné sous autorisation, identités/workspaces, ABV/versions/corbeille, memberships/révocations, inventaire et historique, plans/snapshots. Mesurer RPO/RTO réels, tester la récupération des secrets nécessaires sans les exposer. Ne pas réactiver involontairement une ancienne session ou adhésion révoquée en restaurant une sauvegarde : stratégie de réconciliation/révocation à intégrer au runbook avant usage.
- Migrations : comparer journal/checksums/schéma réel aux12migrations. Les dernières sont workspace_access_revocation, bar_self_service, manual_inventory et autonomous_batch_plans ; le delta réel dépend de la cible. Tester l'upgrade depuis son état sur copie autorisée, intégrité et durée/verrous. Aucun migrate reset, db push, seed de démonstration, CONTRACT ou down destructif.
- Retour arrière : conserver release/assets/config précédente, prouver sa compatibilité avec schéma et données après écriture. Ne jamais revenir à un binaire ignorant revokedAt/accessVersion, modesABV ou corbeille ; préserver tables/snapshots/mouvements/plans. Échec avant promotion : aucune bascule. Incident après : retour applicatif compatible ; incident de données : arrêt ciblé des écritures, diagnostic/restauration isolée, rapprochement des écritures perdues et accord avant tout remplacement actif. Une restauration DB n'est pas un rollback anodin.
- Sécurité HTTPS réelle : cert valide et renouvellement exercé, HTTP→HTTPS, origine exacte, cookie __Host Secure/HttpOnly/SameSite et sans Domain, CSRF/origine/no-store, API/PG non exposés, forwarded headers/IP/throttling corrects, refus d'inscription non admise et traitement des comptes existants, secrets/logs protégés et en-têtes de sécurité qualifiés.
- Recette finale : deux comptes séparés sur appareils cibles, création/sélection Bar et retour Personnel, lecture/création/édition visibles entre membres, isolation, brouillons/expiration, conflits, révocation avec acteurs de test, inventaire/réapprovisionnement, plans sans stock. Après restauration, rejouer les parcours essentiels. Aucun retrait d'un compte réel pour tester sans accord.

GO seulement après preuves et autorisations correspondantes ; sinon reporter l'ouverture en nommant le blocage réel. Fin du délai de corbeille30jours ne prouve jamais l'effacement physique, notamment dans les sauvegardes. Aucun engagement de disponibilité réelle fondé sur les seules CI.
