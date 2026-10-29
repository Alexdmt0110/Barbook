# BB2a — Design Review préventive : plans de batch autonomes

29 octobre2026. Périmètre : premier incrément utilisable de BB2 (F036–F037), après carnet partagé et inventaire manuel. Base réellement vérifiée : main66d4bb3f9e2be8883cb570a4e9d58c53ff2291e5, merge47 qualifié par six contrôles/journaux273/282/292/38 ; deux parents et arbre identique au HEAD0cf73f0 contrôlés. Références : catalogue audit/03-Vision-et-catalogue.md, beta-bar-plan.md, D1/D2/D3/D4/D8 et BB-INVENTAIRE-01. Aucune nouvelle décision métier structurante identifiée pour ce minimum. Ce document n'annonce aucune implémentation ni disponibilité.

## Résultat et limites

Un OWNER ou MEMBER d'un Bar confirmé choisit une recette autorisée et sa version de contenu, distingue explicitement chaque ingrédient inclus dans la base de ceux ajoutés au service, puis calcule et conserve un plan nommé. Cible en portions ou en volume de base, jamais un « volume final » implicitement dilué. Le plan est partagé uniquement dans son Bar et peut être révisé avec préconditions. Le carnet personnel reste privé ; pas de copie implicite ni de calcul depuis une recette étrangère.

BB2a livre un plan et ses quantités, pas une déclaration de fabrication. Le minimum F038 fera l'objet d'un incrément BB2b séparé après revue de ses commandes : action volontaire de déclaration du réalisé, auteur/date/quantité explicites et reçu idempotent, historique conservant la version du plan utilisée. Ne pas afficher un bouton « produit » inopérant dans BB2a, ni présenter BB2 complet sans BB2b qualifié. Les deux incréments restent dans le mandat approuvé et ne nécessitent pas de validation de routine supplémentaire.

Aucune dépendance StockProduct/StockMovement et aucun débit automatique, même futur lors d'une déclaration. Aucun achat, prévision d'inventaire, dilution inférée, date limite de consommation, garantie sanitaire, étiquette réglementaire ou conservation inventée. Liste de tâches avancée, impression/PDF, photos et esthétique secondaires reportés.

## Calcul précis et affichage honnête

Les quantités sources sont des décimaux à trois chiffres, pas des nombres binaires réarrondis. Préférer un calcul rationnel exact (entiers BigInt, fraction réduite, bornes explicites) : la cible volume divisée par une dose peut être périodique, donc un Decimal à précision finie ne justifie pas le mot « exact ». Sérialiser numérateur/dénominateur en chaînes ; ne jamais sérialiser BigInt directement en JSON. Afficher une fraction ou un signe d'approximation pour les décimales tronquées.

Mode portions : facteur positif explicite, jusqu'à10000 portions et trois décimales. Chaque ligne numérique est multipliée indépendamment, ML/G/PIECE/DROP/etc. conservés selon l'énumération existante ; aucune masse additionnée à un volume, aucune conversion qualitative. TOP_UP reste « compléter au service » ; quantité absente reste inconnue, jamais0.

Mode volume : cible positive jusqu'à1000000mL, trois décimales. La base doit inclure au moins une ligne ; toutes ses lignes doivent être ML avec quantité connue strictement positive. Refuser le volume exact si une ligne incluse est TOP_UP, G, qualitative ou inconnue, et expliquer laquelle : ne pas l'ignorer. Les ingrédients exclus restent au service ; leurs quantités calculées sont fondées sur le nombre de portions complètes. Les garnitures restent des lignes séparées au service, jamais ajoutées au volume de base.

Exemple obligatoire : inclus45+15mL, service30mL ; cible1000mL → facteur50/3 ; base750+250mL ;16 portions complètes de60mL,40mL restants ;480mL de service pour ces16 portions, hors base. Une cible sous une portion reste un plan valide avec0 portion complète et un reste expliqué.

Arrondi explicite : choix « sans arrondi » ou pas mesurable renseigné par l'utilisateur pour chaque unité quantitative concernée ; pas universel imposé au G/PIECE/DROP. Conserver valeur rationnelle, quantité arrondie, écart signé et ratio final. Arrondir au plus proche, égalité vers le haut pour les valeurs positives ; afficher cette règle avant confirmation. Pas d'ajustement caché de la dernière ligne pour faire retomber le total. Ne pas qualifier d'exact le volume obtenu après arrondi. Le calcul revient toujours aux quantités du snapshot, jamais aux valeurs déjà arrondies ; retour à1 restitue les quantités originales. Un arrondi produisant0 pour une ligne positive doit être visible et empêcher une validation trompeuse tant que le pas n'est pas revu.

ABV et autres métadonnées ne sont pas recalculés en inventant une dilution. Le snapshot conserve les sémantiques existantes INHERIT/OVERRIDE/UNKNOWN,0explicite, spécifications/ordre/garnitures/étapes et référence source. Aucun appel ne modifie la recette ou son catalogue.

## Autorité, snapshot et modèle minimal proposé

Réutiliser WorkspaceAccess.shared : droit actif et accessVersion sous verrou Workspace FOR NO KEY UPDATE, puis recette/plan dans un ordre documenté. Toutes les routes partagées sont scoped workspace. Aucun rôle, couleur ou identifiant fourni par le client n'accorde un accès. Retrait/réadmission invalide l'ancienne intention via accessVersion ; pas d'autorité issue d'un reçu historique.

BatchPlan : id/workspaceId immuables, nom, creatorId, sourceCocktailId/sourceContentVersion, snapshot canonique JSON versionné, paramètres de calcul JSON versionnés, planVersion entière bornée, createdAt/updatedAt timestamptz. FK workspace/recette composite de même scope ; auteur RESTRICT et aucune suppression physique. Réutiliser la garde de capacité des versions. Aucun changement de schéma recette ou inventaire, aucun CONTRACT.

Snapshot composé côté serveur à partir de la recette réellement autorisée et de expectedContentVersion : ne pas accepter de snapshot/calcul client comme vérité. Relecture sous les verrous de l'édition assure version et contenu cohérents. Une modification ultérieure de recette ne change jamais silencieusement le plan conservé ; l'interface affiche sa version source et avertit si elle diffère. Révision explicite du plan et adoption explicite d'une source fraîche : intentions différentes. Révision des quantités conserve par défaut le snapshot, pas un rechargement caché de recette.

Préconditions : expectedAccessVersion sur toute écriture ; expectedContentVersion lors de création/adoption source ; expectedPlanVersion lors de révision. Absente/obsolète409sans effet, aucune version inférée et aucun forçage. Une révision identique ne change pas la version. Une erreur entre snapshot, paramètres et données du plan provoque le rollback complet.

Création avec UUIDv4 d'intention et empreinte canonique acteur/workspace/route/source/version/paramètres ; unicité acteur+UUID, reçu privé à l'acteur et contrôle d'accès courant avant consultation/rejeu. Même clé/même commande déjà enregistrée : même plan, aucun doublon ; autre payload409. GET reçu explicite pour réponse perdue. Révision préconditionnée : après réponse incertaine, relire le plan et comparer explicitement, jamais resoumettre aveuglément ni récupérer une version fraîche pour contourner409. Aucun retry automatique de transaction/POST/PUT. Les reçus de création ne sont pas des droits persistants.

Migration additive uniquement sur bases de test jetables gardées. Contraintes scope/FK/versions/labels/typeJSON, fresh/redeploy/drift, transition depuis les onze migrations intégrées et rollback DDL dans un schéma jetable. Préserver les données existantes. Rollback applicatif compatible, jamais down destructif propriétaire.

## API et parcours à coordonner

GET /api/workspaces/:workspaceId/batch-plans : liste paginée autorisée.
POST .../preview : calcul pur autorisé depuis une recette/version ou un snapshot de plan autorisé ; aucun plan ni stock créé, pas une preuve de fabrication.
POST .../batch-plans : création explicite depuis la même version et paramètres vérifiés ; reçu d'intention.
GET .../batch-plans/:id : snapshot, sources, paramètres et résultat recalculé déterministe.
PUT .../batch-plans/:id : révision explicite préconditionnée, sans modification du snapshot source par défaut.
GET .../batch-plan-receipts/:requestId : reçu privé scoped, aucune donnée étrangère.

Forme précise DTO/limites des listes et des pas à arrêter avant la première modification applicative, avec tests de refus des champs inconnus. Définir les routes preview/snapshot de façon non ambiguë avant l'implémentation, sans multiplier des contrats concurrents.

Entrée Batchs dans le Bar confirmé ; choix de recette, base/service explicites, cible, aperçu original/calculé/arrondi/écarts, sauvegarde puis fiche en lecture seule et action claire de révision. Pas de bouton de production tant que BB2b absent. Desktop/mobile/clavier, labels réels, pas de débordement, accents Bar et modes utilisateur conservés.

WorkspaceContext.request et gardes de bascule existants ; génération/identité/espace vérifiés sur réponses tardives, révocation masque les données. Saisie non sauvegardée honnêtement en mémoire pour ce minimum (pas de promesse24h hors recettes), confirmation avant abandon et blocage de double clic/résultat incertain. Ne pas construire un second moteur de brouillons ; DraftStore/FormDraft recettes inchangés. Si une extension de persistance est nécessaire, réutiliser l'existant sous revue dédiée avant activation.

## Acceptation et preuves avant D8

1. OWNER et MEMBER créent/lisent/révisent un plan du même Bar ; Personnel/autre Bar/étranger/révoqué refusés sans fuite.
2. Snapshot/version source confirmés au serveur ; édition source pendant création donne un résultat cohérent ou409sans écriture, jamais un mélange.
3. Exemple45+15/1000→750+250/16/40 et service480 ; cible sous une portion et exclusion totale correctement traitées.
4. Portion45×12=540 ; retour à1 exact ; facteurs fractionnaires et bornes/overflow refusés proprement.
5. TOP_UP/inconnu jamais0 ; G/qualitatif jamais ML ; garniture distincte et au service.
6. Arrondis/pas/écarts/ratio affichés, aucun cumul de réarrondis et aucune correction cachée du volume.
7. Deux révisions concurrentes : un succès/un409sans perte ; no-op sans incrément ; capacité protégée.
8. Double clic et réponse réellement commitée puis perdue : reçu explicite, aucun double plan/replay automatique ; clé réutilisée différemment409.
9. Deux ordres de course révocation/écriture observés PostgreSQL ; rollback injecté de création/révision et réadmission/ancienne intention.
10. Chaque preview/création/révision/lecture laisse compteurs ET historiques inventaire strictement identiques ; données recettes/catalogue également inchangées.
11. Parcours Chromium réel à deux acteurs desktop/mobile, thèmes, conflit/saisie conservée, stockage refusé, changement d'espace/session, clavier et captures réellement inspectées.
12. SixCI dernierHEAD, revue complète diff/historique/commentaires/compatibilité, aucun BLOCKER/P1, merge commit D8 puis main réellement qualifié ; disponibilité réelle traitée séparément.

Unitaires : rationnels, mesures/bornes, arrondis moitié/petit pas, permutations, retour à1, données inconnues et calcul déterministe. PostgreSQL/HTTP : scopes/roles/CSRF, concurrence/version/rollback/idempotence/révocation et migration. Aucun seuil/assertion/timeout/retry diminué pour obtenir vert. Aucun coût/service nouveau. L'environnement d'exécution doit être utilisable pour lancer et diagnostiquer ces tests ; publier du code non exécuté ne constitue pas une livraison.

## Alternatives et risques

Calcul client seul écarté : duplication, version et autorité invérifiables. Snapshot client écarté : données croisées et faux contenu. Mise à jour automatique depuis recette écartée : plan silencieusement modifié. Couplage stock écarté par mandat, pas seulement reporté. Decimal seul avec libellé exact écarté pour les divisions périodiques ; rationnels bornés privilégiés. Modèle géant de production/achats/traçabilité écarté.

Risques : volume de base différent du verre servi ; inconnu ou quantité qualitative non convertible ; arrondi modifiant le ratio ; snapshot devenu ancien ; saisie mémoire perdue au refresh ; autorisations révoquées ; manque d'environnement local de tests ; absence de cible/restauration OPS. Tous doivent rester visibles. BB2a n'est pas BB2b, une CI jetable n'est pas une instance disponible, et aucune date limite de récupération ne prouve un effacement physique.

Prochaines actions : finaliser les DTO/contrats d'aperçu, coder en étapes testables (calcul → snapshot/transactions → interface coordonnée), ouvrir une PR draft puis effectuer la qualification complète. Aucun code batch commencé à la publication de cette revue. Le dossier OPS distinct demeure requis ; aucune opération réelle n'est autorisée.

## Contrats précisés avant code — reprise du29octobre

Environnement revenu : worktree séparé barbook-batch depuis1e7f3e0, ancien clone sale conservé sans modification. Premier bloc atomique : moteur de calcul pur et tests, sans route activée ni migration. Deux fichiers de domaine cohésifs (rationnels et calcul) ; erreurs métier dédiées converties en400 à la frontière HTTP. Aucune nouvelle dépendance.

Paramètres communs : {mode: PORTIONS|VOLUME_ML, target: nombre positif à3décimales maximum, includedPositions: entier[] unique0..49, rounding: {unit: MeasurementUnit horsTOP_UP, step: nombre positif à3décimales≤100000}[]}. Inclusion explicite, au moins une ligne pour les deux modes ; aucune sélection implicite par nom. Un pas par unité, au maximum12 ; absence de pas = aucun arrondi. Quantité source≤99999.999 ; max50ingrédients/20garnitures. Calcul au-delà de1000000000 par ligne refusé. Champs supplémentaires refusés par DTO. TOP_UP ne peut pas être inclus, reste « compléter » au service. Un pas arrondissant une ligne positive à0 est refusé avec une erreur utile, pas supprimé.

POST /batch-plans/preview depuis recette : {sourceCocktailId,expectedContentVersion,expectedAccessVersion,...paramètres} ; snapshot composé serveur sous WorkspaceAccess partagé. POST /batch-plans/:id/preview depuis plan : {expectedPlanVersion,expectedAccessVersion,...paramètres}, conserve son snapshot. POST /batch-plans : {name,requestId,...aperçuRecette}. PUT /batch-plans/:id : {name,expectedPlanVersion,expectedAccessVersion,...paramètres}, snapshot immuable ; adopter une nouvelle source signifie créer explicitement un autre plan dans cet incrément, aucune mise à jour cachée. GET /batch-plans/:id et liste paginée ; GET /batch-plan-receipts/:requestId privé à l'auteur. Les routes preview sont déclarées avant /:id et restent des lectures métier malgré POST/CSRF.

Pas de nouveau calcul ABV. Réponse de calcul JSONversion1 : facteur rationnel, nombre de portions complètes, base par portion/volume obtenu/reste si sommables enML, chaque ligne avec quantité originale, exacte, arrondie, écart signé, ratio final dans la base de même unité et marque base/service. Quantités inconnues null avec cause explicite ; jamais additionnées comme0. Pour la cible volume, portions et reste proviennent du volume de base réellement obtenu après arrondi, séparé du volume cible ; service calculé sur ces portions complètes. Les références et tout contenu ABV restent dans le snapshot canonique de recette.

Le modèle plan conserve créationRequestId/empreinte/acteur en plus des champs précédents ; reçu création réutilise cette identité immuable, même si le plan a ensuite été révisé. Révision refuse toute ancienne version, y compris no-op. Pas de suppression/production dans cette PR ; aucun batch complet annoncé tant que la déclaration BB2b n'est pas livrée.

## Frontière préventive de navigation — avant interface

Un simple canDeactivate ne suffit pas au changement de Bar : WorkspaceContext installe le nouveau contexte avant navigate(), ce qui peut retirer le router-outlet et détruire la saisie. Ajouter un registre de gardes synchrones de sortie mémoire, utilisé seulement par les formulaires non persistés, exécuté avant toute résolution/bascule et sans modifier les règles DraftStore existantes. Désinscription au destroy. Annulation = aucun GET de nouveau Bar, aucun purge/contexte changé ; mutation en cours reste bloquée avant la garde. Route et beforeunload restent protégés. Une expiration involontaire masque les données sans prompt ; le formulaire annonce honnêtement sa saisie seulement mémoire. Tests du refus de bascule et de désinscription obligatoires. Aucune persistance parallèle ou deuxième moteur de brouillons.
