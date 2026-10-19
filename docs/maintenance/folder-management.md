# Classement et dossiers — contrats L3

État de livraison : suivre le [handoff](../project/agent-handoff.md) et la CI de la branche ; les blocs suivants ne sont pas tous livrés au même commit. Le [design](../project/l3-design.md) précise le périmètre B3a–B3c. CONTRACT et toute base propriétaire/production restent exclus.

## Classement d'une fiche

Les lectures `/api/cocktails` et `/api/cocktails/:slug` exposent `folders: [{id,name}]`, ordonnés par id. Le détail porte `organizationVersion`. `folder` reste une projection nullable pour la transition, conservée tant que son id fait partie de l'ensemble, sinon remplacée par le premier id ou null. Le nouveau frontend doit utiliser `folders`.

`PUT /api/cocktails/:slug/organization` :

```json
{"folderIds":[],"tagNames":[],"expectedVersion":0}
```

Remplacement atomique de tous les liens et tags, IDs dédupliqués/canonicalisés en minuscules. Au plus1000 IDs UUID et20 tags trim1–40. Tableau vide valide ; null, mélange folderId/folderIds, version absente/nulle/non entière/négative ou champ inconnu refusés400. Un dossier indisponible dans l'espace personnel renvoie400 ; cocktail absent/étranger404 identique. Workspace déduit de la session, jamais du corps.

Une sauvegarde complète réussie incrémente `organizationVersion` et renvoie `{folders,folder,tags,organizationVersion}`. Une version périmée donne409 avant toute création de tag ou modification des liens ; recharger explicitement avant de réessayer, conserver le brouillon UI. Les mutations de classement prennent d'abord un verrou transactionnel de workspace ; aucun mécanisme côté navigateur ne remplace ce contrôle serveur.

Ancien corps `{folderId:null|UUID,tagNames:[]}` : accepté pour zéro/un lien seulement. Avec plusieurs liens,409 sans mutation afin d'éviter une perte silencieuse. S'il fournit expectedVersion, elle est contrôlée. Ceci protège les anciens clients utilisant le **nouveau serveur**, pas un ancien serveur ; les anciens écrivains incompatibles devront être retirés lors d'une future bascule autorisée.

Le filtre `GET /api/cocktails?folderId=UUID` traverse les appartenances, se combine avec les filtres existants, ne duplique pas les recettes et reste limité au workspace.

## Qualification

`folder-organization.e2e-spec.ts` utilise le vrai pipeline HTTP et PostgreSQL : zéro/un/multi, versions, déduplication/UUID en majuscules, filtres, protections legacy, ensemble étranger sans écriture, contrats invalides et deux sauvegardes simultanées (une200/une409 et aucun tag orphelin). Les tests de rollback existants restent actifs. Les nouvelles migrations et leurs précautions sont décrites dans [integration-tests.md](integration-tests.md).
