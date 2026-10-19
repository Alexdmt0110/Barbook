> Archive de la phase A validée comme base de travail le 16 octobre 2026. Les autorisations actuelles figurent dans ../roadmap.md ; les propositions de cette archive ne valent pas accord de développement. Les états et preuves sont ceux de l’audit, à revérifier.

# Barbook — roadmap recommandée et décisions

Tous les lots sont **proposés, non autorisés**. La phase A ne vaut aucune autorisation de développement, migration, merge ou déploiement. Les fiches détaillées et critères d'acceptation figurent au chapitre 03 ; les conditions transverses au chapitre 04.

## 1. Périmètre de version conseillé

| Jalon | Résultat utilisable | Périmètre recommandé |
|---|---|---|
| V1 bêta privée | Un carnet de recettes fiable, utilisable sur téléphone, récupérable et déployable | Comptes/sessions, catalogue/création/détail, édition, suppression récupérable selon D5, dossiers multiples complets, tags de base, recherche/filtres/pagination, photos privées, accessibilité, CI/DB/E2E, sauvegardes et déploiement contrôlé |
| V1.1 | Un outil réellement pratique pour préparer et servir | Mode service, portions/batch/prébatch, fiches imprimables, duplication, catalogue ingrédient gérable, tags corrigibles, export/import, récupération d'accès et profil ; disponibilité qualitative/favoris si valeur confirmée |
| V2 | Une référence d'équipe et une exploitation mesurée | Workspaces/invitations/droits, copie indépendante, journal, versions si nécessaires, cartes/partage choisi, produits/coûts puis stock/inventaire et préparation réelle |
| Long terme | Capacités fondées sur un besoin terrain prouvé | Offline/PWA, langues, connecteurs, IA et mobile natif après étude/coût/confidentialité |
| OUT | Aucun développement dans le programme proposé | Caisse, paiement, TPE/POS, marketplace sociale, microservices/Kubernetes, synchronisation implicite entre espaces, renommage du produit |

L'édition et la récupération sont proposées dans la V1 parce qu'un carnet où l'on ne peut pas corriger une recette ni revenir d'une erreur reste fragile. C'est une extension du périmètre historique à valider, pas une décision considérée acquise. À l'inverse, les dossiers multiples et les images restent des fonctions V1, conformément au mandat ; ils ne sont pas repoussés pour donner une impression de fin rapide.

Une ouverture publique autonome rend F004 (récupération/vérification des accès) et une politique complète d'inscription/abus prioritaires avant cette ouverture. La bêta privée ne dispense pas de confidentialité, sécurité, sauvegardes ou droit de récupération des données ; elle réduit surtout le périmètre opérationnel initial.

## 2. Ordre de développement proposé

L'effort est relatif : S/M/L/XL selon le chapitre 03. Aucune date de fin n'est promise avant accès écriture, choix structurants et qualification du serveur. Un lot peut nécessiter plusieurs branches et PR cohérentes ; jamais une branche géante couvrant toute la V1.

| Lot | Résultat et fiches | Dépendances | Risque / effort | Gate de sortie |
|---|---|---|---|---|
| L0 — Reprise durable | Accès, propriétaire actif, docs/project canonique, backlog, décisions et handoff (F060) | Validation phase A ; capacité de push réelle | Faible / S | SHA vérifiés, une seule session responsable, docs sans secrets poussées et lues sur GitHub |
| L1 — Défauts et dépendances | A001/A002, triage A004 ; bornes/null et parcours cassé | L0 ; plan de statut de la branche active | Moyen / M–L | Régressions testées ; audit daté ; pas d'avis exploitable connu sans traitement/acceptation explicite |
| L2 — Preuves d'intégrité | PostgreSQL CI, bootstrap HTTP, tests hostiles et E2E critiques existants (F057) | L0 ; données synthétiques | Élevé / L | Installation vierge/fixtures, rollback, FK cross-workspace et vrais parcours verts |
| L3 — Dossiers complets | Reprendre **feature/cocktail-folder-management**, F023/F024, tags de base et filtres compatibles | L1/L2 ; état DB connu dans l'environnement concerné | Élevé / XL en sous-blocs | Multi-dossiers sur fiche + pages dossiers + actions locales + tests ; aucun ancien écrivain dangereux ; CONTRACT encore séparé |
| L4 — Sessions et saisie sûre | F001–F003/F051, correction stockage et expiration | D1/D2, L2 | Élevé / L | Connexion/logout/expiration/reprise et CSRF/auth média selon option ; pas de perte de brouillon ni de fuite entre comptes |
| L5 — Cycle complet recette | F015/F016, quantités/ABV F019/F020/F029 | D5, L2 ; versioning optimiste déjà partagé avec organisation | Élevé / L | Création→édition→suppression→restauration avec droits et conflits testés |
| L6 — Photos privées | F033/F034, placeholder/fallback | D2/D6, L4/L5 | Élevé / L | Upload mobile, contrôles fichier, lecture privée, remplacement, persistance et cleanup exercés |
| L7 — Qualification V1 | F013/F026/F049/F050/F052 ; docs exactes | L3–L6 | Moyen / L | Parcours complets, mobile/zoom/clavier, budgets mesurés, erreurs et frontières ; zéro BLOCKER/P1 du jalon |
| L8 — Release et exploitation | F055/F056/F058, inventaire VPS et staging, release candidate | D7/D8, L7 ; accès infra adéquat | Élevé / XL en sous-lots | Image démarrée, migration compatible, restore et rollback testés ; production seulement après accord distinct |
| L9 — Ergonomie et préparation | F017/F025/F028/F035–F039/F042 ; F004/F005 selon audience | V1 stable ; choix V1.1 approuvés | Moyen / plusieurs M/L | Batchs exacts et arrondis, fiches, gestion catalogue, portabilité ; tests dédiés |
| L10 — Collaboration | F008–F012, puis versions/cartes | D3/D4, sessions et contrats stables | Élevé / XL | Matrice complète autorisations/révocations, copie sans FK transverse, dernier owner protégé |
| L11 — Exploitation | Produits F030 → coûts F043/F044 → stock F045/F046 → préparation/achats | L10 ; règles unités/prix/stock approuvées | Élevé / XL par domaine | Ledger idempotent et concurrent, prix complets/sourcés, audit et récupération |

**Chemin critique V1 :** accès/pilotage → défauts et tests réels → dossiers + sessions → édition/récupération et médias → qualification → restauration/staging → autorisation de production. L1/L2 sont des remédiations du socle ; elles ne doivent pas devenir le prétexte à ouvrir une nouvelle implémentation concurrente des dossiers.

La branche dossiers peut être classée temporairement `SUSPENDUE_POUR_REMEDIATION_DU_SOCLE` au L0, avec SHA et prochain bloc exacts. Elle est conservée. Les branches de correctifs/tests partent de main propre et actualisé ; après intégration autorisée, main est **fusionnée sans réécriture** dans la branche dossiers si nécessaire. Aucune deuxième branche de la même fonctionnalité, aucun rebase forcé de l'historique poussé. Ce statut documentaire doit être approuvé avec le plan avant exécution.

## 3. Premier découpage exécutable après accord

| Bloc | Branche proposée / existante | Changement limité | Tests et preuve | Arrêt |
|---|---|---|---|---|
| B0 | `docs/project-pilotage` proposée | Enregistrer le plan approuvé, décisions et handoff, sans recopier les documents privés | Relecture, cohérence IDs/SHA, secret scan, commit/push et lecture du commit distant | Si push impossible : pas de code non sauvegardable |
| B1a | `fix/cocktail-creation-boundaries` proposée | Null de mainAlcoholName, slug réservé et tests de régression | DTO + règle + service, routeur/HTTP selon moyens ; verify des deux côtés | Toute ambiguïté du contrat ou donnée historique nécessitant traitement non validé |
| B1b | `hardening/runtime-dependencies` proposée | Plus petite correction compatible des chaînes runtime signalées | Audit complet/prod, Prisma generate/validate, build/tests et arbre final | Pas de fix --force ou changement majeur non analysé |
| B1c | `hardening/toolchain-dependencies` proposée | Paquets de build/test signalés et documentation des exceptions | CI complète, overrides justifiés, scan image après packaging | Coût/major nécessitant plan de migration |
| B2a | `test/critical-persistence-flows` proposée | DB éphémère, migrations/fixtures et vrais tests transactionnels | Succès normal + FK/uniqueness/rollback/concurrence | DB non éphémère ou risque de reset d'une instance réelle |
| B2b | `test/critical-browser-flows` proposée | Parcours critiques, config bootstrap partagée et traces d'échec | Login/création/relecture/classement/expiration mobile | Échec reproductible = diagnostic, pas test désactivé |
| B3a | Branche dossiers **existante** | Vérifier l'état réel des migrations ; contrat folders[], lectures et filtre | Migration vierge/upgrade, parity legacy, tests HTTP et isolation | Instance inconnue ; ancien écrivain encore actif |
| B3b | Même branche, commit(s) séparés | Multi-sélection fiche et page liste/ouverture/création de dossier | Tests UI, chargements/vide/erreur, clavier/mobile | Contrats non compatibles |
| B3c | Même branche, commit(s) séparés | Ajouts/retraits locaux, renommage, suppression sans perte | DB/retry/concurrence et vrais parcours | FK legacy Restrict non maîtrisée |
| B3d | Branche/migration CONTRACT distincte, à décider | Retirer l'ancien champ uniquement après compatibilité prouvée | Audit des usages, backup/restore, migration testée | **Accord destructif spécifique obligatoire** |

Ce tableau fixe un ordre de travail, pas des commits artificiellement cassés. Chaque bloc cohérent : revue préventive, tests, commit Conventional Commit, push immédiatement, Checkpoint GitHub. Après tout correctif BLOCKER/P1 de la branche, refaire la review de **toute la branche contre sa base**, puis seulement PR structurée et lecture de son vrai diff. Les rubriques de PR restent Summary, Changes, Tests, Security, Infrastructure / OPS, Documentation, Known limitations.

## 4. Matrice valeur / risque / dépendances

| Ensemble | Valeur | Risque principal | Pourquoi maintenant / plus tard |
|---|---|---|---|
| Création/détail/édition | Très forte | Perte de travail, validation, mauvaise dose | Base indispensable du carnet |
| Dossiers multiples | Très forte, besoin explicite | Backfill/anciens contrats/concurrence | Terminer le travail existant, sans suppression prématurée |
| Sessions/médias privés | Forte | Fuite de données, session interrompue | Ensemble cohérent avant usage durable/public |
| CI/DB/restore | Très forte | Faux green, migration non récupérable | Condition de confiance pour toutes les fonctionnalités |
| Batch/mode service/PDF | Forte pour usage bar | Calculs et incertitudes | V1.1 après fiabilité du carnet ; différenciation utile |
| Collaboration | Forte si équipe réelle | Autorisations, dernier owner, copie | V2, après validation du modèle de gouvernance |
| Coûts/stock/achats | Forte si produits/prix fiables | Exactitude, double mouvement, concurrence | Après référentiel produit et vrai workflow d'utilisation |
| IA/PWA/natif | Conditionnelle | Confidentialité, coûts, maintenance/cache | Étude après preuve d'un gain terrain |
| POS/paiements | Incertaine sans fournisseur | Domaine légal/monétaire et disponibilité | Hors programme actuel, mission séparée |

## 5. Décisions structurantes à valider

Les recommandations ci-dessous sont **des propositions**, aucune n'est considérée acceptée par absence de réponse. Le reste des choix techniques ordinaires peut être tranché dans le cadre approuvé.

### D1 — Audience et périmètre du premier lancement

**Recommandation :** V1 bêta privée pour Alex et un petit groupe de comptes autorisés, sans publication publique de recettes ni inscription anonyme ouverte. Valider l'ajout de l'édition et de la récupération à la V1 historique. Alternative : ouverture publique autonome, qui impose dès le départ récupération d'accès/email, politique d'abus et davantage d'exploitation.

**À décider :** bêta privée ou public dès V1 ; édition/suppression récupérable incluses ou livrées juste après dans une V1.1 explicitement limitée.

### D2 — Stratégie de session web

**Recommandation :** cookie de session opaque HttpOnly/Secure pour Angular+API même origine, sessions serveur révocables ; définir durée inactive/absolue et comportement appareil partagé. Alternative cohérente avec la piste ADR : JWT en mémoire + refresh rotatif HttpOnly, avec davantage de gestion client et un accès média spécifique.

**À décider :** option de session ; connexion persistante souhaitée ou fin de session navigateur ; récupération de saisie après expiration. L'actuel JWT sessionStorage reste un état historique, pas une cible durable approuvée.

### D3 — Propriété et copie entre espaces

**Recommandation :** un cocktail appartient à un seul workspace ; import personnel→partagé crée une copie indépendante ; création dans le partagé n'alimente pas le personnel ; pas de copie retour ni sync par défaut. Notes et photos choisies explicitement ; provenance informative.

**À décider :** confirmer cette règle ; éventuel besoin de copie inverse **explicite**, qui restera une fonction distincte. Cette décision n'oblige pas à développer la collaboration dans la V1.

### D4 — Pouvoirs d'une équipe

**Recommandation :** OWNER gère l'espace/membres/transfert/publication, MEMBER travaille sur les recettes selon périmètre validé. Ajouter un rôle lecture seule seulement si l'usage le nécessite. Aucun rôle global de support permettant de lire tous les carnets par défaut.

**À décider :** les membres peuvent-ils supprimer des recettes, modifier des prix, publier une carte ? Faut-il lecture seule ? Les contributions restent-elles à l'équipe au départ d'un membre (recommandé) ? Ce cadrage sera nécessaire avant L10, pas avant les correctifs V1.

### D5 — Suppression, récupération et rétention

**Recommandation :** suppression de recette vers une corbeille récupérable 30 jours, purge physique contrôlée ensuite ; archivage non destructif séparé si son utilité est confirmée. Dossier supprimé = liens retirés, recettes conservées. La fermeture de compte/espace nécessite son propre aperçu et traitement du dernier propriétaire.

**À décider :** durée de corbeille et politique média/export ; suppression immédiate éventuelle seulement avec accord explicite. Une politique de suppression doit aussi expliquer les délais des sauvegardes, sans promettre leur purge instantanée.

### D6 — Photos et visibilité

**Recommandation :** privées, une photo principale par recette en V1, JPEG/PNG/WebP, validation/décodage/recodage, volume persistant local au VPS et sauvegardé ; limites initiales proposées 8 Mio/25 MP puis redimensionnement. HEIC selon support testé ; pas de service externe payant par défaut.

**À décider :** photo principale unique suffisante ? Limite de stockage globale acceptable sur le VPS ? Toute visibilité publique ou stockage tiers exige une validation distincte avant activation.

### D7 — Exploitation, disponibilité et récupération

**Recommandation :** commencer par un VPS mono-instance contrôlé, objectif d'interruption minimale avec bascule légère si ressources suffisantes, sinon maintenance brève annoncée. Objectifs proposés pour bêta : RPO 24 h/RTO 4 h, sauvegardes chiffrées hors VPS et restauration exercée.

**À décider :** disponibilité réellement nécessaire pendant le service, perte maximale de données acceptable, délai de reprise, budget éventuel de sauvegarde hors machine/staging. La capacité actuelle du serveur doit être inventoriée avant tout choix définitif. Aucun coût ni service ajouté aujourd'hui.

### D8 — Étendue d'autonomie et validations de livraison

**Recommandation initiale :** autoriser les branches/commits/push des lots approuvés et les décisions techniques courantes ; garder le merge et la production à validation explicite tant que le pipeline n'a pas été éprouvé. Option ultérieure : préautoriser les merges non destructifs après Review Gate complet et CI verte, en merge commit, avec vérification mergedAt et main post-merge.

**À décider :** quels lots de phase B sont autorisés maintenant ; politique de merge automatique ou manuel ; phase B n'autorise jamais implicitement production, CONTRACT, suppression de données, réécriture d'historique ni coûts externes. Le droit d'écriture GitHub devra être disponible et vérifié sans test de mutation pendant cette phase A.

## 6. Statuts et traçabilité du backlog

`backlog.json` contient les 66 fiches, état observé, priorité/horizon/effort, critères, dépendances, risques, documentation/OPS et prochaine revue. Les branches proposées ne sont pas annoncées créées. La branche dossiers est la seule branche métier active identifiée ; PR actuelle : aucune. Les fiches futures ne deviennent ni IN_PROGRESS ni DONE parce qu'elles ont été écrites.

À partir de phase B : `PROPOSE → APPROUVE → EN_COURS → A_REVOIR → PR → MERGE → VERIFIE_DANS_ENVIRONNEMENT`, avec `BLOQUE`/`DIFFERE` explicites et liens SHA/PR/checks. Une fonctionnalité peut être mergée et rester non déployée ; distinguer ces états. Tous les tests non exécutés et migrations d'état inconnu restent visibles.

## 7. Portes de validation

- **Porte A :** audit et périmètre corrigés/validés par Alex ; décisions nécessaires aux premiers lots prises.
- **Porte B par branche :** design review, contrat et DB, tests réellement verts, pas de BLOCKER/P1 du Review Gate, P2 différés acceptés et tracés ; push/checkpoint ; PR relue sur GitHub.
- **Porte release :** parcours V1 complets, migrations compatibles, sécurité et images privées, docs, backup/restore et rollback exercés ; environnement/staging prouvé.
- **Porte production :** autorisation explicite sur release et plan concrets ; validation de l'inventaire serveur, secrets/réseau/DNS/TLS/sauvegardes concernés. Pas d'accord implicite issu d'un « continue » en phase A.

**Git :** aucun commit/push/PR/merge de l'audit. **VM :** aucune intervention. **SQL :** aucune migration/seed/reset. **Infra :** aucun changement.
