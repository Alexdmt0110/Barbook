# Design Review préventive — L4 B4d

21 octobre 2026. Autorisation explicite : intégrer #28 puis poursuivre B4d. Base qualifiée : main0c4a5580f3fe7d8e71c83c0434aadc3ce46d1e73. Aucun merge futur autorisé.

## Contrat et risques avant code

Les formulaires existants de création et d'organisation reçoivent un brouillon par onglet, en mémoire et dans sessionStorage, sans credential. Enveloppe versionnée bornée, propriétaire utilisateur/workspace confirmé par /me, type de formulaire et ID stable de recette (création : nouveau). Durée24h depuis la dernière saisie, jamais prolongée par lecture/restauration. Pas de localStorage privé ni de sauvegarde serveur nouvelle.

La saisie est capturée synchroniquement, y compris valeurs invalides, unités et métadonnées d'ingrédients. Une expiration suspend l'accès sans supprimer ; une identité différente ou un logout volontaire purge avant navigation, même si la révocation HTTP échoue. Les messages entre onglets portent une intention et un contexte, jamais une session ; ils ne peuvent authentifier personne. Une réponse tardive ne peut réinstaller un brouillon purgé.

Restauration uniquement proposée après identité confirmée ; choix explicite restaurer/abandonner avant nouvel envoi. Pour l'organisation : ID et version d'origine conservés, comparaison à la version serveur fraîche ; conflit bloque la sauvegarde, rechargement explicite remplace le brouillon. Le expectedVersion serveur protège encore une course après restauration. Pour la création : le schéma de formulaire est vérifié ; aucune mutation serveur n'existe encore à comparer. Aucun replay automatique. Une mutation en vol est marquée avant envoi ; son résultat inconnu impose vérification explicite avant toute nouvelle soumission.

Stockage refusé/saturé : saisie mémoire conservée, avertissement visible sur la perte possible au refresh. Purge limitée à notre clé ; suppression puis remplacement vide si suppression refusée. Si toutes les opérations sont refusées, accès mémoire fermé, restauration interdite et suppression retentée dans ce processus ; signaler honnêtement qu'un effacement navigateur reste nécessaire. Une API refusée ne permet pas de garantir un effacement physique : ne jamais promettre le contraire. Pas de mécanisme de sécurité fondé sur le contenu non fiable du navigateur.

Guard de sortie et abandon explicite ; aucune confirmation ne bloque expiration/logout. Pas d'autosave de l'état initial sur un candidat non encore accepté. Envoi réussi supprime seulement le brouillon concerné ; résultat incertain garde la saisie et l'avertissement. Changement d'identité invalide les handles précédents.

## Qualification prévue

Tests de store : TTL limite/horloge future/schéma corrompu/taille, utilisateur/workspace/recette isolés, reprise même compte, purge avant requête et échec storage, handles périmés et résultat inconnu. Tests Angular réels : formulaire complet/invalidité, restauration sans POST, abandon, erreurs réseau/401/409, conflit et version fraîche, changement de compte/logout/réponses tardives. Chromium desktop/mobile contre HTTP/PostgreSQL : refresh, expiration/reconnexion, stockage refusé et concurrence de version sans écrasement. Conserver les suites et quotas existants.

Commits atomiques immédiatement publiés et vérifiés ; six checks Actions à chaque checkpoint. Review Gate final de toute la branche depuis main après correction, PR soumise à Alex. B4e global logout et B4f restent distincts. Aucune dépendance, migration, infrastructure, CONTRACT, base propriétaire, production ou L5.
