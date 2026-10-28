# Déconnexion globale — L4 B4e

Implémentée sur feature/global-session-revocation, intégration/CI autoritaires au [handoff](../project/agent-handoff.md). Pas de déploiement effectué.

## Usage et résultats

« Déconnecter tous les appareils » ouvre un formulaire dans le shell. Annuler ne change ni session ni brouillon. Confirmer avec le mot de passe exprime une intention volontaire : brouillons locaux et des onglets actifs ciblés abandonnés, contenu privé retiré, mot de passe vidé. Le texte prévient avant l'action que cette purge reste appliquée même si la réauthentification est refusée ou la réponse perdue. Une mauvaise réauthentification laisse les sessions serveur actives mais la déconnexion globale non confirmée à l'écran.

Seul204 confirme que toutes les sessions ordonnées avant le verrou global ont été révoquées. Une connexion réellement créée après ce verrou est une nouvelle session légitime. Perte réseau/timeout/5xx n'est jamais un succès ni un motif de replay automatique ; ressaisir explicitement le mot de passe. Si le cookie a déjà été révoqué/expiré, se reconnecter puis relancer cette action. Le mot de passe connu ne rend pas un cookie révoqué autoritaire. Logout simple reste distinct ; aucune réponse ne modifie/efface un nouveau cookie.

## Sécurité et concurrence

Cookie réel, origine exacte, marker, contexte attendu et CSRF serveur ; DTO strict password1..128, rate limit du login. Argon2 hors transaction, puis User→Session sous ReadCommitted : session encore active et du même utilisateur après attente, hash password inchangé, révocation de toutes les lignes en une transaction. Les sessions révoquées ne sont ni renouvelées ni réactivées. Pas de credential dans body/JSON/JS/storage/logs ; aucune nouvelle migration/table/dépendance.

Le navigateur rejette les réponses des anciennes générations. Les notifications portent propriétaire et empreinte SHA256 du CSRF précédent, jamais un secret brut ; elles ne donnent aucun droit et ne doivent pas affecter une nouvelle session du même compte. Canal/WebCrypto indisponibles : le serveur reste autoritaire. SessionResume masque la page avant BFCache puis exige une confirmation serveur à la reprise ; même contexte/CSRF conserve le formulaire. Une réponse ancienne de revalidation ne doit pas expirer B ni interrompre un logout récent.

## Limites annoncées

Un appareil offline/dormant ne peut être effacé physiquement avant de constater la révocation.401 SESSION_REVOKED purge son draft à ce constat ; expiration involontaire garde le draft24h selon ses bornes. Après suppression de la ligne révoquée par prune, cette preuve n'existe plus : le credential inconnu garde la politique de récupération isolée. Stockage complètement refusé : avertissement d'effacement des données du site, aucune promesse impossible.

Une requête métier autorisée avant la révocation peut terminer ensuite : aucune annulation rétroactive de transaction. Le serveur refuse toute nouvelle autorisation et l'UI rejette les réponses antérieures ; un envoi au résultat incertain exige vérification manuelle avant nouvelle saisie. Des connexions concurrentes peuvent remplacer le cookie au niveau du navigateur ; /me, CSRF et contexte attendu refusent les anciennes saisies avant effet métier, sans promettre le contrôle rétroactif de Set-Cookie déjà en vol.

Pas de qualification Safari/iOS réel, TLS/proxy/Secure propriétaire, backup/restauration/rollback ou production. Aucun déploiement, migration personnelle/production, infra, CONTRACT, L5, sélecteur workspace partagé ou nouvelle édition/corbeille. Les preuves réelles et18critères sont dans [B4f](../project/l4-b4f-qualification.md).
