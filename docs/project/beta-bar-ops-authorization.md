# Demande OPS distincte — Bêta Bar

27 octobre 2026. **Préparée, aucune opération autorisée ni exécutée.** Ce dossier ne constitue pas une demande de déploiement immédiatement exécutable : la cible et les sauvegardes réelles restent inconnues. Le code qualifié et les tests CI ne prouvent pas une instance accessible à Alex et Maël.

## État et périmètre minimal proposé

Développé et qualifié sur main : L4/L5 personnel et BB1a (droits serveur des membres). BB1b en développement ; aucun carnet partagé complet qualifié. Les instances CI sont jetables, avec comptes synthétiques ; elles ne sont ni un staging permanent ni une instance prête pour Alex/Maël.

La livraison complète du30octobre est à risque. Le plus petit périmètre de mise en service proposé est : deux comptes distincts admis explicitement, carnet personnel isolé, un Bar avec Alex OWNER/Maël MEMBER, sélection visible, consultation/création/édition, révocation effective, conflits sans écrasement et brouillons protégés. La copie personnelle→Bar peut être reportée si elle retarde ce socle, après décision explicite ; aucune copie improvisée via SQL, aucun partage implicite. Inventaire manuel et suggestions constituent la livraison utilisable suivante. Batchs indépendants ensuite ou en parallèle, sans consommation automatique. Aucune fonction absente n'est annoncée livrée.

## Première autorisation proposée : inventaire de la cible en lecture seule

Cible historique évoquée : VPS OVH Ubuntu22.04, Nginx/Certbot et domaine barbook.melioria.fr. **À confirmer, pas un constat actuel.** Informations indispensables : hôte et moyen d'accès approuvés, propriétaire de l'instance, domaine retenu, environnement staging/production, services et données déjà présents, répertoires/volumes à préserver, capacité disque/RAM, versions et ports. Aucun secret dans Git ni dans la conversation.

Autorisation à solliciter séparément : inspection ciblée en lecture seule des services, versions, capacité, proxy/TLS, ports, volumes et schémas/migrations. Pas d'installation, redémarrage, changement de firewall/DNS, création de compte ou copie de données privées. Le compte rendu permettra de fixer les chemins et commandes exacts ; les anciennes notes ne justifient aucune intervention.

## D7 — décisions requises avant exploitation

- Perte maximale acceptable (RPO) : non validée. L'ancienne proposition24h n'est pas une décision.
- Délai maximal de reprise (RTO) : non validé. L'ancienne proposition4h n'est pas une décision.
- Destination, protection/chiffrement, rétention et personnes habilitées pour les sauvegardes : à choisir sans coût externe implicite.
- Fenêtre de maintenance, responsable de validation et procédure de contact en incident : à confirmer.
- Données existantes à conserver et autorisation éventuelle de copie vers staging : à préciser ; par défaut comptes/données synthétiques seulement.

## Conditions techniques de la seconde demande : staging et mise en service

Release exacte identifiée par SHA/digests et six contrôles verts, Gate sans BLOCKER/P1. Packaging API/Angular à qualifier, versions Node/PostgreSQL compatibles et ressources suffisantes. Une seule instance API tant que le throttling est en mémoire. Nginx sert Angular et proxy /api ; API/PG non exposés publiquement, trust proxy cohérent avec le proxy réel. HTTPS valide, renouvellement TLS vérifié, cookies Secure/HttpOnly, CSRF/origine et no-store. Aucun secret dans le bundle frontend ; configuration privée au serveur.

Recenser les migrations réellement appliquées. BB1a ajoute20261026131500_workspace_access_revocation aux huit historiques ; ne pas supposer que la base cible est à ce niveau. BB1b n'a pas de migration nouvelle à ce checkpoint. Toute migration propriétaire exige une autorisation distincte avec backup vérifié et comparaison du schéma. Jamais migrate reset, down destructif, purge ou écrasement.

Comptes : Alex et Maël identifiés par leurs adresses confirmées, allowlist exacte, pas de wildcard. Inscription et mots de passe par leurs titulaires via HTTPS, aucun mot de passe commun ou secret publié. Création contrôlée du Bar et de l'appartenance OWNER d'Alex, puis MEMBER Maël ; script/commande idempotent et périmètre relus avant autorisation. Aucune route publique d'auto-attribution OWNER. Tester retrait/réadmission avec acteurs synthétiques, pas retirer un compte réel sans accord.

## Sauvegarde et restauration à prouver

Avant mutation : inventaire des données et export PostgreSQL cohérent, références/médias présents, manifeste release/migrations et configuration protégée. Destination distincte et permissions contrôlées ; checksum et taille enregistrés sans contenu privé dans Git. Une copie de fichier ou un checksum ne prouve pas la récupérabilité.

Restaurer d'abord sur une base isolée expressément autorisée ; vérifier nombre d'objets, FK/workspaces, recettes/contenu/ABV, versions/corbeille, sessions et memberships, puis login/isolation et parcours. Mesurer durée et perte pour comparaison à D7. Conserver preuve datée et erreurs. Pas de restauration d'essai sur la base active. Les expirations de corbeille ne prouvent pas l'effacement des dumps.

## Plan de changement et retour arrière à soumettre

Après inventaire et exercice : fournir cible/chemins exacts, données à préserver, commandes finales, SHA/digests, neuf migrations ou delta effectivement nécessaire, sauvegarde/exercice datés, durée estimée, critères d'abandon et responsable. Séquence proposée : sauvegarde vérifiée → préparation isolée → migrations additives autorisées → release → smoke HTTPS/DB/auth/isolation → recette Alex/Maël → décision de promotion. Aucun coût ou infrastructure supplémentaire sans accord.

Échec avant promotion : ne pas basculer. Échec applicatif après : revenir à un binaire compatible avec ABV/corbeille ET revokedAt/accessVersion ; jamais à un binaire qui ignore la révocation. Garder assets et release précédents, ne pas réécrire l'historique Git. Incident de données : suspendre seulement les écritures concernées, diagnostiquer, restaurer sur cible isolée, mesurer/rapprocher les changements perdus, puis demander l'accord avant remplacement de données actives. Aucun rollback DB destructif automatique.

## Validation demandée, en deux étapes

1. Confirmer les informations de cible et les décisions D7, puis autoriser explicitement l'inventaire réel en lecture seule décrit ci-dessus.
2. Après inventaire et préparation vérifiable, examiner la demande finale avec commandes/cible/sauvegarde/restauration/rollback précis ; autoriser séparément staging, migrations, provisionnement et déploiement souhaités.

Aucune de ces autorisations n'est présumée par le mandat de développement ou une CI verte. L'absence d'accord OPS ne bloque pas le développement et la qualification des parcours indépendants.
