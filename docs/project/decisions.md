# Décisions Barbook

## Autorisations établies le 16 octobre 2026

- Phase A validée comme base, lots L0–L2 approuvés ; décisions techniques ordinaires, branches, commits atomiques, push et PR dans ce périmètre autorisés.
- Merges, migrations destructives, décisions métier structurantes et production conservés par Alex ; aucun accès ni déploiement VPS demandé par ces lots.
- Suspension initiale des dossiers levée le 19 octobre après intégration L0–L2 ; branche et trois commits conservés sans réécriture.
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

**À décider :** autorisation des lots après L3 et politique de merge des phases suivantes. Branches/commits/push/PR de L0–L3 sont autorisés ; seuls les merges #20–#23 ont reçu un accord et ont été exécutés. Tout merge suivant reste à valider. Phase B n'autorise jamais implicitement production, CONTRACT, suppression de données, réécriture d'historique ni coûts externes. L'accès en écriture a été prouvé après autorisation de phase B, puis recontrôlé le 19 octobre.


## Livraison courante et validations encore ouvertes

#20–#23 ont été mergées avec accord le 19 octobre et main qualifié ; [checkpoint-l3.md](checkpoint-l3.md) conserve les SHA/preuves. L3 B3a–B3c est développé et qualifié, Review Gate favorable à une PR. Son merge nécessite un accord distinct ; aucune décision D1–D8 n'est close par la CI.

Recommandation séparée : rendre requis PostgreSQL Integration, Browser Integration et Dependency Audit (backend/frontend), en gardant Backend Quality et Frontend Quality. Alternative : conserver les quatre supplémentaires informatifs ; ils ne bloquent alors pas un merge par le ruleset. Aucun changement de protection effectué. Un accord de merge L3 ne devra pas être interprété comme validation de ce ruleset.

Après L3, cadrer D1/D2 pour L4. D3/D4 concernent la collaboration, D5 le cycle de recette/rétention, D6 les médias et D7/D8 l'exploitation/livraison. Ni CONTRACT ni accès/migration/déploiement de propriétaire/VPS autorisés. Les choix techniques ordinaires des dossiers sont documentés dans l3-design.md ; ils ne décident pas de ces politiques métier.

## Validation du propriétaire — 19 octobre 2026, après checkpoint L0–L2

Réponse « je valide » à la demande explicite de validation des quatre merges et de la reprise L3 : intégration #20 → #21 → #22 → #23, mises à jour de branches sans réécriture, Review Gates/CI et reprise de la branche dossiers existante selon B3a–B3c autorisées. WORK reprend seul ; aucune autre session d'écriture annoncée. Le périmètre inclut les migrations additives de test et les choix techniques courants nécessaires aux dossiers.

Cette validation n'active pas les nouveaux checks requis, ne ferme pas D1–D8, n'autorise ni CONTRACT, ni migration destructive, ni application de migration/déploiement sur une instance propriétaire/VPS. La PR L3 sera proposée après Review Gate ; son merge reste à validation distincte.
