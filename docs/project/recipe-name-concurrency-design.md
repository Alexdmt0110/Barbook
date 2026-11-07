# Noms de recettes — Design Review ciblée, avant évolution structurelle

7 novembre2026. Revue depuis code recette intégré à main18c1ee09, inchangé par livraisonPR49. Aucun schéma/contrat de renommage modifié ici. Données réelles jamais consultées.

## Constats prouvés par lecture et tests existants

- Cocktail unique(workspaceId,slug), pas d'unicité sur name. createCocktailSlug utilise toSlug(NFD, suppression diacritiques0300–036F, trim/lower, caractères nonASCII alphanumériques ->hyphen), avec exception de route new→new-cocktail. Les ligatures ne sont pas une recherche linguistique/fuzzy ; ne pas changer ce comportement implicitement.
- SharedCocktailsController autorise par WorkspaceAccessService.shared : verrou Workspace FOR NO KEY UPDATE avant lookup et toutes écritures catalogue/recette. Deux commandes Bar sont sérialisées, y compris catalogue neuf ; révocation ordonnée par le même verrou. Une transaction contient recette/ingrédients/garnitures/étapes, rollback complet.
- shared-notebook.e2e-spec couvre déjà deux acteurs même intention201/409, slug réservé en corbeille, rollback déclenché en dernière étape et courses révocation. Ne pas réimplémenter ces mécanismes. Compléments utiles : deux noms différents et ingrédient neuf partagé (201/201), normalisation via vraisHTTP, mêmes noms deuxBars distincts.
- Personnel : prélookup + uniquePG, retry interne borné uniquement après rollback sur conflit Ingredient, jamais replay d'une réponse HTTP perdue. Ce retry transactionnel n'est pas une seconde soumission navigateur.
- CocktailContentService.replaceInWorkspace valide que le nom produit un slug non vide, puis écrit name et contentVersion ; ne change pas slug et ne cherche pas de name concurrent. Donc A(slugalpha) et B(slugbeta) peuvent afficher le même nom après renommage : aucune contrainte actuelle ne l'interdit. Il s'agit d'un défaut d'invariant de nom souhaité, pas d'une perte d'intégrité de l'identifiant/URL actuelle. Constat statique, pas une migration exécutée.
- Le formulaire n'interroge pas de disponibilité de nom. Les409Bar sont génériques ; le formulaire/draft restent conservés par les mécanismesL4. L'absence de préflight ne remet pas en cause l'autorité de l'uniquePG à la création.

## Incrément compatible proposé, séparé de PR49

Avant tout changement structurel : compléter les testsPG/HTTP ci-dessus et distinguer les conflits identifiés lors de la création. Prélookup dans workspace autorisé : comparer aussi toSlug(existing.name) au nom demandé. Code additif COCKTAIL_NAME_TAKEN seulement si correspondance réelle ; sinon COCKTAIL_SLUG_RESERVED (ancienneURL ou exceptionnew). Garder conflit générique si P2002 non attribuable avec certitude à la contrainte de slug, ne jamais transformer révocation/accessVersion409 en collision de nom. UI traduit ces codes, garde fallback prudent, aucune saisie/brouillon effacé et aucun replay/nom généré. Pas d'endpoint de renommage ni de règle unique ajoutée.

## Arbitrage structurel requis — aucune implémentation avant réponse

A (recommandée) : clé de nom canonique distincte du slug et contrainteunique(workspaceId,nameKey), sur recettes actives ET en corbeille ; tous chemins création/édition maintiennent cette clé et l'uniquePG arbitre. Nom modifiable, id/workspace/slug immuables, contentVersion conservé/noop inchangé et organizationVersion indépendant. Suppression/restauration continuent d'invalider les intentionsL5. Deux renommages concurrents vers même clé : un succès et un409, aucune modification partielle. Clefcanonique = toSlug(name) sans exception de route new (celle-ci reste uniquement dans créationURL).

B : contrôle applicatif du nom sous verrou workspace, sans nouvelle contrainte. Moins de migration, mais dépend de tous les écrivains respectant le verrou et ne porte pas l'invariant directement dans PostgreSQL. Non recommandé pour une garantie durable.

C : conserver noms affichés doublonnables et n'interdire que slug. Conforme au code actuel, incompatible avec l'invariant demandé ; seulement si propriétaire révisait explicitement ce besoin, aucune adoption implicite.

Conséquences de A à valider :
1. Conservation des réservations de slugs historiques. Exemple Mojito→Menthe : URLmojito reste réservée ; nouvelle recette Mojito peut être refusée même si le nom affiché est libre. Ne pas inventer de suffixe automatique pour contourner l'URL. Préflight devra distinguer nomdéjàpris et adresseréservée.
2. Nomcanonique et slug réservés tant que lignecorbeille existe, y compris après expiration30jours : D5 interdit restauration après délai, n'efface pas physiquement et ne libère pas automatiquement un identifiant. Pas de purge/autolibération.
3. Données préexistantes : diagnostic ciblé collisions parworkspace/clé avant backfill ; si collisions, arrêt et choix explicite du propriétaire. Jamais renommage/suppression automatiques.

## Migration et compatibilité proposées pour étude après accord

Ajout additif de nameKey/indexunique, backfill déterministe avec exactement la normalisation validée, audit des collisions, puis contrainte forte et activation coordonnée des écrivains. Choix technique à qualifier : champ maintenu par l'application avec stratégie de compatibilité des anciennes releases, ou valeur calculée/triggerPG avec preuve de paritéJS/PG sous collations/Unicode et compatibilité Prisma. Pas d'extension unaccent ni d'infrastructure ajoutée présumée. Ne pas présenter deux implémentations différentes de normalisation comme équivalentes sans tests.

Le rollback applicatif doit continuer à remplir/faire calculer la clé ; une release ancienne qui ignore le champ ne doit ni contourner l'unique ni casser silencieusement les créations. Migrations uniquement tests jetables, pas de down/CONTRACT ni d'opération personnelle. Aucun backfill livré à ce stade.

## Préflight formulaire — après choix du contrat canonique

Endpoint lecture seule, SessionGuard, contexte/workspace autorisé et versiond'accès, validation serveur longueur/clé ; pas de lookup global ni fuite workspaceétranger. Réponse disponible/nompris/adresseréservée, inclut assez de contexte pour rejet des réponses obsolètes sans exposer les recettes privées. CôtéAngular : debounce~400ms oublur, distinctUntilChanged/switchMap, annulation lors de destruction/contexte/identité ; epoch et nom de requête vérifiés avant application. Message souschamp aria-describedby/aria-live, aria-invalid pour collision connue, texte/icône en plus couleur. Réseauindisponible = état inconnu informatif nonbloquant ; autoritéfinale API+PG, pas de récupération de version pour forcer ni resoumission automatique.

Tests requis : fenêtre préflight→créationparautreacteur→409précis, changementdecompte/espace et réponses tardives, storage/refus/expiration/brouillon conservé, disponibilitéinconnue permet soumission explicite, normalisation et nomrenommé/corbeille/anciennesURL, concurrence new/edit/restore, rollback vraiPG et compteétranger. Chromiumdeuxcomptes/mobile/clavier/messageaccessible, captures réelles si UI modifiée. Gate complet et sept contrôles actuels avant tout mergeD8.
