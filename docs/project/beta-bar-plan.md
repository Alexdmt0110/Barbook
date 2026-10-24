# Barbook Bêta Bar — mandat et plan accéléré du 24 octobre 2026

Objectif : usage privé réel par Alex et Maël, vendredi 30 octobre 2026, Europe/Paris. Cible de livraison, pas promesse ni dispense de sécurité. Le mandat récent prime sur les restrictions historiques de lots et de merges ; aucune fonctionnalité ci-dessous n'est annoncée livrée sans preuve.

## Décisions applicables

- D8 : merges L5 et Bêta Bar préautorisés seulement après Design Review, périmètre approuvé, Review Gate complet sans BLOCKER/P1, tests réels pertinents, six checks réussis au dernier HEAD, revue du diff/historique/dépendances/compatibilité/commentaires, merge commit propre, vérification du merge et qualification post-merge main. Branches historiques conservées, checkpoint et journal actualisés. Une condition échouée bloque le merge concerné ; correction et requalification autonomes dans le mandat.
- D3/D4 initiales validées : personnel isolé ; espace Bar partagé ; Alex OWNER, Maël MEMBER (lecture/création/édition recettes et batchs, mouvements ordinaires de stock). OWNER seul pour membres, paramètres sensibles et autorisations d'achat. Révocation effective, aucune autorité tirée d'un rôle en cache. Copie personnelle → Bar explicite et indépendante ; création Bar reste Bar. Aucun partage de compte.
- D1/D2/D5 et L5-COMPAT-01B maintenus. D5 reste personnel ; droits de suppression/restauration partagée à arbitrer avant activation. Pas de rôle supérieur attribué sur la seule correspondance d'un nom affiché.
- Aucun achat automatique, coût/service nouveau, purge physique réelle, CONTRACT, changement d'infrastructure, déploiement ou migration non jetable. OPS limité à analyse et plans ; accord distinct avant toute opération VPS ou base propriétaire. Aucun lancement général des anciens L6–L8/L10/L11 : seules les tranches explicites de ce mandat sont approuvées.

## État réel et chemin critique

#34 revérifiée : HEAD92b7e65, base58461d1, 27 fichiers/8 commits, tous blobs conformes, zéro commentaire/revue/inline, mergeable clean, six checks historiques success. Merge98b66589173513c089d78cc3cc29f1fd9681ffd5 à2026-10-24T15:58:34Z, parents58461d1/92b7e65, arbre e2af031fadbb7fef021d2db624e544d36819eca2 identique. Qualification post-merge initiale bloquée par audits de dépendances ; ne pas annoncer main qualifié à ce stade.

Inspection : Prisma possède WorkspaceKind/WorkspaceRole/WorkspaceMember mais pas BatchPlan, ProductionBatch, produit physique ou ledger. WebSessionService.describe et les services recettes résolvent encore le personnel ; un sélecteur seul ne suffirait pas. Sessions, CSRF, epochs, DraftStore/FormDraft et préconditions sont des acquis à conserver. Docker Compose ne décrit que PostgreSQL local ; aucun packaging/release ou backup propriétaire prouvé. Les archives OPS sont des propositions, pas un inventaire réel du VPS.

Ordre : correction sécurité → récupération L5 minimale → collaboration sûre → plans de batch et inventaire → production transactionnelle → suggestions → qualification et autorisation OPS. Préparation OPS dès maintenant, sans attendre les fonctions métier. Ne pas attendre photos, statistiques ou fin de la roadmap historique.

| Livraison | Résultat utilisable et critères de sortie | Dépendances / risque principal |
| --- | --- | --- |
| BB0 — Socle sûr | Réparer audits puis main 6/6 ; B5d/e corbeille et restauration personnelle en parcours complet ; B5f 10 critères revalidés. À 30 jours restauration interdite côté serveur, mêmes ID/slug, liens valides conservés, deux versions incrémentées, aucune purge ; anciennes intentions refusées même après restauration. | B5a–c acquis ; délais serveur après verrous, courses dossier/édition/cycle et rollback HTTP/PG. |
| BB1 — Carnet Bar | Deux comptes distincts, sélecteur personnel/Bar visible, liste/détail/création/édition partagées ; OWNER ajoute/retire les membres admis ; retrait coupe les appels suivants et les écritures non encore autorisées dans leur transaction. Copie explicite avec nouveaux IDs et provenance, source inchangée, copie autonome. | BB0, F008/009/010/011 ; audit de chaque endpoint historique, authz transactionnelle et réponses tardives. Pas de suppression partagée implicite. |
| BB2 — Préparation | F036/037 : plan enregistré à partir d'une version/snapshot ; inclus/service séparés, portions ou volume de base ciblé ; exact/arrondi/écart affichés. 45+15 mL vers 1 000 mL =750+250, 16 portions et40 mL de reste ; 30 mL au service →480 mL pour16. Aucun mouvement au calcul/enregistrement du plan. | BB1 ; quantités manquantes, TOP_UP, masse/volume, pas de dilution/conservation inventée. |
| BB3 — Inventaire | F030 limité produit/conditionnement +F045/F046 indispensable : réception, consommation, perte, ajustement motivé ; auteur/date/référence ; solde réconciliable au journal. Rejeu même clé/même intention =même résultat, clé réutilisée pour autre intention =409. Conflit de comptage n'écrase pas les mouvements intervenus. | BB1 ; politique stock négatif à décider avant activation des sorties ; decimal, FK workspace, verrouillage et rollback. |
| BB4 — Production réelle | F038 minimal : produire explicitement une quantité réelle, affecter les produits physiques aux ingrédients ; validation atomique production+mouvements, un seul débit malgré double clic/réponse perdue. Prévu et réel conservés séparément ; sortie du batch au service ne redébite jamais les ingrédients déjà consommés. | BB2+BB3 ; allocation explicite, conversions fiables, correction traçable ; pas d'inventaire de produits finis implicitement inventé. |
| BB5 — Réapprovisionnement | F046/047 limités : seuil/cible, conditionnements et réceptions attendues confirmées ; calcul explicable, manques/inconnues visibles ; proposition uniquement. Aucun email fournisseur, commande ni engagement financier. | BB2–4 ; éviter double comptage prévu/réalisé, horizon/date, unités compatibles. |
| BB6 — Bêta exploitable | Parcours Alex/Maël sur appareils cibles, révocation en service, stock/concurrence/rejeu, restauration testée et dossier OPS approuvé. Version exacte, sauvegardes vérifiées, rollback compatible, aucun BLOCKER/P1. | Toutes tranches annoncées livrées +accord OPS spécifique ; une CI verte n'est pas une mise en service. |

## Organisation jusqu'au 30 octobre

24–25 : BB0 et Design Review transverse collaboration/stock, inventaire OPS documentaire. 26 : BB1. 27 : BB2 puis socle BB3. 28 : BB3/BB4. 29 : BB5, recette globale et répétition de restauration sur cible autorisée. 30 : correctifs et décision de mise en service seulement si les preuves et autorisations sont acquises. Ce calendrier est une cible de séquencement à réviser à chaque checkpoint ; il suppose des sessions de travail effectives, ne constitue pas une tâche en arrière-plan.

Chaque livraison est découpée en petits commits et PR cohérentes (Design avant code, contrats/API/UI coordonnés, tests, Gate). Pas d'activation intermédiaire d'un chemin sans autorisation/version. BB2 et BB3 peuvent être conçus indépendamment après BB1 ; BB4 attend les deux. En cas de retard, conserver les incréments réellement qualifiés et annoncer les fonctions absentes ; ne pas présenter un stock partiel comme fiable. Reporter photos avancées, statistiques, marges, esthétique, automatisation d'achat, gouvernance complexe, offline, PDF élaboré.

## Contrats techniques à préciser dans chaque Design Review

Conserver les routes personnelles et leur contexte ; routes partagées explicitement scoped et membership vérifié côté serveur. Le choix UI n'accorde aucun droit. Inventorier recettes, dossiers, tags, ingrédients, recherche, compteurs, copie et endpoints historiques. Sous verrou workspace, revérifier droit avant écriture ; retrait de membre utilise le même ordre de verrous. Tester les deux ordres de course : une écriture déjà engagée peut précéder la révocation, aucune intention autorisée après le retrait ne passe. Lectures sans cache privé, réponse tardive masquée après changement de contexte ; aucune promesse d'effacer des données déjà vues sur un autre appareil.

Workspace actif par contexte navigateur explicitement vérifié, pas un basculement silencieux global à tous appareils. Revue obligatoire de bootstrap /me, expected-workspace, CSRF, epoch/intercepteur, BFCache et leases ; brouillons24h isolés, changement workspace/compte purge selon D2, expiration involontaire conserve. Pas de deuxième moteur de brouillons.

Copie : transaction, idempotence, contrôle source personnelle +destination membre, snapshot/version source, remappage du catalogue sans modifier les valeurs existantes ni partager les FK. Prévisualisation explicite des champs copiés ; notes/image privée non transférées automatiquement. Conflits d'identité/slug généré gérés sans changer la source. Décider tout cas produit non couvert avant son activation.

Stock : produit physique distinct de Ingredient ; plusieurs produits/conditionnements possibles par ingrédient, choix explicite à la production. Unité canonique par produit, conversions connues seulement (mL/cL/L, masse entre unités de masse) ; pas de densité, DASH ou TOP_UP inventé. Ledger immuable, corrections par mouvement lié ; opération métier et mouvements dans une transaction, clé d'idempotence bornée au workspace avec empreinte du payload, auteurs conservés après retrait. Version pour ajustement absolu, validation de toutes lignes avant écriture, ordre de verrous déterministe. Propositions sans consommation ni réservation cachée.

Réapprovisionnement proposé, à exposer et tester : à une date/horizon explicites, projeté =disponible −besoins restants fiables non produits +réceptions attendues confirmées non reçues. Sous seuil, manque =max(0,cible −projeté), suggestion =arrondi supérieur du manque au conditionnement d'achat connu. Afficher chaque terme, date, unité et surplus d'arrondi ; aucun nombre exact lorsque conversion/allocation manque. Une réception réalisée quitte les attendues ; une production quitte les besoins planifiés correspondants, sans deuxième déduction. Choix seuil/cible et allocations relèvent des paramètres sensibles OWNER.

Migrations : additives seulement après design du bloc, FK composites et CHECK de quantités/versions/idempotence, test fresh/redeploy/drift et transition depuis schéma intégré sur bases jetables gardées. Pas de modèle géant anticipé ni backfill réel. Retour applicatif seulement vers version compatible avec données déjà écrites ; pas de down migration destructrice.

## Matrice de preuves à acquérir

Unitaires : droits, arrondis exacts, conversions/inconnus, échéance, formule et absence de double comptage. HTTP/PostgreSQL : Alex/Maël/étranger, retrait concurrent, FK inter-workspaces, conflits versions, deux consommations/productions, rollback multi-lignes à chaque panne, idempotence et réponse perdue réellement committée. Chromium desktop/mobile : sélection workspace visible, personnel privé, création/édition/copie, révocation autre onglet, expiration/drafts/BFCache, plan sans débit, production unique, réception/ajustement et explication du réassort. Conserver toutes assertions/quotas/timeouts/retries existants ; six contrôles au dernier HEAD et post-merge, lecture des journaux.

## Arbitrages réservés, sans bloquer les autres tranches

1. Stock négatif : F045 exige une politique explicite. Recommandation : refuser une sortie dépassant le disponible ; corriger d'abord le comptage par ajustement motivé. Ne pas activer de règle contraire ou de forçage implicite. L5/collaboration/plans ne dépendent pas de cet arbitrage.
2. Suppression/restauration partagée, transfert/suppression du dernier OWNER et fermeture Bar : exclus de BB1 initial tant que non décidés ; conservation des données Bar au retrait d'un membre. Seuls pouvoirs explicitement accordés à MEMBER sont activés.
3. D7 : perte maximale et délai de reprise acceptables pour le stock, cible/hébergement et sauvegarde hors machine. L'ancien RPO24h/RTO4h était une recommandation, jamais validée ; ne pas l'appliquer silencieusement à un journal de stock.

## OPS préparé, aucune opération autorisée

Inventaire dépôt confirmé : Angular21/Nest11/Prisma7/PostgreSQL16, CI Node24 ; /api compilé testé, pas de preuve de readiness DB complète, image de release, Nginx/TLS réel, sauvegarde/restauration ni capacité VPS. docker-compose.yml est local, .env.example contient des valeurs d'exemple impropres au réel. Aucun SSH ni accès DB propriétaire effectué.

Avant intervention : dossier distinct avec environnement exact et autorisation nominative, lecture seule initiale des versions/capacités/ports/proxy/TLS/services/volumes/schéma/migrations et propriétaires des données, inventaire des sauvegardes existantes sans exposer secrets/IP. Staging isolé et comptes synthétiques ; toute copie de données privées vers staging exige périmètre autorisé. Coût/service nouveau interdit.

Sauvegarde proposée : DB cohérente +références/médias existants +manifeste release/migrations et configuration protégée ; destination/cryptage/rétention à approuver. Vérification checksum seule insuffisante : restauration sur cible isolée autorisée, contrôle FK/volumes/ledger, login/isolation/recette/stock, temps et perte mesurés. Expiration corbeille ≠effacement des dumps. Aucune rétention physique inventée.

Déploiement proposé : release immutable identifiée et six checks, sauvegarde restaurable vérifiée, migrations compatibles relues, fenêtre et arrêt/bascule selon capacité réelle ; smoke HTTPS cookies Secure/HttpOnly/CSRF, admission privée, authz, DB, disque, logs, recette et stock. Pas de promesse zéro interruption. Pas de build avec secrets dans frontend. Toute intervention nécessite accord spécifique préalable.

Rollback : conserver précédent binaire compatible et assets ; échec avant bascule =pas de promotion ; après bascule =retour applicatif seulement si compatibilité confirmée. Incident données =arrêt ciblé des écritures, diagnostic, restauration isolée puis accord avant remplacement, estimation des mouvements perdus et rapprochement manuel. Ne jamais restaurer sur une base active ni revenir à un ancien binaire incompatible par automatisme.

Demande OPS finale à présenter avant action : cible et données à préserver ; commandes/étapes exactes ; SHA/digests ; sauvegardes réellement vérifiées avec exercice et date ; risques, durée, critères de succès/abandon ; retour arrière compatible et responsables. À ce jour ces preuves propriétaires sont inconnues : aucune demande de déploiement prête ni autorisation présumée.

## Design Review préventive BB0-S — audits du 24 octobre

Réalisée avant modification des packages sur fix/beta-dependency-security depuis main98b6658. Les audits120917795557/120917795380 échouent réellement. Les advisories éditeurs publiées/mises à jour les22–23octobre signalent body-parser2.3.0 (backend runtime +frontend outils), fast-uri3.1.8 (outils), multer2.4.0 (dépendance Nest, aucun upload activé) et undici7.29.1 (build Angular).

Choix : mises à jour transitives ciblées dans leurs majeures actuelles ; body-parser2.4.0, fast-uri3.1.9, multer2.5.0 et undici7.30.1, versions corrigées vérifiées auprès des advisories/registre. Overrides limités aux parents épinglant une version vulnérable (Nest/multer, Angular build/undici) si nécessaire. Garder undici6.29.1 déjà corrigé de node-gyp. Aucune migration Angular22, refonte Nest, audit fix forcé, exception d'audit ou changement de seuil.

Risques : parseur HTTP au runtime et outils de build ; relire diff lock, provenance/intégrité et graphe, npm ci reproductible, verify backend/frontend, typage E2E, audits complet/runtime et six CI natifs. Régression ciblée requête gzip avec octets finaux et vivacité serveur, URI dangereuse et compatibilité transport Undici si override. Rollback des dépendances vulnérables interdit comme solution de sécurité ; ajuster vers une correction compatible. OPS aucun ; bases jetables seulement. Gate final après tests, pas de qualification anticipée.

Sources primaires : [body-parser](https://github.com/advisories/GHSA-27r3-jxmh-p828), [fast-uri](https://github.com/advisories/GHSA-w74x-v6f9-j3xg), [multer](https://github.com/advisories/GHSA-q7qp-rjg7-q26m), [undici](https://github.com/advisories/GHSA-4qv8-2p9j-2685). Les six contrôles de #34 étaient verts avant merge ; les résultats post-merge imposent cette correction avant nouvelles fonctions.
