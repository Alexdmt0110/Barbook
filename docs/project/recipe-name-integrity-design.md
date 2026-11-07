# Unicité des noms et vérification préalable — Design Review

## Mandat et base vérifiés

7 novembre 2026. Option A et réservation après expiration de la corbeille explicitement validées par Alex. Base réelle `8bfaef93645d13214ba4f9324900835d9d5864c0`, sept contrôles post-merge réussis, aucune PR ouverte. Nouvelle branche publiée avant code. Cette tranche inclut créations, renommages et contrôle préalable en création/édition ; BB2b et copie restent reportés. Aucun accès aux machines ou bases réelles.

## Persistance et rollback applicatif

Ajouter `Cocktail.nameKey`, distinct de `slug`, et l'index unique `(workspaceId,nameKey)` sur toutes les lignes, actives ou en corbeille. Normalisation inchangée : `toSlug(name)` sans l'exception de route `new` ; aucun fuzzy matching, translittération ou changement de casse métier implicite.

Choix technique : champ ordinaire avec défaut vide pour compatibilité Prisma, trigger PostgreSQL BEFORE INSERT/UPDATE recalculant systématiquement la clé depuis le nom, CHECK de cohérence/non-vide et index unique. Le client ne décide jamais de la clé. Une ancienne version ignore le champ mais le trigger maintient la valeur et la contrainte reste applicable ; un ancien écrivain ne peut fournir une fausse clé pour contourner l'index. Tester également les écritures sans champ et la falsification explicite. Les slugs, identifiants, références, dates et versions ne sont pas changés par le backfill.

Alternatives examinées : champ maintenu seulement par l'application (ancienne release contourne l'invariant ou échoue sur champ requis), index d'expression seul (moins bien représenté par Prisma et lectures moins simples), colonne générée (prise en charge des migrations/introspection Prisma à qualifier). Trigger + CHECK conserve un schéma Prisma ordinaire, avec SQL explicite testé par `migrate deploy` et `migrate diff`, sans nouvelle dépendance ni extension.

La fonction SQL immuable emploie NFD, suppression exacte U+0300–U+036F, abaissement ASCII par translate et regex sous collation C, puis retrait des tirets périphériques. Cela évite les variations de lower/regex liées aux locales Windows/Linux. Prouver la parité avec le normaliseur JavaScript inchangé : cas linguistiques, combinaisons et parcours de tous les scalaires Unicode représentables dans PostgreSQL. UTF8 nécessaire. Arrêt si la parité n'est pas démontrée ; ne pas changer l'équivalence métier pour adapter la DB.

Migration transactionnelle : verrou exclusif Cocktail, contrôle des clés vides et collisions avant index, ajout/backfill/trigger/CHECK/index, commit. Toute collision ou erreur tardive doit annuler l'ensemble ; pas de renommage, fusion ni suppression automatique. Seules les bases jetables autorisées exécutent ces tests. Sur une future base réelle, toute migration reste soumise à autorisation OPS. Après collision, diagnostiquer et soumettre le traitement des données ; jamais forcer la migration. Le rollback normal conserve la migration additive et revient au binaire précédent ; aucun down destructif.

## Services et transactions

Règle de nom centralisée dans une petite politique partagée : lookup de clé unique, exclusion de la recette courante, puis réservation du slug uniquement en création. En édition, l'URL est conservée et son recalcul ne doit pas créer un faux conflit. Vérifier l'autorisation avant les lookups et contentVersion avant de révéler un conflit de nom en écriture. Préconditions, no-op et isolation inchangés ; conserver tout remplacement de contenu dans une transaction.

Reprendre le même ordre de verrou workspace en création personnelle et édition pour éviter les cycles entre catalogue et index de nom. Le Bar conserve son verrou existant d'autorisation/révocation. L'index reste l'autorité contre les anciens écrivains et clients directs. Mapper uniquement les contraintes identifiées en409NAME_TAKEN ou SLUG_RESERVED ; ne pas appeler une transaction PostgreSQL déjà annulée. Les conflits de version/droits/catalogue gardent leur sens. Pas de forçage, replay HTTP ou adoption automatique d'une version fraîche.

Restauration : le nom et le slug ne sont jamais libérés par la corbeille ; même après30jours, la ligne continue de réserver. La restauration ne peut donc réactiver une intention ou voler un nom réattribué. Garder les règles D5 et les incréments de versions existants. Expiration de récupération ne prouve jamais un effacement physique.

## Contrat de vérification préalable

GET `/api/cocktail-name-availability?name=...&cocktailId=...` et GET `/api/workspaces/:workspaceId/cocktail-name-availability?...`. Routes distinctes du détail `cocktails/:slug` pour préserver tous les slugs historiques. Session obligatoire, workspace personnel dérivé du compte ou Bar autorisé côté serveur. Le cocktailId facultatif active le mode édition et doit appartenir au workspace et être actif ; sinon404 sans fuite. DTO longueur/types/UUID et validation de la clé. Aucun nom ou identifiant d'une autre recette retourné.

Réponse `{ canonicalName, status }`, status AVAILABLE / NAME_TAKEN / SLUG_RESERVED. Nom canonique contrôlé dans les deux modes, slug proposé uniquement en création. Lecture informative : aucun verrou/réservation de nom durable, aucun engagement sur la création suivante, aucune écriture. Réseau indisponible côté client = UNKNOWN distinct ; garder la soumission explicite possible. Le serveur et PostgreSQL arbitrent toujours l'enregistrement final.

## Interface

Un composant partagé sous le champ Nom pour création/édition, un service HTTP de lecture et aucun deuxième moteur de brouillons. Contrôle à400ms, annulation immédiate d'une requête précédente lors d'une nouvelle saisie. Annuler au changement de contexte/recette/destruction ; vérifier également le nom, le contexte et le lease d'identité avant d'afficher une réponse. UNKNOWN informatif et non bloquant, texte et icône/aria-live/aria-describedby/aria-invalid sans dépendre seulement de la couleur. Le contrôle préalable reste informatif, sans soumission automatique ni renommage.

En cas de409 identifié au nom, conserver saisie/brouillon et montrer le message précis ; permettre une correction explicite du nom sans traiter ce conflit comme une adoption de contentVersion. Les409 de version continuent d'imposer la résolution existante. Les réponses tardives et pertes HTTP conservent toutes les protections L4. Expliquer que la corbeille réserve encore le nom après expiration des30jours.

## Matrice de qualification

- Migration peuplée sans collision : toutes les données historiques identiques, seule clé ajoutée ; relance deploy et diff sans dérive.
- Collisions préexistantes normalisées, y compris corbeille expirée : interruption complète, aucun changement ; même nom dans deux workspaces autorisé ; erreur tardive et rollback DDL.
- DB hostile/ancienne version : clé omise ou falsifiée, création/renommage concurrents, autorité de l'index, stabilité des URLs/versions/références.
- Parité SQL/JS : accents, casse, espaces, ponctuation, NFD, Unicode complet UTF8 et contextes combinés, indépendance de locale.
- HTTP/PostgreSQL deux comptes : création/création, création/renommage, renommage/renommage, restauration/corbeille, absence d'effets partiels, versions obsolètes, workspace étranger, révocation.
- Préflight : droits, soi-même, autre recette, URL réservée, nom réservé après30jours, absence d'écriture et préflight disponible puis409 final.
- Angular : annulation, réponses tardives/identité/espace, indisponibilité non bloquante, conflit exact, saisie/draft conservés et versions non contournées.
- Chromium : deux comptes réels et édition, réponses de lecture perdues, conflit après contrôle, clavier/mobile et captures clair/sombre réellement inspectées.
- Sept contrôles obligatoires au dernierHEAD : backend/frontend, PostgreSQL/HTTP, Chromium, Windows Delivery et audits backend/frontend. Review Gate complet puis mergecommit D8 et sept post-main ; branches conservées.

Git : commits atomiques et push immédiat. VM : aucun déploiement. SQL : migration développée et testée uniquement en environnements jetables. Infra : aucun changement. Retour ensuite au diagnostic Windows et aux étapes d'installation existantes ; aucune autre feature métier.


## Checkpoint d'implémentation avant qualification finale

Backend publié8caac079 :305unités passent,322PostgreSQL/HTTP passent (27suites), migrate deploy répété/status et migrate diff sans différence. Migration pleine, collisions actives/corbeille expirée, rollback DDL tardif, parité de tous scalaires UTF8 et contextes combinés, courses HTTP et ancien client Prisma généré depuis le schéma exact8bfaef93 vérifiés sur CI jetable. Ancien schéma reconstruit avec SHA256545a7abd53644ead24a6f0a6993aeb32f216ad1a66fb47892b47b861cc02bea0 avant génération. Fixture enrichie ensuite avec dossiers, tags, lignes, garnitures, étapes et image pour comparaison de toutes les colonnes historiques ; PostgreSQL02a46493 réussi également.

Composant commun creation/edit publié7caef633, parcours Chromium renforcés02a46493, lecture informative bornée5secondes c877762c :302frontend locaux réussis. Aucune modification d'un timeout/retry/seuil existant. Vérification à400ms annulable, réponse de contrôle plus ancienne ignorée après un409 définitif, resets silencieux du formulaire pris en compte. La vérification ne change jamais la validité Angular ni ne soumet une commande. Le nom du champ et sa description sont associés séparément pour ne pas confondre le libellé accessible et le message.

Qualification du dernierHEAD, captures réelles, revue de branche/PR et post-main encore à terminer ; ne pas anticiper la livraison de cette tranche. Le journal et le corps de la PR suivante consigneront les résultats effectifs. Branche ajoutée aux seuls déclenchements push existants des trois workflows pour exercer les sept contrôles avant PR ; aucun job, assertion ou audit affaibli. Retour à Windows ensuite, pas de BB2b/copie.


## Revue finale — précisions sur les erreurs et réponses tardives

Les adaptateurs PostgreSQL Prisma7 exposent la contrainte réelle dans `meta.driverAdapterError.cause.constraint.index`. Le mapper reconnaît seulement les deux noms d'index Cocktails attendus et la forme historique qualifiée par modèle ; une collision Ingredient, une origine ambiguë ou une autre contrainte restent génériques. Le test réel conserve son assertion COCKTAIL_NAME_TAKEN avec le client courant et le refus P2002/rollback avec le client historique. Aucune assertion de sécurité ni limite de tests n'est diminuée pour corriger cette différence de métadonnées.

La création capture un lease d'identité pour ses callbacks ; un succès/conflit tardif d'un autre compte ne navigue pas et ne touche pas son brouillon. Le retour de conflit sous le Nom vérifie aussi la valeur réellement soumise. Contrôle préalable et post-enregistrement ne se réattribuent jamais une réponse obsolète. Vérifications locales finales311backend/306frontend, compatibilité15/7. CI complète et captures du dernierHEAD restent obligatoires avant le Gate ; les résultats réels seront consignés dans la PR de cette branche. Ce document n'autorise aucune opération sur une base réelle.
