# Barbook Bêta Bar — plan accéléré du 24 octobre 2026

Objectif : usage privé réel par Alex et Maël le vendredi 30 octobre 2026, Europe/Paris. Cible de livraison, pas promesse ni dispense de sécurité. La clarification d'inventaire reçue le24octobre remplace le premier cadrage de consommation : **compteurs manuels d'unités physiques, aucune liaison de stock avec recettes ou batchs**. Aucun moteur de stock n'a été développé avant cette clarification.

## Mandat et décisions applicables

- D8 : merges L5/Bêta Bar non destructifs préautorisés uniquement après Design Review, périmètre approuvé, Review Gate complet sans BLOCKER/P1, tests pertinents réellement exécutés, six checks réussis du dernier HEAD, revue diff/historique/dépendances/compatibilité/commentaires, merge commit propre, vérification effective du merge et qualification post-merge main. Toutes branches historiques conservées ; checkpoint/journal/docs actualisés. Green seul ne suffit jamais.
- D3/D4 initiales validées : personnel isolé, Bar partagé, Alex OWNER/Maël MEMBER. Comptes séparés ; membres autorisés seuls ; lecture/création/édition recettes et batchs, consultation/modification de l'inventaire manuel pour les deux. OWNER seul pour membres, paramètres sensibles et autorisations d'achat. Retrait effectif, aucune autorité tirée d'un rôle en cache. Copie personnelle→Bar explicite indépendante ; création Bar reste Bar.
- D1/D2/D5/L5-COMPAT-01B maintenus. D5 concerne le personnel ; ne pas attribuer à MEMBER un droit de suppression/restauration partagée non décidé. Pas de transfert du dernier OWNER ou fermeture d'espace implicite.
- **BB-INVENTAIRE-01 validée par Alex :** produits/conditionnements, nombres d'unités physiques, +/− et correction manuels, seuil/cible, historique simple et section À recommander. Stock toujours non négatif. Une bouteille entamée peut rester une unité jusqu'à son retrait manuel. Aucun suivi de mL restants, consommation théorique, débit automatique, rapprochement recettes/stock, réception attendue ou commande fournisseur.
- Aucune action recette ou batch — création, lecture, édition, planification ou production déclarée — ne peut modifier le stock. Le conditionnement en mL identifie le produit, sans conversion en consommation.
- Aucun coût/service nouveau, achat/envoi fournisseur, purge physique réelle, CONTRACT, infrastructure, déploiement ou migration non jetable. OPS limité à analyse/plans ; accord distinct avant VPS ou base propriétaire. Pas de lancement général des lots historiques L6–L8/L10/L11 au-delà des tranches explicites du mandat.

## État vérifié et chemin critique

#34 revérifiée : HEAD92b7e65, base58461d1,27fichiers/8commits, tousblobs conformes, zérocommentaire/revue/inline, mergeable clean, sixchecks historiques success. Merge98b66589173513c089d78cc3cc29f1fd9681ffd5 à2026-10-24T15:58:34Z, parents58461d1/92b7e65, arbre e2af031fadbb7fef021d2db624e544d36819eca2 identique. Post-merge :261backend/219frontend/187PG-HTTP/8Chromium passés, deux audits échoués ; correction prioritaire en#35, main pas encore entièrement qualifié à cette photographie.

Prisma contient WorkspaceKind/WorkspaceRole/WorkspaceMember, pas de modèle batch ou inventaire. WebSessionService.describe et les services recettes résolvent encore le personnel ; un sélecteur seul ne suffit pas. Sessions/CSRF/epochs, DraftStore/FormDraft et préconditions sont à préserver. Compose ne décrit que PostgreSQL local ; aucun packaging/release/backup propriétaire prouvé. Archives OPS =propositions, pas inventaire réel VPS.

Ordre : sécurité → récupération personnelle minimale → collaboration sûre → plans de batch et inventaire manuel → suggestions → qualification/mise en service après autorisation OPS. Préparation OPS dès maintenant. **La production de batch ne dépend plus de l'inventaire.** Pas de moteur de consommation ou de ledger comptable à construire.

| Livraison | Résultat utilisable et critères de sortie | Dépendances / risques |
| --- | --- | --- |
| BB0 — Données protégées | Correction audits puis main6/6 ; B5d/e corbeille/restauration personnelle en parcours complet, B5f10critères. À30jours restauration interdite côté serveur ; ID/slug/liens valides conservés ; deux versions incrémentées ; anciennes intentions refusées après restauration ; aucune purge. | B5a–c acquis ; horloge après verrous, courses dossier/édition/cycle et rollbackPG/HTTP. |
| BB1 — Carnet Bar | Deux comptes, sélecteur personnel/Bar visible ; liste/détail/création/édition partagées ; OWNER ajoute/retire membres admis ; retrait coupe les droits serveur. Copie explicite avec nouveaux IDs/provenance, source intacte, copie autonome. | BB0, F008–011 ; audit de chaque endpoint, authz transactionnelle, réponses tardives. |
| BB2 — Batchs autonomes | F036/037 : plan à partir d'une version/snapshot, inclus/service séparés, portions ou volume de base ; exact/arrondi/écart affichés. 45+15mL vers1 000mL =750+250,16portions et40mLreste ;30mLservice→480mL pour16. F038 limité à déclaration distincte du réalisé (auteur/date/quantité), sans aucun effet stock. | BB1 ; données manquantes/TOP_UP/masse-volume signalées. Aucune dilution, conservation ou stabilité inventée. |
| BB3 — Inventaire manuel partagé | Produit, conditionnement descriptif, compteur entier non négatif, +/− et correction explicite. Alex et Maël modifient dans Bar, personne ne voit un autre espace. Historique simple auteur/date/avant/après. Concurrence sans perte ; retrait à0 refusé ; réponse perdue ne double pas le changement. | BB1, F030/F045/F046 strictement réduits ; transactions, préconditions et idempotence bornée, pas de comptabilité complexe. |
| BB4 — À recommander | Pour stock≤seuil : suggestion=max(0,cible−stock). Paddy700mL, stock2, seuil2, cible8→6bouteilles ; stock3→pas d'alerte. Liste explicable par stock/seuil/cible, aucune commande. | BB3 seulement ; aucune dépendance aux plans, prévisions, consommations ou réceptions attendues. |
| BB5 — Bêta exploitable | Recette Alex/Maël, appareils cibles, isolation/retrait/concurrence, batch sans effet inventaire, restauration exercée et dossier OPS validé. Version exacte, sixchecks, aucun BLOCKER/P1 et sauvegardes réellement restaurables. | Tranches annoncées livrées +accord OPS distinct. CIverte≠mise en service. |

## Cible de séquencement jusqu'au 30 octobre

24–25 : BB0 et revue collaboration, préparation OPS documentaire. 26 : BB1. 27 : BB2 et BB3. 28 : BB3/BB4 et parcours croisés. 29 : qualification globale et exercice de restauration sur cible expressément autorisée. 30 : correctifs/décision de mise en service si preuves et autorisations acquises. Dates révisables à chaque checkpoint ; elles supposent des sessions effectives, pas une exécution implicite en arrière-plan.

Incréments courts : design publié avant code ; API/UI coordonnées ; tests, Gate et PR, merge admissible D8 puis main qualifié. BB2/BB3 sont indépendants après BB1 ; BB4 suit BB3. Si retard, présenter précisément les incréments réellement utilisables et ce qui manque, sans déclarer un ensemble incomplet prêt pour le service.

Différés : photos avancées, statistiques, marges, esthétique, gouvernance complexe, offline/PDF élaboré. **Exclus du mandat inventaire :** moteur de consommations/productions lié au stock, débits ingrédients, allocations physiques de recettes, mL restants, prévisions et réceptions attendues, rapprochement théorique, fournisseurs/commandes automatiques.

## Contrats à finaliser dans les Design Reviews de blocs

Collaboration : routes personnelles conservées ; routes partagées explicitement scoped, membership/droit serveur. Inventaire exhaustif recettes/dossiers/tags/ingrédients/recherche/compteurs/copie/anciennesAPI. Revérifier l'autorisation sous verrou workspace avant écriture ; retrait utilise le même ordre. Tester les deux ordres de course : une écriture déjà engagée peut précéder le retrait, aucune intention autorisée après retrait ne passe. Réponses tardives masquées côté client ; aucune promesse d'effacer les données déjà vues sur un appareil.

Contexte actif navigateur explicite, pas de bascule silencieuse entre appareils ; revue bootstrap/me, expected-workspace, CSRF, epochs, BFCache/leases. Brouillons24h, restauration explicite, changements compte/workspace purgent selonD2, expiration conserve ; un seul moteur DraftStore/FormDraft.

Copie : transaction, contrôle source personnelle et destination autorisée, snapshot/version source, nouveaux IDs et remappage du catalogue sans modifier le catalogue existant ni garder des FK croisées. Prévisualiser les champs choisis ; notes/image privée jamais transférées implicitement. Toute ambiguïté métier structurelle non couverte reste à arbitrer avant activation.

Inventaire : produit physique séparé d'Ingredient, **sans FK de consommation avec recette/batch**. Conditionnement descriptif (ex.bouteille700mL), unité de comptage explicite, quantité entière bornée≥0, seuil/cible entiers non négatifs ; cohérence cible≥seuil à valider au formulaire/serveur. Quantité initiale et corrections historisées ; un bouton +/− est une action manuelle, pas une estimation.

Les boutons +/− appliquent un delta unitaire atomique sous contrôle serveur, sans lecture-modification-écriture du compteur depuis un client périmé. Correction absolue exige expectedVersion, conflit409 conserve la saisie sans écrasement. Sous transaction : droit courant, version si nécessaire, borne/non-négativité, compteur et historique auteur/date/avant/après. Deux retraits à partir de1 : un succès et un refus, jamais−1 ; deux incréments concurrentiels sont tous deux comptabilisés. Clé d'opération client stable pour reconnaître une réponse perdue ; mêmeclé/mêmeintention renvoie le résultat déjà enregistré, réutilisation pour un autre payload→409. Pas de replay automatique d'une intention incertaine.

Seuil/cible et paramètres sensibles réservés àOWNER selonD4 ; MEMBER conserve les modifications ordinaires du compteur. Aucun achat activé pour aucun rôle. Historique consultable simplement, sans event sourcing, journal comptable ni modification rétroactive ; une correction produit une nouvelle entrée.

Suggestions : quand quantité≤seuil, afficher max(0,cible−quantité) dans la même unité physique, dont0si cible=quantité. Pas d'arrondi au carton ou conversion de700mL en consommation, ni soustraction de batch planifié, ni ajout de réception prévue. Les unités et conditionnements sont renseignés explicitement ; valeur inconnue affichée comme telle, pas inventée.

Migrations : additives seulement pour le bloc implémenté, FK workspace/CHECKquantités/versions/cléunique, fresh/redeploy/drift et transition depuis intégré sur DB jetables gardées. Pas de modèle géant anticipé, backfill réel ou downmigration destructrice. Ancien binaire utilisable seulement si compatible avec les nouvelles données.

## Matrice d'acceptation et preuves à acquérir

- L5 :10critères préservés, restauration à frontière30jours et anciennes intentions invalidées, vrais rollback/concurrencePG/HTTP.
- Collaboration : Alex/Maël/étranger, membre retiré pendant requête, anciens endpoints, FKcroisées, copie sans synchronisation, personnel privé.
- Batchs : facteurs/arrondis/inconnus, plan différent du réalisé ; snapshot/version ; chaque action batch laisse compteur ET historique inventaire strictement identiques.
- Inventaire : création6unités, +→7,−→6, correction explicite→2 ; historique auteur/date/avant/après exact ;0−1refusé ; validation quantités négatives/fractionnelles/malformées ; conflits, doubleclic, réponse perdue et rollback compteur+historique.
- Réapprovisionnement : seuil inclusif, exemple2/2/8→6, remontée3retire alerte ; cibleatteinte→0, aucune conversionmL, aucune consommation/réception attendue incluse.
- Chromium desktop/mobile : sélection d'espace visible, édition/drafts/expiration/changement identité, inventaire à deux comptes et À recommander, clavier et messages utiles ; batch sans impact stock. Conserver tests/quotas/timeouts/retries existants, sixchecks dernierHEAD et post-merge avec journaux.

## Décisions encore réservées

Stock négatif **tranché : interdit**, modifications manuelles seulement. Aucun arbitrage de consommation automatique à demander.

Suppression/restauration partagée, transfert/fermeture/dernierOWNER : non activés dansBB1 sans décision, conservation des données Bar au retrait. D7 reste ouvert : perte maximale et délai de reprise acceptables, cible/hébergement/destination de sauvegarde. L'ancien RPO24h/RTO4h était une recommandation jamais validée. Ne pas bloquer les tranches indépendantes.

## OPS : inventaire documentaire et plan, aucune intervention

Dépôt : Angular21/Nest11/Prisma7/PG16, CI Node24, /api compilé testé. ReadinessDB complète, packaging release, Nginx/TLS réel, sauvegardes/restauration et capacitéVPS non prouvés. Compose local et valeursd'exemple ne sont pas une configuration de mise en service. Aucun SSH ni accès DB propriétaire effectué.

Préparer un dossier distinct : environnement exact, autorisation nominative, inventaire initial en lecture seule des capacités/versions/ports/proxy/TLS/services/volumes/schéma/migrations et données à préserver. Aucun secret/IP dansGit. Staging isolé, comptes synthétiques ; copie de données privées seulement sous autorisation explicite. Aucun coût/service ajouté.

Sauvegarde proposée : DBcohérente, références/médias existants, manifesterelease/migrations, configuration protégée ; destination/cryptage/rétention à approuver. Checksum seul insuffisant : restauration sur cibleisolée autorisée, contrôleFK/données/historique, login/isolation/recettes/inventaire, perte et durée mesurées. Expirationcorbeille≠effacementdumps. Aucune rétention physique inventée.

Déploiement proposé : releaseimmutable identifiée et sixchecks, sauvegarde restaurable vérifiée, migrations compatibles relues, fenêtre/arrêt/bascule selon capacité réelle ; smokeHTTPS cookiesSecure/HttpOnly/CSRF, admission privée, authz, DB/disque/logs et usages. Pas de promesse zérointerruption ou de secret dansbuildAngular.

Rollback : précédent binaire compatible et assets conservés ; échec avantbascule→pasdepromotion ; après→retourapplicatif seulementsi schémacompatible. Incidentdonnées→arrêtcibléécritures, diagnostic, restaurationisolée puis accord avantremplacement et rapprochement des changements perdus. Jamais de restauration automatique surbaseactive.

Avant toute action réelle, soumettre : cible/données àpréserver ; étapes/commandesexactes ; SHA/digests ; sauvegardes réellement vérifiées/exercice/date ; risques/durée/critèresabandon ; retourarrière compatible et responsables. Ces preuves propriétaires sont inconnues aujourd'hui : aucune demande de déploiement prête ni autorisation présumée.

## Design Review préventive BB0-S — audits du 24 octobre

Réalisée avant packages sur fix/beta-dependency-security depuis98b6658 ; publiée a46e0d3. Audits120917795557/120917795380 échoués : body-parser2.3.0(runtimebackend/outilsfrontend), fast-uri3.1.8(outils), multer2.4.0(dépendanceNest, aucun upload), undici7.29.1(buildAngular).

Choix : correctifs transitifs mêmesmajeures, body-parser2.4.0, fast-uri3.1.9, multer2.5.0, undici7.30.1 ; overrides limités parents épinglés Nest/multer et Angularbuild/undici. Undici6.29.1 node-gyp déjàcorrigé conservé. Pas d'Angular22/refonteNest/auditfixforcé/exceptionseuil. Diff lock ciblé, qsbackend6.16.1 requis ; provenance/intégrité et graphe relus.

Qualification locale c9fe705 : npmci/verify backend261/frontend219,3compatbackend/2frontend, auditscomplets/runtime0, typagebackend/e2e et10gardes. URI rougeavant/verteaprès ; gzip smoke passeavant/après, pas de reproduction CVE prétendue. VraiHTTP Undici gzip conservé. SixCI native et Gate avantmerge, aucunequalificationanticipée ; rollback vers dépendancevulnérable n'est pas la solution. Aucun impactinfra/migration.

Sources primaires : [body-parser](https://github.com/advisories/GHSA-27r3-jxmh-p828), [fast-uri](https://github.com/advisories/GHSA-w74x-v6f9-j3xg), [multer](https://github.com/advisories/GHSA-q7qp-rjg7-q26m), [undici](https://github.com/advisories/GHSA-4qv8-2p9j-2685). [Review Gate](reviews/beta-security-review-gate.md). Toute correction impose revue entière.
