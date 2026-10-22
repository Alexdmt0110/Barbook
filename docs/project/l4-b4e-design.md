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


## Complément préventif — notifications retardées

La notification doit cibler la session précédente, pas seulement user/workspace : sinon un logoutA retardé pourrait purger une nouvelle sessionA. Empreinte SHA256 du CSRF en mémoire (ni credential ni CSRF brut diffusé), vérification de génération après digest asynchrone, puis comparaison de l'empreinte et du propriétaire. Identity annonce le propriétaire suivant seulement avec l'empreinte de la session précédente connue. Une nouvelle session déjà confirmée ignore la notification ancienne, même du même utilisateur. Si aucune session précédente n'est connue ou WebCrypto/BroadcastChannel indisponible, les contrôles serveur garantissent le refus, sans promettre une notification immédiate. Bloquer aussi le bootstrap implicite pendant une déconnexion non confirmée ; seule une reconnexion explicite rétablit le contexte.

Checkpoint backend7a10fb4 publié et parent/arbre/fichiers/blobs vérifiés. Les collections GitHub check-runs et actions/runs sont toujours vides pour1667810 puis7a10fb4 ; six contrôles B4e NON qualifiés. Ce complément utilise l'API Contents pour publier un vrai checkpoint documentaire et vérifier si l'événement est traité ; aucune configuration d'infrastructure ou protection n'est modifiée. Aucune PR ne sera ouverte sans preuves natives/browser et Review Gate.


## Complément préventif B4f — L4-16 / restauration de document

La revue statique globale identifie un P1 de qualification : le guard SPA seul ne revalide pas un document restauré par BFCache. Avant correction : service navigateur étroit SessionResume, instancié par le shell, écoute pagehide/pageshow et retour visible (aucun heartbeat). pagehide masque synchroniquement le wrapper privé par attribut sur html, avant snapshot ; pageshow/retour visible déclenche /me frais, generation changée pour ignorer les anciennes réponses. Le même contexte/CSRF confirmé conserve le formulaire et son lease ; contexte/CSRF différent,401 ou réseau non vérifiable verrouille et redirige login. Révocation purgera ; expiry/réseau conservera le draft. Pas de POST automatique, pas d'expiration locale inventée ni extension absolue. Timeout15s garde une erreur honnête. Supprimer écouteurs/abonnement à destruction ; empêcher un ancien /me de lever le masque après pagehide.

État de chargement accessible hors wrapper privé, uniquement celui-ci masqué. Tests unitaires avec événements de cycle de document ; vrai Chromium indépendant avec BFCache activé (Playwright le désactive par défaut) dans le parcours existant : une seule connexion supplémentaire/appareil déjà prévue, pas de nouvelle inscription/quota/projet/retry/timeout. Navigation vers page publique, révocation globale sur l'autre appareil, retour arrière ; prouver pageshow.persisted,401 et purge avant contenu privé utilisable. Aucune prétention Safari/iOS/BFCache propriétaire sans test. Après correctif, reprendre toute la revue contre main.


## Correction de la méthode de preuve BFCache — 22octobre

CI66715a9 :238backend/191frontend/141PG-HTTP passés,2parcours expirations passés ; les deux parcours globaux atteignent401/purge puis échouent sur preuve BFCache absente. Aucun succès BFCache revendiqué. La documentation officielle Playwright (navigations et Page.goBack, consultée22octobre) précise que les restaurations BFCache ne sont pas supportées par son suivi Page.

Avant correction du fixture : Chromium complet via channel chromium (nouveau headless), seul --disable-back-forward-cache retiré ; après préparation UI réelle, retour d'historique et observation via CDP natif Page/Network/Runtime, sans demander à Page.goBack de suivre la restauration. Conserver les assertions pageshow.persisted, masque synchrone,401 réel/code/purge et absence de contenu privé, avec raisons natives backForwardCacheNotUsed dans l'erreur si échec. Pas de faux événement, réponse fabriquée, suppression d'assertion, nouvelle inscription, nouveau projet ni augmentation de timeout/retry. Aucun changement applicatif/infra.


## Design préventif — audit Vitest révélé le22octobre

Audit frontend du checkpoint0ab0795 signale deux modérées GHSA-qxg6-89mg-rqv8 / GHSA-xp26-3454-mjgp sur Vitest/@vitest/mocker<=4.1.11. Correction nécessaire au gate L4, pas une relaxation de seuil : mise à jour ciblée Vitest4.1.12 dans la majeure4 déjà autorisée, avec minimum ^4.1.12 déclaré pour éviter de résoudre de nouveau une version vulnérable, sans ajout de dépendance ni modification applicative. Vérifier version corrigée/peer Angular, diff du lock borné, install reproductible, audit complet/runtime, lint/build/191tests et compatCLI ; reprendre revue entière. Aucun npm audit fix large, override qui masquerait le problème, ou changement de CI/infra.
