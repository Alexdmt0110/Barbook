# Design Review B5e — interface de corbeille personnelle

26 octobre 2026. Base adc6551df1592cc0ce97af7346a1f0703288c51f recontrôlée : six checks post-merge verts. Branche feature/personal-trash-ui publiée à cette base. D5, L5-COMPAT-01B et D8, personnel uniquement.

## Parcours et responsabilités
Liste paginée /trash, indépendante des slugs, dates UTC et expiration sans promesse d'effacement. Lien depuis la fiche vers /cocktails/id/:id/delete : le guard existant protège la sortie des brouillons. Confirmation explicite nommée pour suppression et restauration. Service HTTP dédié et composant d'action commun ; pages responsables de navigation/pagination, sans duplication de logique serveur.

## Intention et identité
GET lifecycle prépare et affiche les deux versions ; seul le bouton confirmer les transmet. Une requête à la fois. Après409, transport ou5xx, intention bloquée et vérification explicite de l'état courant ; nouvelle confirmation requise si l'opération reste nécessaire. Aucun retry/replay/force-save. État déjà atteint après réponse perdue : lecture sans nouvelle écriture. Leases DraftStore et AuthInterceptor existants protègent user/workspace/génération ; changement d'entrée/détruction annule les abonnements et réponses tardives. Aucun nouveau moteur de drafts, aucun stockage de commande, aucun effacement de brouillon sur cycle ; versions serveur rendent les vieilles saisies obsolètes.

## UX et tests
Boutons natifs clavier, section de confirmation nommée, messages status/alert, pagination et responsive. canRestore reste indicatif ; serveur décide après attente. Unitaires HTTP/DOM : annulation, doubleclic, versions exactes, conflits/réponses perdues, identité et tardif, expiration et pagination. Chromium réel desktop/mobile : création/édition/corbeille/restauration, ancienneURL et contenu conservés, clavier, conflit et réponse réellement enregistrée puis perdue. Suites L4/B5c de drafts et PostgreSQL220/backend273 conservées sans assouplissement. Gate complet, six checks dernierHEAD puis mergecommit D8 et qualification main. B5f complète ensuite la matrice10critères avant BB1.

## OPS et limites
Aucun schéma/migration/dépendance/infra modifié. Aucun partage, purge, archivage ou média. Compose ne fournit que PG local ; /api n'est pas une preuve de disponibilité DB. Sauvegarde restaurée et rollback binaire compatible avec deletedAt à prouver avant exploitation ; D7 et VPS/base propriétaire nécessitent accord distinct. Aucun arbitrage nouveau identifié.
