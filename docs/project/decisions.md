# Décisions Barbook

## Autorisations établies le 16 octobre 2026

- Phase A validée comme base, lots L0–L2 approuvés ; décisions techniques ordinaires, branches, commits atomiques, push et PR dans ce périmètre autorisés.
- Merges, migrations destructives, décisions métier structurantes et production conservés par Alex ; aucun accès ni déploiement VPS demandé par ces lots.
- Branche dossiers préservée et temporairement suspendue. Reprise L3 à présenter après L2.
- Responsable actif : WORK dans cette conversation, sur demande d'Alex ; tout transfert vers Chat classique exige l'arrêt de l'écrivain précédent et le contrôle GitHub.

## Choix techniques ordinaires L0

Le pilotage canonique est docs/project/ ; les cinq chapitres d'audit sont archivés sans les documents normatifs privés ni secrets. Le catalogue conserve 66 fiches, avec autorisation partielle explicite pour la qualité et le pilotage. Les mises à jour de branche passent par les API Git GitHub avec parent vérifié, publication non forcée et contrôle de la ref ; un clone ordinaire sert aux diffs et tests. Ce mécanisme remplace le transport CLI non authentifié, sans contourner les protections GitHub.

## D1 à D8 — toujours ouvertes

Ces recommandations restent à soumettre au moment où elles deviennent nécessaires. Les garde-fous de merge et de production ci-dessus sont déjà imposés pour L0–L2 ; ils ne ferment pas la discussion D8 pour les phases suivantes.

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

**À décider :** autorisation de nouveaux lots après L2 et politique de merge des phases suivantes. L0–L2, branches/commits/push/PR sont déjà autorisés ; tous les merges restent à valider. Phase B n'autorise jamais implicitement production, CONTRACT, suppression de données, réécriture d'historique ni coûts externes. L'accès en écriture a été prouvé après autorisation de phase B, puis recontrôlé le 19 octobre.


## Décisions de livraison à soumettre après L2

Recommandation : valider les PR #20 à #23 dans cet ordre, actualiser et requalifier chaque branche après changement de main, puis vérifier l'ensemble intégré avant toute reprise L3. Alternative : demander des modifications ciblées ou conserver provisoirement les PR ouvertes ; main reste inchangé. Aucun merge n'a été exécuté.

Recommandation séparée : après intégration et qualification des workflows, rendre requis PostgreSQL Integration, Browser Integration et Dependency Audit (backend/frontend), en gardant Backend Quality et Frontend Quality. Alternative : laisser provisoirement les checks supplémentaires informatifs ; ils ne bloqueraient alors pas un merge via le ruleset, même s'ils échouent. Aucun changement de protection effectué ici.

L3 : reprise de la branche dossiers conservée, selon checkpoint-l0-l2.md, sans renommer l'EXPAND partagé et avec tests des deux ordres de migration. Cette proposition n'autorise pas le lot, sa fusion ni CONTRACT. D1–D8 ne sont pas fermées par les résultats de tests L0–L2.
