# Brouillons temporaires — L4 et extension L5 B5c

## Extension édition sur branche B5c — 23 octobre 2026

Le formulaire `/cocktails/id/:id/edit` réutilise exactement DraftStore/FormDraft, clé `edit:<ID stable>` et version de contenu originale ; valeur `{schema:1,form}` validée strictement. GET de recette active et identité confirmée avant proposition ; aucune réhydratation automatique. ML bruts/modes ABV conservés ; le brouillon conserve aussi les saisies invalides finies pour correction. Le candidat n'est pas écrasé par le chargement initial.

409 ou restauration d'une ancienne version bloque l'envoi sans effacer la saisie. Réponse perdue/5xx reste incertaine, y compris après refresh : aucun retry. En édition, DraftNotice n'offre pas le bouton générique d'autorisation de renvoi. « Comparer avec le serveur » lit tous les champs en lecture seule sans changer la version/saisie ; « Abandonner la saisie et charger cette version serveur » requiert confirmation et retire l'ancienne intention. Une nouvelle modification doit être saisie explicitement ; une nouvelle course reste protégée côté serveur.

Succès connu purge uniquement la cléédition, garde les autres brouillons et préremplit la réponse serveur. Annuler revient à la fiche avec le guard existant et conserve temporairement le brouillon ; abandon explicite est distinct. Expiration, identité, purge et stockage dégradé gardent toutes les règles L4 ci-dessous. Aucun deuxième moteur ni sauvegarde serveur. Tests locaux218frontend/261backend ; nouvelles preuves Chromium encore à acquérir au checkpoint initial, voir Gate/journal courants. [Design](../project/l5-b5c-design.md), [Gate](../project/reviews/l5-b5c-review-gate.md). Les exclusions historiques de L5 ci-dessous décrivent B4d à sa livraison, pas cette extension.

Périmètre : création de recette et organisation de recette existantes. Pas de sauvegarde serveur, d'édition L5 ni de resoumission automatique. Le [design](../project/l4-b4d-design.md) et le [Review Gate](../project/reviews/l4-b4d-review-gate.md) décrivent les preuves et limites.

## Propriété et durée

DraftStore conserve une enveloppe `barbook.drafts.v1` uniquement dans sessionStorage et sa copie mémoire par onglet. Aucun JWT, mot de passe, cookie ni CSRF n'y entre. Le propriétaire utilisateur/workspace est confirmé par `/api/auth/me`, jamais par le contenu du stockage. Les clés sont `create:new` et `organization:<ID stable de recette>` ; un slug réutilisé n'est pas une identité.

Enveloppe versionnée ;20entrées maximum,500000 caractères sérialisés pour la persistance, bornes de tableaux et de chaînes, types/valeurs d'unités et contrôles de formulaire vérifiés. Les valeurs brutes invalides et unités cL sont conservées avec les métadonnées des ingrédients sélectionnés. Le navigateur reste une source non fiable : aucune autorisation ni version serveur n'est accordée par ce JSON.

Une entrée expire24h après sa dernière saisie enregistrée. Lecture/restauration/rejet d'une requête ne prolongent pas son échéance. Les entrées expirées sont refusées et leur payload retiré lors d'un accès/import si le navigateur accepte l'écriture ; aucun code ne peut supprimer une donnée dans un navigateur fermé. Le schéma de formulaire est vérifié avant restauration, y compris l'absence de contrôles inconnus ; une création attend la version1.

## Cycle de vie

Expiration involontaire : suspension de l'accès et invalidation des handles des anciens formulaires, sans purge. La reconnexion au même compte/workspace conserve les entrées mémoire et propose une restauration explicite. Un compte ou workspace différent purge avant accès ; les callbacks capturés ne peuvent recréer les anciennes entrées. Logout volontaire : purge locale avant HTTP, même si la révocation échoue ; intention contextualisée envoyée aux onglets actifs via BroadcastChannel, sans credential. Ce signal ne confirme aucune identité.

Le formulaire initial n'écrase pas le candidat en attente. Restaurer n'envoie aucune requête de mutation. Abandonner efface le brouillon et réinitialise les contrôles. Guard de sortie et beforeunload avertissent lors d'un départ explicite ; expiration/logout ne sont pas bloqués, même si l'outlet a déjà détruit le composant. Les contrôles sont inertes pendant les mutations.

Organisation : conserver la version d'origine, comparer à la version fraîche chargée du serveur ; un écart bloque l'envoi du brouillon. Le rechargement explicite remplace la saisie et adopte la nouvelle version après vérification de l'ID stable. Chaque PUT conserve `expectedVersion` ; une course gagnée par un autre client reçoit409, conserve le brouillon et n'offre pas de force-save.

## Réseau et stockage dégradés

Avant une mutation, enregistrer le marqueur de résultat incertain. Succès connu : retirer uniquement le brouillon concerné ; rejets400/401/403/404/409 connus sans effet : conserver la saisie. Une perte réseau, une erreur serveur ou une réponse abandonnée ne déclenche aucun retry. Au refresh, un marqueur incertain impose une vérification explicite dans la bibliothèque/classement avant tout nouvel envoi ; le bouton de confirmation n'effectue aucune mutation. Un dossier créé depuis l'éditeur peut lui aussi avoir un résultat incertain.

Quota ou getter/méthode refusé : avertissement mémoire et perte possible au refresh/fermeture, sans promesse de24h. Les limites de sérialisation/nombre de brouillons ne promettent pas une rétention illimitée. Si le marqueur incertain ne peut être écrit, retirer l'ancien snapshot avant envoi ; si même cet effacement est refusé, bloquer la mutation avant HTTP et expliquer comment rétablir le stockage.

Purge : supprimer seulement notre clé ; si remove échoue, tenter un remplacement vide. Si les deux échouent, vider la mémoire concernée, invalider ses handles, ne pas importer l'ancien namespace et retenter l'effacement à un accès ultérieur dans ce processus. Avertissement global : fermer l'onglet et effacer les données du site avant un appareil partagé. L'effacement physique refusé par le navigateur ne peut pas être garanti, notamment après fermeture du processus.

## Qualification et frontières

Les tests de store/auth/formulaires couvrent TTL limite/import/horloge future, objets corrompus et champs inconnus, identité/workspace/recette, suspension/reconnexion, purge refusée et comptes successifs, callbacks anciens, résultat incertain et conflit de version. Les parcours Chromium desktop/mobile utilisent la vraie API/PostgreSQL : refresh, expiration/reconnexion, purge inter-onglets, version serveur modifiée par un second client, getters refusés et QuotaExceededError avec reprise mémoire. Une interception coupe uniquement la réponse d'un POST réellement committé via `route.fetch` ; aucune réponse API inventée ne remplace le serveur.

B4e ajoute logout global réauthentifié, notifications liées à la session et revalidation du document au retour arrière ; voir global-session-revocation.md. La matrice B4f et son état courant se lisent dans ../project/l4-b4f-qualification.md et le handoff. Pas de prétention Safari/iOS réel, TLS/proxy, backup/restore/rollback ou environnement propriétaire. Aucun déploiement, changement d'infrastructure, migration nouvelle/personnelle/production, CONTRACT ou L5.

L'action d'abandon reste disponible sous quota. Si la suppression sélective ne peut être réécrite, tenter de supprimer le namespace entier : les autres brouillons demeurent en mémoire et l'avertissement de perte au refresh reste visible. Un ancien snapshot abandonné ne doit pas être présenté comme supprimé durablement si le navigateur refuse aussi la suppression.

Une révocation volontaire constatée par401 SESSION_REVOKED purge le brouillon de cet appareil ; un appareil dormant/offline attend ce constat, et aucun effacement à distance immédiat n'est promis. Si la ligne de preuve a été supprimée par prune, le serveur ne peut distinguer ce credential inconnu d'une expiration : la rétention locale et la vérification stricte de l'identité restent applicables. Aucun nettoyage automatique n'est ajouté à l'infrastructure.
