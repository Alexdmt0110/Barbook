# L5 / BB0 — matrice de qualification et bilan

26 octobre 2026. Périmètre : carnet personnel, D1/D2/D5 et L5-COMPAT-01B. B5a–B5e intégrés par #32–#34, #36–#37 ; sécurité rétablie par #35. Main de référence : `7a9464bfdb68fddaa6d070687404fe9b8bafda96`, six contrôles post-merge réussis et journaux lus. B5f en PR #38 : clôture définitive conditionnée à son Gate, ses six contrôles et ceux du merge. Le checkpoint de cette PR porte les SHA et résultats finaux sans document récursif.

## Matrice des dix critères

Les chemins de tests sont relatifs au dépôt. Les preuves déjà intégrées ont été réexécutées sur main #37 ; les six courses supplémentaires de B5f sont confirmées sur df5bf4b : job PostgreSQL121583891571,226 tests/14 suites. Backend273, frontend229 et audits zéro également confirmés ; Chromium et le dernier HEAD documentaire restent à qualifier avant clôture.

| Critère | Preuves exécutables et résultat attendu |
| --- | --- |
| L5-01 — aller-retour sans perte | `backend/test/cocktail-content.e2e-spec.ts` : snapshot inchangé, identités des enfants, catalogue/autre recette, INHERIT/UNKNOWN/OVERRIDE, zéro et override égal au catalogue. `cocktail-edit.form.spec.ts` et `cocktail-edit.spec.ts` : préremplissage et modes bruts. `e2e/tests/recipe-editing.spec.ts` : enregistrement inchangé réel. |
| L5-02 — identité et relations | Suite contenu : renommage, recherche au nouveau nom, slug/workspace/image/dossiers/tags conservés. Suite migration : slug réservé même après expiration. `recipe-trash.spec.ts` : ancienne URL après édition et récupération. |
| L5-03 — concurrence et versions indépendantes | Suite contenu : deux écritures réellement bloquées, un succès/un409 ; édition et classement disjoints réussissent sans conflit artificiel. UI conserve la saisie en409, comparaison et abandon explicites, aucune version fraîche substituée pour forcer l'écriture. |
| L5-04 — remplacement atomique | Suite contenu : triggers de panne sur Cocktail, ingrédients, garnitures et étapes ; snapshot et catalogue inchangés après échec. Suite préconditions : rollback réel d'un lot, aucune modification partielle. |
| L5-05 — invisibilité de la corbeille | `cocktail-lifecycle.e2e-spec.ts` : détail, contenu, recherche, filtres, compteurs et anciens écrivains refusent ou excluent les recettes supprimées ; lot contenant une recette supprimée sans effet. Isolation étrangère et pagination. Routes historiques conservées. |
| L5-06 — récupération bornée | Suite cycle : avant/à/après échéance, échéance franchie pendant attente réelle, deux commandes concurrentes, rollback dates/versions par trigger. Suite migration : UTC stable sous fuseaux Paris/New York, contraintes de dates, slug réservé. Aucun DELETE physique applicatif. |
| L5-07 — anciennes intentions invalidées | Suite préconditions : toutes routes anciennes et jeton de dossier après barrière de cycle. Suite cycle : suppression contre édition/classement/dossier dans les deux ordres ; B5f ajoute les six ordres correspondants pour restauration avec snapshots complets. |
| L5-08 — sécurité | Suites sessions, admission privée, contenu, préconditions et cycle : cookies opaques, origine/CSRF, contexte user/workspace, ID étranger/inconnu ; aucun accès via une ancienne route. Protections L4 conservées. |
| L5-09 — brouillons | DraftStore/FormDraft et `cocktail-edit.spec.ts` : TTL24h strict, identité/workspace/recette/version, expiration involontaire conservée, purge volontaire/changement, stockage refusé/quota, réponses tardives. Chromium : expiration/reconnexion, changement de compte, conflit et réponse réellement committée puis perdue sans replay. |
| L5-10 — parcours utilisable | Chromium desktop/mobile : création, édition, corbeille, récupération, ancienne URL, confirmations clavier ; captures inspectées, navigation mobile corrigée. Douze parcours, unitaires frontend229 et backend273 sur main #37. Six contrôles et Gate complets encore exigés sur HEAD B5f puis merge. |

## Fonctionnalités et limitations

Édition complète avec remplacement atomique, conservation des champs hors formulaire et modes ABV distincts. Versions de contenu et classement indépendantes ; suppression/restauration incrémentent les deux. Préconditions obligatoires, y compris routes historiques : rupture comportementale autorisée, aucun retrait d'API. Corbeille personnelle paginée, confirmation explicite et récupération avant 30 jours UTC contrôlés par PostgreSQL après acquisition des verrous. ID et slug conservés ; liens survivants conservés, dossiers supprimés non recréés.

Brouillons 24 heures au maximum, moteur L4 réutilisé ; disponibilité du stockage navigateur non garantie. En cas d'incertitude réseau, vérification et décision manuelles, jamais répétition aveugle. Après récupération, l'entrée et le résultat restent visibles jusqu'à actualisation explicite de la liste ; le compteur correspond au dernier chargement.

Aucun archivage, historique complet des révisions, purge physique, nouveau média, récupération partagée ou synchronisation. La fin des 30 jours interdit la restauration, elle ne prouve pas l'effacement des données ni des sauvegardes. Les tests Chromium couvrent les tailles desktop/mobile définies ; ils ne remplacent pas une recette sur les appareils réels d'Alex et Maël ni une qualification Safari/Firefox.

## Revue et risques résiduels

B5f ajoute des tests réels dans la suite cohésive existante, sans modification applicative, dépendance, modèle, migration ou configuration CI. Verrou Workspace puis recette inchangé. Les tests observent les attentes PostgreSQL et comparent les états ; les six cas ne reposent pas sur un délai supposé ni un mock. Fixtures bornées à des acteurs synthétiques sur base gardée. Aucun timeout/retry/seuil/assertion existant abaissé. Revue fonctionnelle, validation, DB, erreurs, sécurité, architecture, dépendances, UX, performances et OPS : aucun BLOCKER/P1 statique identifié ; le résultat natif et les discussions restent des conditions bloquantes.

Le verrou de workspace sérialise les mutations : compromis d'intégrité acceptable pour le carnet personnel privé, pas une preuve de capacité multi-équipe. Les listes de corbeille sont paginées. Les anciennes limites documentées de throttling mémoire imposent une instance API derrière un proxy maîtrisé. Audits nuls à la qualification ne garantissent pas l'absence de vulnérabilité future.

## Avant exploitation — préparation OPS seulement

Le dépôt fournit les migrations et les environnements CI jetables, pas une preuve de déploiement opérationnel. Le Compose existant ne constitue pas une release complète ; le endpoint `/api` ne prouve pas la disponibilité DB. Aucun VPS ni base propriétaire inspecté ou modifié dans ce bloc.

Avant demande distincte d'OPS : déterminer cible/capacité, TLS et proxy (API non publique), secrets et admission privée, packaging immuable identifié, sauvegarde cohérente DB et références/médias, destination/rétention protégées, exercice de restauration autorisé et mesuré. D7 (perte et délai de reprise acceptables) reste à décider. Vérifier cookies Secure/HttpOnly, CSRF, isolation, état des migrations, logs non sensibles et espace disque sur la cible autorisée.

Rollback applicatif exclusivement vers un binaire comprenant les états ABV/corbeille ; un ancien binaire ignorant deletedAt n'est pas admissible. Incident de données : arrêter les écritures concernées, restaurer d'abord sur cible isolée autorisée, contrôler relations/versions/sessions et mesurer la perte avant tout remplacement soumis à accord. Aucun down-migration destructif ou nettoyage physique.

## Suite prioritaire

Après confirmation de #38 et qualification de main : BB0 clos techniquement pour son périmètre, puis BB1 collaboration privée Alex/Maël. Ensuite batchs autonomes et inventaire manuel BB-INVENTAIRE-01 ; aucune recette ou production de batch ne modifie le stock. Objectif 30 octobre maintenu comme cible, pas comme garantie : la mise en service nécessite encore BB1–BB5 et l'autorisation OPS distincte.
