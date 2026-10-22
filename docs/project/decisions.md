# Décisions Barbook

## Autorisations établies le 16 octobre 2026

- Phase A validée comme base, lots L0–L2 approuvés ; décisions techniques ordinaires, branches, commits atomiques, push et PR dans ce périmètre autorisés.
- Merges, migrations destructives, décisions métier structurantes et production conservés par Alex ; aucun accès ni déploiement VPS demandé par ces lots.
- Suspension initiale des dossiers levée le 19 octobre après intégration L0–L2 ; branche et trois commits conservés sans réécriture.
- Responsable actif : WORK dans cette conversation, sur demande d'Alex ; tout transfert vers Chat classique exige l'arrêt de l'écrivain précédent et le contrôle GitHub.

## Choix techniques ordinaires L0

Le pilotage canonique est docs/project/ ; les cinq chapitres d'audit sont archivés sans les documents normatifs privés ni secrets. Le catalogue conserve 66 fiches, avec autorisation partielle explicite pour la qualité et le pilotage. Les mises à jour de branche passent par les API Git GitHub avec parent vérifié, publication non forcée et contrôle de la ref ; un clone ordinaire sert aux diffs et tests. Ce mécanisme remplace le transport CLI non authentifié, sans contourner les protections GitHub.

## D1/D2 validées pour L4 ; D3 à D8 ouvertes dans leurs limites

Le 20 octobre 2026, Alex valide explicitement D1a/D1b/D2a/D2b/D2c et autorise L4, six blocs du [design L4](l4-design.md). Les recommandations D3–D8 restent à soumettre au moment utile ; les garde-fous déjà imposés restent applicables. L'accord de phase A n'approuve pas tout le catalogue.

### D1 — Audience et périmètre du premier lancement — VALIDÉ

**D1a : bêta privée.** Admission contrôlée côté serveur, fermée par défaut, liste explicite d'emails autorisés hors Git. Le frontend ne peut pas ouvrir les inscriptions. Pas de suppression implicite des comptes existants. Avant ouverture publique : réexaminer inscription publique, vérification email, récupération d'accès et protections d'abus.

**D1b : édition et récupération incluses en V1.** La suppression de recette sera une corbeille récupérable ; durée et règles restent à valider en D5. Cette décision produit n'autorise ni L5 ni son code dans L4.

### D2 — Sessions et brouillons — VALIDÉ

**D2a : session opaque PostgreSQL**, révocable ; cookie HttpOnly et Secure en production ; CSRF serveur effectif, expiration, révocation et protection contre fixation. L'ADR 0005 remplace la cible JWT/refresh de l'ADR 0002. B4a prépare sans activer ; l'auth JWT actuelle ne sera retirée qu'avec la bascule API/Angular B4b.

**D2b :** standard = **2 heures d'inactivité / 12 heures absolues** ; option « Rester connecté » non précochée = **7 jours / 30 jours**. Déconnexion volontaire = révocation serveur réelle. Tests requis appareil partagé, onglets, replay, expiration et concurrence. Ces durées remplacent la recommandation initiale standard 30 minutes.

**D2c :** mémoire + **sessionStorage, 24 heures maximum**, liés strictement utilisateur/workspace/recette, restauration explicite après refresh ou reconnexion du même compte. Aucune restauration croisée ; purge appropriée au logout volontaire et changement de compte ; aucun secret ; pas de resoumission automatique ; version serveur plus récente protégée. Stockage bloqué = repli mémoire honnête. Sauvegarde serveur future non incluse. Ce choix remplace la recommandation initiale mémoire seule du cadrage.

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

**À décider :** autorisation des lots après L4 et politique future de merge. Branches/commits/push/PR de L0–L4 sont autorisés ; les merges #20–#24 ont reçu un accord et ont été exécutés. Le merge #25 a été autorisé et exécuté le 20 octobre ; chaque merge L4 ou suivant exige encore un accord distinct. Phase B n'autorise jamais implicitement production, CONTRACT, suppression de données, réécriture d'historique ni coûts externes. L'accès en écriture a été prouvé après autorisation de phase B, puis recontrôlé le 19 octobre.


## Livraison courante et validations encore ouvertes

#20–#25 sont mergées après accords explicites. Main vérifié le 20 octobre : `c99b08052e2e1494f621c7de8a7fb0831516bd1e`, six checks success. #25 est documentaire (huit fichiers), fusionnée à 08:53:33 UTC. L3 B3a–B3c est intégré, pas CONTRACT ; branche dossiers conservée à 95e21bc. L4 est autorisé sur `feature/secure-web-sessions` depuis ce main, avec migrations uniquement en environnements jetables de test. Aucun merge L4 autorisé.

Recommandation séparée toujours ouverte : rendre requis PostgreSQL Integration, Browser Integration et Dependency Audit backend/frontend, en gardant les deux Quality. Le ruleset actuel reste inchangé ; aucune modification de protection n'est approuvée.

D3/D4 concernent la collaboration, D5 la corbeille/rétention, D6 les médias, D7/D8 l'exploitation/livraison. Aucun L5/CONTRACT, accès/migration propriétaire, changement d'infrastructure, coût tiers ou déploiement n'est autorisé. Le protocole Work↔Chat reste obligatoire, un seul écrivain, source de vérité GitHub.

## Validation du propriétaire — 19 octobre 2026, après checkpoint L0–L2

Réponse « je valide » à la demande explicite de validation des quatre merges et de la reprise L3 : intégration #20 → #21 → #22 → #23, mises à jour de branches sans réécriture, Review Gates/CI et reprise de la branche dossiers existante selon B3a–B3c autorisées. WORK reprend seul ; aucune autre session d'écriture annoncée. Le périmètre inclut les migrations additives de test et les choix techniques courants nécessaires aux dossiers.

Cette validation n'active pas les nouveaux checks requis, ne ferme pas D1–D8, n'autorise ni CONTRACT, ni migration destructive, ni application de migration/déploiement sur une instance propriétaire/VPS. La PR L3 sera proposée après Review Gate ; son merge reste à validation distincte.

## Validation du propriétaire — merge #24

Après la demande explicite de validation de la PR #24, Alex répond « je l’autorise » le 19 octobre 2026. Accord exécuté pour cette PR uniquement, en merge commit avec SHA attendu 95e21bc ; merged_at=14:08:14 UTC et main d7ea95f/six checks verts vérifiés. Aucune extension implicite aux merges documentaires suivants, L4, D1–D8, règles de protection, CONTRACT ou production. La branche dossiers reste conservée. La présente mise à jour est proposée par branche/PR ; aucune écriture directe de documentation dans main.

## Validation du propriétaire — 20 octobre 2026, L4

Après vérification indépendante de #24/#25, Alex valide les choix détaillés D1/D2 ci-dessus et autorise L4 seulement, ses six blocs, les décisions techniques ordinaires, branches/commits/push/checkpoints/tests/Review Gates/PR et migrations sur bases de développement jetables. WORK reprend cette tranche ; aucun travail Chat classique concurrent n'est annoncé. Chaque PR reste à valider avant merge. Ni l'édition/corbeille L5, ni le CONTRACT, ni base personnelle/production, infrastructure ou déploiement ne sont autorisés.

## Autorisation et vérification du merge #26 — 20 octobre 2026

Alex autorise explicitement #26 et la poursuite des blocs L4 déjà approuvés, en commençant par B4b ; chaque nouvelle PR reste à validation distincte. Merge commit76f742bc7de437fe7ed1d6528344be208d54159d confirmé, mergedAt11:06:17UTC (13:06Paris), parentsc99b080/4c97d89 et arbre identique au head revu. Avant merge :26blobs/diff/quatre commits et douze checks push+PR success, aucune discussion, mergeable/clean. Après : six checks main success, logs168/131/88/4/sept migrations/audits zéro relus. Toutes les branches historiques conservées.

B4b sur feature/web-session-cutover depuis ce main ; Design Review dédiée. Aucun autre merge, L5, CONTRACT, migration personnelle/production, changement d'infrastructure ou déploiement autorisé.

## Autorisation et merge #27 — 21 octobre 2026

Alex autorise explicitement #27 uniquement et la suite des blocs L4, à commencer par B4c. Merge90d9356 confirmé à07:39:25UTC ; parents76f742b/1e52381 et arbre conformes, six checks main success et logs213/138/111/4 relus. Branches historiques conservées. B4c démarre sur feature/private-beta-admission ; [design](l4-b4c-design.md). Chaque nouveau merge reste distinct ; aucun L5/CONTRACT/base propriétaire/infrastructure/production.

## Autorisation et merge #28 — 21 octobre 2026

Alex autorise explicitement #28 uniquement, puis B4d dans L4 déjà validé. Merge commit0c4a5580f3fe7d8e71c83c0434aadc3ce46d1e73 confirmé, mergedAt2026-10-21T11:05:03Z (13:05:03Paris), parents90d9356/f44306a et arbre42fe8ccac17771d1e8367f276bf622ecfd63c557 conforme au HEAD revu. Main à ce merge, six checks post-merge success et logs232backend/147frontend/118PG-HTTP/4Chromium relus. Toutes les branches historiques conservées.

B4d développé sur feature/session-drafts ; [conception préventive](l4-b4d-design.md). Pas de nouvelle décision produit ni de merge implicite. B4e/B4f restent distincts ; logout global après réauthentification reste à livrer. Aucune base personnelle/production, infrastructure, migration nouvelle, déploiement, CONTRACT ou L5.


## 22octobre2026 — autorisation #29 appliquée, B4e/B4f dans L4

Alex a autorisé #29 uniquement puis les blocs B4e et B4f déjà validés. Merge de86dd0 confirmé, parents0c4a558/7d79500, mergedAt2026-10-21T13:15:45Z, main et six contrôles post-merge qualifiés, branches historiques conservées. Aucune autorisation de merge futur.

B4e applique ADR0005 : password courant + cookie encore autoritaire, verrou User avant Session, pas de résurrection ni annulation rétroactive des requêtes autorisées. Confirmation volontaire purge locale annoncée même si réauthentification/réseau échoue ; global ne se dégrade jamais silencieusement en logout simple. Notifications ciblées par empreinte du CSRF précédent, revalidation masquée du document à sa reprise. Aucun droit donné au storage ou BroadcastChannel. La qualification réelle et ses limites sont dans l4-b4f-qualification.md ; pas de clôture anticipée avant six contrôles/Review Gate. Aucun nouveau choix produit/coût/infra, migration propriétaire, CONTRACT, L5 ou déploiement.
