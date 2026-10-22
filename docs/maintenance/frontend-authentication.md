# Authentification Angular — B4b

AuthService garde user/workspace/CSRF uniquement en mémoire. Le credential HttpOnly n'est jamais lu par JavaScript. L'ancienne clé barbook.accessToken est supprimée avec gestion du stockage refusé ; aucune lecture ni nouvelle écriture de JWT. Voir le [contrat serveur](authentication.md).

Le guard restaure la session par GET /api/auth/me, avec bootstrap partagé. Login/register vérifient /me avant d'accepter le cookie. Si l'inscription a réussi mais la confirmation échoue, le message précise que le compte existe et propose la connexion, sans rejouer le POST. Rester connecté est facultatif, jamais coché par défaut et déconseillé sur appareil partagé.

L'interceptor se limite aux URLs relatives /api/. Il ajoute credentials, marker, contexte user/workspace et CSRF sur mutations privées. Rien n'est ajouté aux URLs externes. Aucun Authorization Bearer. Chaque requête capture la génération d'authentification ; une réponse tardive d'une autre génération est rejetée. Plusieurs401 concurrents déclenchent une seule invalidation utile. Un conflit métier409 ne ferme pas la session ; AUTH_CONTEXT_CHANGED la ferme.

L'expiration involontaire efface l'identité mémoire et redirige sans appeler logout ni purger sessionStorage. B4d conserve les champs des formulaires de création et d’organisation avec restauration explicite après confirmation du compte/workspace ; voir temporary-drafts.md. La déconnexion volontaire masque immédiatement le contenu privé ; elle n'est confirmée qu'après réponse serveur. Une panne conserve seulement en mémoire les preuves nécessaires au retry explicite et affiche l'incertitude. Aucun retry automatique.

BroadcastChannel cible la session précédente connue par propriétaire et empreinte SHA256 du CSRF ; une notification retardée ne purge pas une nouvelle session du même compte. Ni credential ni CSRF brut ne sont diffusés, aucune identité n'est installée par le message. Le refus serveur des contextes périmés reste obligatoire même sans canal disponible ou notification reçue. Une connexion concurrente peut remplacer le cookie ; /me et les préconditions des requêtes privées détectent les différences.

Les routes privées sont sous AppShell avec authGuard ; AppShell ne rend son outlet que pour une identité confirmée. La navigation conserve un returnUrl interne. Le proxy de développement et le futur reverse proxy utilisent /api, sans URL de backend dans l'application.

Vérification : npm --prefix frontend run verify ; tests réels desktop/mobile selon [integration-tests.md](integration-tests.md). Les limites B4c–B4e et les résultats exacts figurent dans le [handoff](../project/agent-handoff.md).

B4c remplace l’accès direct à l’ancienne clé JWT par BrowserStorageService.remove(session,…), qui protège le getter de stockage autant que la méthode. Le thème conserve son signal mémoire en cas de stockage refusé. Le parcours Chromium bloque les deux getters avant reconnexion/rechargement ; les résultats réellement observés restent au handoff. Aucun vrai brouillon24h livré par cette seule tolérance.


## Brouillons L4 B4d

Voir le [contrat des brouillons temporaires](temporary-drafts.md) : mémoire/sessionStorage24h, identité confirmée, restauration et abandon explicites, versions et résultats incertains, stockage refusé et purge volontaire. Aucun envoi automatique ni clôture de L4 global.

## B4e — déconnexion globale et reprise de document

Commande distincte dans le shell : mot de passe requis à chaque tentative, confirmation prévient que l'intention volontaire abandonne les brouillons locaux même si mot de passe/réseau refusent ensuite la révocation. Annuler avant confirmation conserve la saisie. Contenu privé retiré et génération changée avant HTTP ; password vidé immédiatement. Aucune rétrogradation implicite vers logout simple, aucun retry automatique. Timeout15s ou erreur laisse une déconnexion non confirmée ; lien de reconnexion puis nouvelle action explicite. Le bootstrap implicite est bloqué pendant cet état.

SessionResume masque synchroniquement le wrapper privé au pagehide, avant snapshot BFCache. pageshow/retour visible exige un /me frais ; aucune minuterie/heartbeat. Même user/workspace/CSRF conserve le formulaire et son lease ; une identité différente purge puis exige reconnexion, un cookie remplacé du même compte conserve le brouillon mais exige confirmation explicite. SESSION_REVOKED purge ; expiration ou réseau non confirmé conserve et suspend. Les anciennes réponses ne peuvent déconnecter une nouvelle identité ou remplacer une intention de logout plus récente. Une reprise pendant mutation peut rendre son résultat inconnu : appliquer la vérification explicite B4d, jamais rejouer automatiquement.

[Politique et limites](global-session-revocation.md), [qualification18critères](../project/l4-b4f-qualification.md).
