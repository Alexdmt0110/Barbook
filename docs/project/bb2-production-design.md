# BB2b — Design Review préventive : déclarations du réalisé
29 octobre2026. Base réelle main18c1ee09f4a8264ff8ce665374f3dce8345a39a3 après BB2a/#48, six contrôles et journaux287/287/303/44 réussis ; mergedAt, deux parents, arbre et source conservée vérifiés. Conception avant toute modification applicative de BB2b. Références : F038 réduit par beta-bar-plan.md, D3/D4/D8 et BB-INVENTAIRE-01. OWNER/MEMBER déclarent des quantités réalisées dans leur Bar, sans consommation automatique. Ce bloc ne valide ni fabrication physique ni stabilité sanitaire.

## Parcours et invariants
Depuis un plan enregistré : ouvrir une page distincte « Déclarations du réalisé ». Conserver le plan/version et son snapshot au moment de la première déclaration. Quantités réellement constatées saisies explicitement, jamais copiées automatiquement du plan : volume de base en mL et/ou portions, chaque valeur connue non négative à3décimales ; champ vide=null/inconnu,0reste un zéro explicite. Au moins une valeur doit être renseignée. Bornes volume1000000, portions10000. Aucune conversion, dilution, déduction stock ou consommation d'ingrédient.
Date affichée = date serveur d'enregistrement de la déclaration, pas date de fabrication présumée ni date limite sanitaire. Auteur vient de la session, jamais du corps. Motif obligatoire1..240 après trim, y compris correction. Une correction0 explicite conserve l'original, elle ne supprime pas l'historique.
Lecture des déclarations et de leur historique, création explicite et correction versionnée. Aucun bouton « fabriquer » qui transformerait un plan en consommation. Pas de suppression physique/logique, étiquette, conservation, tâche avancée, coût ou achat.

## Modèle et transaction
Migration additive13, seulement DB jetables autorisées :
BatchProduction : id/workspaceId/batchPlanId, planVersion et snapshot JSONversion1 immuables, volume/portions nullables Decimal(12,3), version entière0, createdAt/updatedAt timestamptz.
BatchProductionEvent : id/workspaceId/productionId, actorId, UUIDrequestId, empreinte, productionVersion, quantités déclarées après opération, motif et date serveur. Événement INITIALv0 puis correctionv+1, aucune réécriture. Unicité acteur/UUID et production/version. FK composite workspace/plan et workspace/production, FK auteur RESTRICT ; références conservées, pas de lien StockProduct/StockMovement/Ingredient.
Contrainte SQL : au moins une mesure connue, bornes/non-négativité, version>=0 et motif non vide/empreinte64hex. Ajouter l'unicité (workspaceId,id) au plan pour la FK, aucun retrait de contrat.
Ordre commun Workspace FOR NO KEY UPDATE → plan pour création, ou production FOR UPDATE pour correction. Droit courant/accessVersion obligatoire avant reçu. Création exige expectedPlanVersion ; correction exige expectedProductionVersion sans réadopter une nouvelle version de plan. Versions indépendantes, aucun recalcul silencieux du snapshot.
Chaque écriture compteur/version+événement est atomique. Injecter échec événement→rollback création/correction. No-op identique après vérification version ne crée ni événement ni incrément. Capacité de version protégée. Motif changé seulement représente une nouvelle correction traçable.
Intention immuable acteur/route/workspace/production-ou-plan/versions/quantités/motif. Reçu privé actif : même clé+empreinte retourne résultat déjà enregistré sans événement supplémentaire, payload différent409. Accès retiré404 ; retrait/réadmission invalide l'ancien expectedAccessVersion même pour rejeu. GET reçu privé vérifie droit actuel, sans autoriser une écriture passée. Pas de retry automatique.

## Contrats
GET /workspaces/:w/batch-plans/:id/productions : liste paginée de ce plan avec droits courants, quantités, version, auteur/date et planVersion figée.
POST même chemin : {requestId,expectedAccessVersion,expectedPlanVersion,actualBaseMl:null|nombre,actualPortions:null|nombre,reason}.
PUT /workspaces/:w/batch-productions/:id : {requestId,expectedAccessVersion,expectedProductionVersion,actualBaseMl,actualPortions,reason}.
GET /workspaces/:w/batch-productions/:id/events : historique paginé snapshotVersion pour refuser concaténation concurrente.
GET /workspaces/:w/batch-production-receipts/:requestId : reçu privé, pas d'accès par UUID seul.
DTO strict : pas de champ supplémentaire, précondition absente/obsolète409, malformed400, étranger/inconnu404. Aucune version inférée. Snapshot/calcul source jamais acceptés d'un client.

## Interface
Route dédiée avec plan consultable et avertissement « quantités déclarées, aucune consommation automatique ». Formulaire création vide pour les mesures ; correction initialisée sur la déclaration chargée, versions conservées. Données inconnues distinctes de0.
Réutiliser WorkspaceContext.request/registerExitGuard, garde route existante et beforeunload. Saisie mémoire seulement, aucune promesse24h ni second moteur. Busy interdit doubleclic/bascule ; résultat inconnu bloque toute nouvelle clé et propose GET reçu, puis relance explicite même intention seulement.409 conserve la saisie ; inspection explicite puis rechargement ou nouvelle intention expressément préparée, sans version actuelle substituée silencieusement. Identité/espace/réponse tardive invalidés selon les garanties existantes.
Page distincte du formulaire de plan, aucun ajout de responsabilité au composant BatchPlans. Deux thèmes/mobile/clavier/captures réelles, pas d'embellissement secondaire.

## Acceptation et risques
PG/HTTP : deux comptes déclarent/corrigent/lisent, acteur/date/quantités exacts, null≠0, scopes/auth/CSRF, versions manquantes/obsolètes, concurrence, doublons, clé interBars, rollback événement, révocation des deux côtés du verrou et réadmission. Plan révisé après déclaration ne change pas son snapshot ; les actions laissent recettes/catalogue/compteurs ET mouvements stock identiques. Migration depuis12historiques/fresh/redeploy/drift et rollbackDDL jetable/FK/contraintes.
Chromium : deux comptes, planifié≠réalisé, création sans préremplissage automatique, correction/conflit, réponse vraiment commitée puis perdue, stockage refusé, bascule/identité/révocation, thèmes/mobile et captures inspectées. Aucun seuil/assertion/timeout/retry modifié.
D8 : revue entière diff/historique/discussions/compatibilité/transactions, sixCI dernierHEAD et tests réels, aucunBLOCKER/P1 ; merge commit, parents/arbre/mergedAt/main et sixCIpostmerge vérifiés, branches conservées.
Limites : déclaration utilisateur non mesure automatique, pas de stock théorique, calcul sanitaire ou certification. Historique conservé et correction compensatoire, aucune purge. OPS/D7/cible/sauvegarde restaurée/rollback réels restent distincts ; aucun compte réel/coût/VPS/déploiement/migration propriétaire.
