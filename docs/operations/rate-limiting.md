# Rate limiting

## Objectif

Le rate limiting protège l'API contre les abus répétés,
notamment les tentatives de brute force et les appels
coûteux aux endpoints d'authentification.

## Politique actuelle

Les limites sont appliquées par adresse IP.

Ces limites portent sur le nombre de requêtes reçues.
Elles ne correspondent pas à un compteur de mots de
passe incorrects propre à un compte utilisateur.

### API générale

- 120 requêtes par minute.

### Connexion

- 10 requêtes par minute ;
- dépassement : blocage pendant 5 minutes.

Le frontend traduit une réponse HTTP `429` en un message
indiquant à l'utilisateur qu'il doit attendre avant de
réessayer.

### Inscription

- 5 requêtes par heure ;
- dépassement : blocage pendant 1 heure.

Le frontend traduit également une réponse HTTP `429`
sur l'inscription en un message utilisateur explicite.

## Reverse proxy

La production cible utilise un seul reverse proxy
Nginx devant l'API.

Nest/Express est configuré avec :

```text
trust proxy = 1
```

Cette configuration suppose que l'API n'est pas
accessible directement depuis Internet.

Nginx doit transmettre correctement les informations
d'adresse cliente, notamment X-Forwarded-For.

Si la topologie réseau change, cette configuration
doit être revue avant déploiement.

## Stockage

Le stockage fourni par @nestjs/throttler est
actuellement conservé en mémoire dans le processus
de l'API.

Cette solution convient à la V1 tant qu'une seule
instance de l'API est exécutée.

Avant tout déploiement multi-instance, le stockage
du rate limiting devra être partagé entre les
instances, par exemple via Redis.

## Vérification

Les tests backend vérifient que les endpoints de
connexion et d'inscription renvoient HTTP 429 après
dépassement de leurs limites.

Les vérifications frontend doivent également confirmer
que ce statut est présenté à l'utilisateur comme un
blocage temporaire et non comme une erreur serveur
générique.
