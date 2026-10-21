# L4 B4e — Design Review préventive

21 octobre 2026. Base main de86dd0, #29 réellement mergée et six contrôles post-merge success. Développement B4e/B4f autorisé, tout nouveau merge attend Alex. D1/D2 et ADR0005 inchangés. Aucun schéma/migration nouveau, infra, déploiement, CONTRACT ou L5.

## Contrat et architecture avant code

POST /auth/logout-all,204 seulement après mot de passe courant vérifié, cookie réel, origine/marker/CSRF et utilisateur/workspace attendu. DTO strict password string1..128 ; throttling identique au login, sans affaiblir les quotas. Aucun email/userId fourni dans le body ne détermine la cible. Préflight HTTP sans renouvellement ; réponse no-store et jamais Set-Cookie. Une mauvaise réauthentification ne révoque aucune session. Les erreurs distinguent REAUTHENTICATION_FAILED et SESSION_REVOKED sans exposer de credential.

Vérifier Argon2 hors transaction ; transaction ReadCommitted : verrou User commun avec login/création, puis verrou de la session présentée, puis validation de son propriétaire/révocation/échéances après attente, comparaison du hash du mot de passe encore courant et révocation atomique de toutes les sessions utilisateur. Si le credential a été révoqué pendant Argon2/attente, refuser et rollback. Les deux ordres de login/logout-all sont définis par le verrou User : une connexion créée avant est révoquée ; une connexion réellement créée après reste une nouvelle session légitime. Aucune ligne révoquée ne peut être renouvelée. Pas de renouvellement de session par la réauthentification elle-même.

Le store ajoute une primitive de validation verrouillée, réutilisant l'ordre User→Session, sans framework général. AuthService orchestre le mot de passe/transaction ; WebSessionService garde les règles HTTP. Un credential révoqué encore présent en DB reçoit401 SESSION_REVOKED sur les accès privés, pour distinguer la purge volontaire d'une expiration involontaire. Un credential inconnu/expiré conserve la politique de récupération B4d. Le nettoyage physique borné peut supprimer la preuve de révocation : aucune promesse de purge distante immédiate ou après disparition de cette preuve.

## Interface et brouillons

Commande distincte « Déconnecter tous les appareils », formulaire de confirmation avec mot de passe éphémère, texte explicite avant soumission : les brouillons locaux sont abandonnés dès la confirmation volontaire, même si le mot de passe ou le réseau empêchent la confirmation serveur. Annuler avant soumission conserve la saisie. Après confirmation, purge/invalidation locales et BroadcastChannel owner seulement, contenu privé masqué et génération changée avant HTTP. Aucune conservation du mot de passe pour retry ; réessai global uniquement par nouvelle saisie explicite, jamais remplacement silencieux par logout simple.204 confirme le global ; réseau/5xx/401 ne permettent pas de l'affirmer. Reconnexion puis nouvelle action si la session n'a plus autorité.

Capturer génération/contexte et rejeter les retours tardifs ; aucune réponse ne purge le nouveau compte B ou ne vide son cookie. Notification de même origine aide les onglets actifs ; la révocation serveur protège tous les appareils, indépendamment des notifications. Un401 SESSION_REVOKED purge le brouillon du contexte courant ; expiration involontaire le suspend seulement. Aucun secret dans storage/BroadcastChannel. Si BroadcastChannel construction/post échoue, repli sans crash ; aucune promesse de notification livrée.

Limite explicite : une requête autorisée avant la révocation peut déjà être en cours et terminer ; aucune annulation rétroactive de transaction métier. Tester ce cas réellement, refuser toute nouvelle autorisation après révocation et ignorer l'ancienne réponse dans l'UI. Un appareil hors ligne/dormant ne peut effacer son sessionStorage à distance avant de constater la révocation ; stockage refusé garde les avertissements B4d. Pas de resoumission automatique.

## Plan de preuves et revue

Unitaires : mot de passe faux/vrai/changé, rollback, contexte capturé, retries explicites, réponse perdue, réponse tardive après A→B, purge volontaire contre expiration, panne BroadcastChannel. PostgreSQL/HTTP réels : plusieurs credentials et seconde instance Nest, isolement autre utilisateur, hostilesCSRF/contexte/body/Bearer, rejeu, expiration, révocation pendant réauthentification, ordres User login/global, attente Session et activité ; requête métier autorisée avant mais bloquée à la DB. Synchroniser les courses par verrous PostgreSQL observés, pas par sleeps déterminant l'ordre.

Chromium desktop/mobile : formulaire clavier, mauvaise réauthentification sans révocation serveur, vrais appareils isolés, purge/401 sur l'ancien appareil, réponse204 perdue sans faux succès ni replay, nouvelle identité protégée. Étendre les parcours existants sans nouvelles inscriptions ni relaxation des quotas/assertions/timeouts/retries.

Chaque bloc cohérent : vérifications locales adaptées, commit atomique immédiatement publié, contrôle parent/arbre/message/fichiers/blobs et six checks. B4f : matrice des18critères L4 avec preuves et limites, relecture de toute la branche contre main sur tous axes du prompt maître ; corriger BLOCKER/P1 puis refaire toute la revue. Vraie PR seulement ensuite ; pas de merge sans autorisation distincte.
