> Archive de la phase A validée comme base de travail le 16 octobre 2026. Les autorisations actuelles figurent dans ../roadmap.md ; les propositions de cette archive ne valent pas accord de développement. Les états et preuves sont ceux de l’audit, à revérifier.

# Barbook — audit qualité, sécurité et UX

Base et références S01–S13 : voir `01-Etat-et-cartographie.md`. Recontrôle GitHub le 16/10/2026 à 11:43 UTC : mêmes têtes, aucune PR ouverte.

## Lecture des sévérités

**Aucun BLOCKER exploitable ou cas de corruption n'a été démontré. Cela ne constitue pas une certification d'absence de faille.** Les P1 ci-dessous distinguent des défauts du code et des conditions indispensables avant une livraison. Les exigences de mise en production ne signifient pas que l'application est actuellement exposée ou compromise.

Le Review Gate de chaque future branche devra examiner la branche entière, son contexte et ses régressions. Le programme de correction de l'existant doit être approuvé et tracé ; on ne rassemble pas artificiellement tous les sujets dans une seule PR. Aucun défaut n'a été corrigé pendant cette phase.

## Registre des constats

### BB-A-001 — P1 — Le slug `new` rend une recette inaccessible dans l'interface

- **Preuve :** S03, `requireCocktailCreationSlug` accepte `New` et renvoie `new` ; S07 déclare `/cocktails/new` avant `/cocktails/:slug`. La sonde locale sur `toSlug` confirme `New → new`.
- **Reproduction à automatiser :** créer une recette valide appelée « New », puis suivre la redirection ou sa carte. Le routeur choisit le formulaire de création. La réponse HTTP et le navigateur n'ont pas été exécutés ici.
- **Impact :** recette persistable mais non consultable par son URL normale.
- **Correction :** réserver les segments de navigation lors de la génération des slugs, avec un traitement explicite des éventuels slugs historiques ; garder l'ID immuable comme identité. Ne pas interdire arbitrairement un nom de cocktail.
- **Acceptation :** nom « New » accepté et fiche accessible après création/rechargement ; pas de collision silencieuse ; vrai test routeur et HTTP.

### BB-A-002 — P1 — `mainAlcoholName: null` peut produire une erreur serveur

- **Preuve :** S03, DTO : `@IsOptional()` saute les validations d'une valeur null, le transform la conserve. Le service teste seulement `!== undefined`, force le type string et appelle `toSlug`. La sonde sur le helper avec null produit `TypeError: Cannot read properties of null (reading 'normalize')`.
- **Reproduction à automatiser :** envoyer un POST recette par ailleurs valide avec `mainAlcoholName: null`.
- **Impact :** entrée externe non maîtrisée, 500 évitable au lieu de la sémantique optionnelle/400. Aucun accès transverse n'est déduit de ce défaut.
- **Correction :** définir sans ambiguïté omission/null et les traiter à la frontière ; supprimer le cast qui masque le désaccord de type.
- **Acceptation :** omission et valeur valide passent ; null donne le comportement contractuellement choisi ; objets/tableaux/nombres sont rejetés en 400 ; aucun 500 pour cette matrice.

### BB-A-003 — P1 de livraison — La CI ne démontre ni la DB ni le parcours réel

- **Preuve :** S11 ne démarre pas PostgreSQL, ne lance pas les migrations et n'exécute pas `test:e2e`. Les tests de services utilisent un Prisma mocké. `backend/test/app.e2e-spec.ts` vérifie seulement Hello World et ne réutilise pas le bootstrap de production. Les tests Angular sont des tests unitaires sous environnement simulé, sans parcours navigateur complet.
- **Impact :** une mauvaise FK, un rollback incorrect, un contrat null invalide, un problème de routage ou un backfill cassé peuvent coexister avec une CI verte.
- **Correction :** PostgreSQL éphémère en CI, migrations depuis zéro et depuis fixture, tests HTTP avec configuration réelle, E2E navigateur ciblés.
- **Acceptation :** les cas hostiles cross-workspace échouent aussi directement en DB ; création persistée puis relue ; rollback réel ; organisation multiple testée ; parcours mobile de base en navigateur.

### BB-A-004 — P1 de livraison — Le résultat historique « zéro vulnérabilité » est périmé

Quatre commandes **réellement exécutées** le 16/10/2026, sans installation ni correction : `npm audit --package-lock-only --ignore-scripts --json`, puis la même avec `--omit=dev`, dans chaque package. Options réseau bornées et caches hors des sources. Les quatre sorties retournent 1 en raison des alertes, pas d'un échec de connexion.

| Lockfile / périmètre | Modérées | Élevées | Critiques | Total de paquets signalés |
|---|---:|---:|---:|---:|
| Backend complet | 2 | 34 | 2 | 38 |
| Backend `--omit=dev` | 0 | 3 | 1 | 4 |
| Frontend complet | 2 | 8 | 3 | 13 |
| Frontend `--omit=dev` | 0 | 1 | 0 | 1 |

Ces nombres incluent les propagations aux paquets parents : **38 paquets signalés ne signifient pas 38 failles indépendantes**, et le cumul frontend/backend ne décrit pas l'exposition du serveur. `--omit=dev` sur un lockfile n'est pas le SBOM d'une image finale.

| Sujet | Version résolue / provenance | Exposition réellement étayée | Traitement recommandé |
|---|---|---|---|
| `proxy-addr` | 2.0.7 via Express ; critique npm | L'avis vise certains sous-réseaux IPv6 de confiance mal formés. Le code Barbook utilise le nombre `1`, pas ce sous-réseau : exploitabilité de cet avis **non démontrée** | Mise à jour compatible testée avant exposition ; contrôler aussi l'accès direct à l'API |
| `multer` / platform-express | 2.2.0, alertes élevées | Aucun FileInterceptor, MulterModule ou endpoint multipart trouvé dans les sources courantes | Corriger avant d'introduire l'upload ; ne pas déclarer un endpoint inexistant exploitable |
| `fast-uri` | 3.1.6, notamment chaîne Prisma/AJV | Pas de traitement d'URL métier identifié ; installation de production réelle encore à inspecter | Mettre à jour la chaîne pertinente ; vérifier Prisma et le contenu de l'image |
| Angular router | 21.2.21 ; avis SSR | Application navigateur sans configuration SSR dans le dépôt : chemin serveur de l'avis absent | Patch compatible, validation build/tests ; ne pas convertir l'app en SSR |
| Piscina | 5.2.0, build Angular | Outillage ; l'avis exige une primitive de pollution de prototype préalable | Mettre à jour et isoler la CI ; pas de preuve de RCE par une recette Barbook |
| Handlebars | 4.7.9 via ts-jest | Outillage backend ; pas de templates Handlebars applicatifs trouvés | Triage des trois avis, mise à jour contrôlée ; ne pas passer aveuglément Jest en majeure |
| Braces/brace-expansion/js-yaml/undici et autres | Voir sorties JSON complètes | Principalement outils et transitives ; conditions différentes selon l'avis | Regrouper les mises à jour compatibles, tester les chemins concernés |

**Sources primaires consultées :** [proxy-addr](https://github.com/jshttp/proxy-addr/security/advisories/GHSA-jqcg-44mw-7w3h), [Angular SSR](https://github.com/angular/angular/security/advisories/GHSA-ff3f-86qr-9cv3), [Piscina](https://github.com/piscinajs/piscina/security/advisories/GHSA-67c8-pqhq-4rmx), [avis Handlebars](https://github.com/advisories/GHSA-xw65-4hp5-5hc7). Les autres liens GHSA sont conservés dans les résultats npm, sans affirmation de vérification manuelle de chaque advisory.

- **Acceptation :** nouveau triage daté ; versions patchées compatibles ; aucun avis élevé/critique laissé sans analyse d'applicabilité et décision explicite ; scan de l'image réellement livrée ; audit récurrent en CI. Aucun `npm audit fix --force`.

### BB-A-005 — P1 de mise en production — Déploiement et récupération non préparés dans le dépôt

- **Preuve :** Compose ne contient que PostgreSQL de développement ; pas de Dockerfile API, image de release, CD, reverse proxy prod versionné, readiness métier, sauvegarde ou restauration testée. GET `/api/` retourne Hello World.
- **Limite :** aucune inspection SSH ; il est impossible de déduire l'état réel du serveur de cette absence.
- **Correction :** inventaire serveur séparé, image reproductible, configuration validée, secrets hors Git, sauvegardes hors VPS, restauration et rollback exercés, publication contrôlée.
- **Acceptation :** déployer en staging depuis un SHA identifié, simuler une release défectueuse, restaurer dans une instance isolée, vérifier données + médias et documenter le temps observé. Accord production distinct obligatoire.

### BB-A-006 — P2 — Fenêtre de divergence entre EXPAND et double écriture

**Preuve :** S13 copie `folderId` dans une transaction, mais un ancien binaire peut continuer à modifier `folderId` après son commit et avant le déploiement de la double écriture. Le code de la branche n'effectue pas de reconciliation ultérieure. C'est un risque de séquence de déploiement, pas une migration observée en échec. Prévoir un rattrapage vérifiable ou une courte suspension d'écriture ; comparer les ensembles avant read switch. Test : modifier le legacy après EXPAND, puis vérifier que le rattrapage préserve cette modification.

### BB-A-007 — P2 — Ancien contrat incompatible avec de futures appartenances multiples

**Preuve :** le PUT de la branche efface les liens CocktailFolder puis recrée au plus un lien ; la FK `Cocktail.folderId` garde Restrict. L'utiliser après activation du multi-dossier effacerait les autres appartenances ; la suppression d'un dossier référencé reste bloquée par le legacy. **Aujourd'hui le multi-dossier n'est pas exposé**, donc ce n'est pas une perte déjà constatée. Prévoir protocole de compatibilité et retrait des anciens écrivains. Tests : vieux payload explicitement refusé ou traité selon un contrat sûr ; suppression d'un dossier conserve toutes les recettes et autres liens.

### BB-A-008 — P2 — Remplacement complet et écrasement d'une modification concurrente

**Preuve :** S05 sérialise les écritures de relations avec un UPDATE, sans version attendue. Deux onglets peuvent sauvegarder successivement deux états périmés ; le dernier gagne. L'UPDATE évite l'entrelacement des remplacements mais pas cette perte logique. Ajouter un compteur de version et une précondition lors de l'édition/organisation, sans généraliser Serializable partout. Accepter une dernière écriture gagnante seulement si ce choix est explicite. Test : deuxième écriture sur version ancienne retourne 409/412, garde le premier état et propose rechargement.

### BB-A-009 — P2 — Seed de démonstration susceptible d'écraser des données personnelles

**Preuve :** S12 upsert `daiquiri`, `negroni`, `espresso-martini`, met à jour les degrés catalogue, remplace recettes/tags et réconcilie certains anciens ingrédients dans le workspace sélectionné. Ce comportement est documenté ; il n'est pas un import sans perte. Le blocage repose sur `NODE_ENV=production`, dont l'absence ne prouve pas une DB de développement. Ne jamais utiliser le seed pour migrer la production. Préférer une fixture dédiée ou un mode create-only/confirmation explicite. Tester collisions de slugs et anciennes références dupliquées ; un échec doit rollback, sans nettoyage automatique.

### BB-A-010 — P2 — Session courte et perte de saisie

**Preuve :** JWT 15 min, aucun refresh ; formulaire uniquement en mémoire, aucun guard de sortie. Une création longue peut finir en 401 et redirection, sans restauration du formulaire. Renouvellement sécurisé et brouillon privé ou récupération transitoire à concevoir ensemble ; aucun simple allongement arbitraire de JWT. Tester expiration pendant saisie et pendant POST, sans resoumission automatique qui duplique la recette.

### BB-A-011 — P2 — Les petites quantités peuvent s'afficher à zéro

**Preuve :** S10 formate avec 2 décimales après ML/10. La sonde confirme `0.01 ML → 0 cl`, alors que la DB stocke 3 décimales ML. Préférer un affichage adaptatif mL/cL ou une précision qui préserve la valeur ; pas de modification des données. Tester minimum 0.001 ML, 0.01 ML, 22.5 ML, valeur maximale et unités non volumiques.

### BB-A-012 — P2 — Stockage navigateur bloqué insuffisamment toléré

**Preuve :** `core/auth/auth.service.ts` lit sessionStorage dans l'initialiseur sans try/catch ; dans ThemeService, l'obtention de `defaultView.localStorage` précède les blocs try autour de getItem/setItem. Un navigateur peut lever SecurityError sur le getter lui-même. Le comportement n'a pas été observé sur un navigateur ici. Encapsuler l'accès complet et proposer un repli mémoire. Tester getter qui lève, quota plein et méthodes qui lèvent.

### BB-A-013 — P2 — Les filtres mobiles prennent la place du catalogue

**Preuve :** S09, cinq contrôles avant les cartes, grille une colonne sous 640 px. Prévoir recherche toujours visible, bouton Filtres avec compteur actif, panneau repliable accessible et reset. Aucun chiffre de hauteur écran ou LCP mesuré n'est inventé. Acceptation : 390/430 px, zoom 200 %, clavier, filtres actifs conservés et recherche accessible dès l'arrivée.

### BB-A-014 — P2 — Placeholder lourd et absence de repli sur image cassée

**Preuve :** `frontend/public/placeholder-cocktail.png` : 3 186 525 octets ; S09/S10 utilisent `imageUrl || placeholder` sans événement d'erreur. Une URL non vide en 404 reste cassée. Même URL réutilisée : ne pas multiplier artificiellement ce poids par le nombre de cartes, le navigateur peut la mettre en cache. Optimiser le fichier et les dimensions, ajouter repli unique sans boucle. Vérifier l'image absente, interdite, corrompue et remplacée.

### BB-A-015 — P2 — Catalogues de classement non bornés

**Preuve :** GET folders/tags charge tous les éléments, puis des selects/listes de cases Angular. L'autocomplete ingrédients est en revanche borné à 8, ce qui est adapté. Prévoir recherche/pagination des dossiers/tags lorsque les volumes l'exigent, sans installer un moteur dédié. Test avec 1 000 tags/dossiers synthétiques et mesure réseau/temps de rendu ; pas de troncature silencieuse.

### BB-A-016 — P2 — Pagination et totaux pas forcément issus du même instant

**Preuve :** S04 lance count/findMany dans une transaction sans niveau d'isolation déclaré. Sous le Read Committed PostgreSQL par défaut, deux SELECT successifs peuvent voir des commits différents. Cela ne corrompt pas les données, mais peut désaccorder total et items sous écriture concurrente. Définir si une cohérence instantanée est réellement nécessaire ; sinon documenter et gérer une page devenue vide. Source : [PostgreSQL 16, isolation](https://www.postgresql.org/docs/16/transaction-iso.html). Test avec création/suppression concurrente.

### BB-A-017 — P2 — Message de conflit trop général sur toute erreur P2002

**Preuve :** S03 traduit tout P2002 de sa transaction en « cocktail du même nom ». Une concurrence sur une autre unicité n'a pas nécessairement ce sens. Le conflit a le bon statut général mais peut tromper le diagnostic. Les retries/deadlocks ne sont pas traités explicitement. Cibler la contrainte/contexte connu et garder les erreurs inattendues distinguables. Tester même ingrédient créé simultanément, mêmes slugs cocktail, ordre inversé de créations de tags ; ne pas affirmer qu'un deadlock a été reproduit ici.

### BB-A-018 — P2 — Effacer un ABV connu ne le rend pas inconnu

**Preuve :** S08, `mapIngredient` n'envoie un override que si currentAbv est non nul ; si un ingrédient catalogue à 40 est sélectionné puis le champ vidé, catalogueAbv reste 40. Backend : `abvOverride ?? defaultAbv` hérite encore de 40. La documentation du formulaire annonce « vide → inconnu ». Décider si l'on veut permettre un inconnu explicite sur une ligne ou afficher clairement « hérite du catalogue ». Ne pas confondre null et 0 ni modifier le catalogue. Tests de la matrice héritage/override/0/inconnu.

### BB-A-019 — P2 — Documents périmés et absence de handoff canonique

**Preuve :** ADR 0002 et maintenance/auth annoncent encore un rate limiting futur ; maintenance/backend annonce recherche/organisation futures ; README racine échappe des titres et laisse un bloc ouvert ; README backend reste le template Nest. Aucun `docs/project/agent-handoff.md` actuel. Actualiser avec les comportements réels, différencier état historique et norme, et créer les fichiers de pilotage seulement en phase B. Critère : reprise possible uniquement avec dépôt + handoff, sans mémoire conversationnelle.

### BB-A-020 — P2 — Hygiène des archives publiques

**Preuve :** `archive/legacy-project` suit une configuration d'environnement, des node_modules et des sorties de compilation. Les valeurs de configuration n'ont pas été recopiées dans les livrables ; leur examen limité évoque des paramètres locaux, pas un secret de production démontré. Le scan courant de trois formats évidents de secrets ne trouve rien dans `main`, mais ce n'est pas un scan complet de l'historique. Prévoir inventaire spécialisé des secrets/historique et rotation **si** une vraie valeur sensible est identifiée. Pas de suppression d'archives, de purge d'historique ni de force-push sans autorisation distincte.

### BB-A-021 — P2 — Validation de configuration et protections HTTP incomplètes

**Preuve :** `main.ts` valide PORT, AuthModule exige un secret d'au moins 32 caractères, Prisma exige la présence de variables. Pas de validation centralisée des valeurs connues de démonstration, de l'origine/host/port DB ou du profil production ; pas de Helmet/CSP applicatif trouvé. Des headers Nginx peuvent exister : **inconnu**, pas « absents du serveur ». Définir un schéma de configuration, un unique point de politique headers et une topologie proxy sûre ; tester l'échec au démarrage plutôt qu'une panne tardive.

### BB-A-022 — P2 — Limites de l'ABV peu visibles dans la fiche

**Preuve :** S04 ignore les mesures non ML, les garnitures et la dilution ; le template affiche seulement « Degré estimé ». Les conventions le documentent correctement. Afficher « estimation avant dilution », et signaler calcul partiel/inconnu selon une politique approuvée. Aucun degré exact ou statut réglementaire « sans alcool » ne doit être déduit d'une valeur inconnue. Tester TOP_UP, ABV null vs 0 et alcool en DASH.

### BB-A-023 — P2 — Page entière sans borne supérieure

**Preuve :** ListCocktailsQueryDto impose page >=1 et pageSize <=100, mais pas une borne sûre pour le produit `(page-1)*pageSize`. Des entiers très grands peuvent atteindre une limite Prisma/DB ou perdre en précision JS ; le 500 n'a pas été exécuté ici. Ajouter une borne cohérente et une politique de page hors catalogue. Test HTTP avec nombre très grand, entier non sûr, zéro, décimal et page passée vide après concurrence.

### BB-A-024 — P2 — Validation visuelle à compléter pour l'accessibilité

**Preuve :** les labels, focus-visible, combobox/aria-activedescendant et plusieurs alertes sont présents. Les messages du formulaire ne sont pas systématiquement associés aux champs par aria-describedby/aria-invalid ; pas de gestion explicite du focus au premier invalide ou de lien d'évitement dans le shell. Ce n'est pas un résultat d'audit WCAG complet. Ajouter les liens sémantiques, préserver le pattern combobox existant, tester clavier, lecteur d'écran, zoom et contrastes sur les trois thèmes.

## Synthèse des garanties déjà bien conçues

JWT avec algorithme/issuer/audience explicites ; Argon2id ; identité serveur sans workspace arbitraire du client ; ValidationPipe strict ; transactions de création ; Decimal et CHECK SQL ; FK composites ; requêtes scopées ; 404 de ressource non visible ; sélection de champs excluant les hashes ; requêtes Prisma sans concaténation SQL dangereuse trouvée ; compte de suggestions borné ; actions CI épinglées ; permissions CI minimales ; checks requis sur main. Ces choix sont à préserver.

## Vérifications restant nécessaires avant de fermer les constats

Lancer les suites sur une copie de travail autorisée et équipée ; DB PostgreSQL de test distincte ; bootstrap HTTP partagé ; fixtures de migrations ; deux utilisateurs et plusieurs workspaces hostiles ; courses concurrentes ; navigateur mobile réel/émulé ; audit final des dépendances installées et de l'image ; inventaire VPS et exercice de restauration. Aucun de ces résultats manquants n'est remplacé par un statut « DONE ».
