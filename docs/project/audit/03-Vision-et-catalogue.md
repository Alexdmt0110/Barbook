> Archive de la phase A validée comme base de travail le 16 octobre 2026. Les autorisations actuelles figurent dans ../roadmap.md ; les propositions de cette archive ne valent pas accord de développement. Les états et preuves sont ceux de l’audit, à revérifier.

# Barbook — vision produit et catalogue fonctionnel

**Proposition de conception, non approuvée et non implémentée.** Les états observés proviennent du chapitre 01 et les défauts du chapitre 02. Le catalogue couvre les domaines A–L du mandat ; il n'est pas un engagement à développer toutes les idées.

## Vision et frontières de produit

Barbook doit d'abord permettre de retrouver et reproduire une recette fiable sur téléphone, de la corriger, de l'organiser et de protéger ses données. Son potentiel distinctif vient ensuite du passage **recette → préparation → service → exploitation**, sans transformer immédiatement le carnet en ERP.

| Persona | Travail à accomplir | Résultat attendu |
|---|---|---|
| Amateur / créateur | Enregistrer, tester et retrouver ses recettes | Carnet personnel fiable, édition simple, classement et photos |
| Barman en service | Lire rapidement les bonnes quantités et étapes | Recherche mobile visible, mode service, unités non ambiguës |
| Responsable de carte | Préparer des batchs et une carte saisonnière | Calculs vérifiables, fiches, listes de préparation, versions publiées choisies |
| Équipe d'établissement | Partager une référence commune | Droits explicites, données séparées, copie personnelle vers partagé sans synchronisation implicite |
| Gérant | Comprendre coûts, achats et pertes | Modèle produit/conditionnement fiable avant tout calcul de marge ou stock |

Scénarios de référence : retrouver une recette pendant un service ; modifier une quantité sans toucher au catalogue ingrédient ; classer le même cocktail dans « À tester » et « Carte automne » ; préparer un litre de base et conserver les ajouts frais au service ; copier une création personnelle dans un espace d'équipe sans publier ses notes privées ; restaurer une recette après erreur.

Le succès V1 se mesure par la réussite des parcours et la récupération des données, pas par un nombre d'écrans. Les indicateurs futurs devront être collectés seulement si utiles et proportionnés : taux de création aboutie, recherches sans résultat, temps d'accès à une recette, erreurs techniques, exercices de restauration. Aucun chiffre d'usage réel n'est disponible aujourd'hui.

## Contrat commun à toutes les fiches

Les règles suivantes font partie de **chaque fiche**, sans être répétées à chaque ligne :

1. **Identité, validation et confidentialité.** Authentification serveur ; scope workspace ; lecture et écriture vérifiées séparément. Jamais de liaison transverse par simple ID. UUID syntaxiquement invalide → 400 ; ressource privée étrangère → réponse non révélatrice, généralement 404. Un 401 déclenche une récupération de session maîtrisée ; un 403 n'invalide pas une session valide. Textes bornés ; enums et nombres validés côté serveur ; aucune donnée sensible dans les logs.
2. **Contrats et erreurs.** Routes mentionnées ci-dessous = **propositions**, sauf mention de l'existant. Définir DTO/format de réponse, codes 400/401/403/404/409/412/413/415/429/5xx pertinents, exemples et compatibilité avant code. Documenter les champs absents, null et vides ; ne pas traduire aveuglément toute erreur Prisma en 400.
3. **UI complète.** Desktop et mobile, clavier, libellés, focus, chargement, vide, erreur/retry, confirmation et succès. Une action ne devient pas DONE parce que son endpoint existe. Aucun accès aux données privées via un cache public.
4. **Intégrité et concurrence.** Multi-écritures atomiques ; contraintes DB adaptées ; contrôle de version pour une édition destructive d'ensemble ; limites de lots ; idempotence sur les opérations rejouables. Une annulation du client ne prouve pas l'annulation d'une transaction serveur.
5. **Qualité.** Tests unitaires des règles ; intégration PostgreSQL pour contraintes/rollback/concurrence ; contrat HTTP ; parcours navigateur pour les usages critiques ; tests négatifs cross-workspace et droits révoqués. Pas de test qui se contente de reproduire un mock accommodant.
6. **Livraison.** Documentation métier/contrat/OPS mise à jour ; variables et sauvegardes évaluées ; migration/backfill/rollback si données touchées ; aucune migration de production implicite. Toute donnée existante est conservée tant que sa suppression n'est pas approuvée.

**Hypothèses de dimensionnement à valider, pas des quotas déjà imposés :** V1 testée avec 1 000 cocktails et 200 dossiers/tags par workspace ; qualification supplémentaire avec 10 000 recettes pour la V2. Listes principales paginées ; jamais une troncature invisible. Les tailles de lot et de média proposées restent configurables.

Effort indicatif de développement humain concentré, incluant tests/doc, hors attente d'accès ou décisions : XS <1 j ; S 1–2 j ; M 3–5 j ; L 6–10 j ; XL doit être redécoupé. Ce ne sont ni des dates ni une promesse de vitesse Work. La fiche marque son état **actuel**, la priorité concerne le travail **restant**.

MUST = nécessaire au jalon concerné ; SHOULD = forte valeur après stabilisation ; COULD = utile si validé ; LATER = découverte ultérieure ; OUT = exclu du programme proposé. Toute fiche future reste `PROPOSÉE_NON_VALIDÉE` dans le backlog.

## A. Comptes et sécurité

### BB-F-001 — Inscription et création atomique du carnet personnel

- **État observé :** implémentée sans test suffisant — S06, transaction mockée, CI historique.
- **Priorité / horizon / effort :** MUST | V1 | S.
- **Valeur / parcours :** une personne crée son compte sur mobile ou desktop et arrive dans un carnet vide avec une action de création claire.
- **Règles et cas limites :** email trim/minuscules, mot de passe 15–128, nom 2–80 après trim ; unicité sous concurrence ; compte et PERSONAL + OWNER réussissent ensemble. L'ouverture publique des inscriptions dépend de D1.
- **Données / API / droits :** conserver POST `/api/auth/register` et sa réponse minimale ; pas de workspace choisi par le client. Inscription fermée ou invitation expirée : réponse explicite sans créer de ligne partielle.
- **Qualité / concurrence / OPS :** test HTTP et DB réelle, panne à chaque étape, email concurrent ; rate limit ; configuration du mode d'inscription documentée.
- **Acceptation :** étant donné un email neuf, quand l'inscription réussit, alors un seul carnet personnel et membership OWNER existent ; étant donné deux demandes concurrentes, alors un seul compte est créé et l'autre reçoit 409.
- **Dépendances / exclusions :** F057 ; D1 ; pas de SSO ni de rôle administrateur global ajouté par défaut.

### BB-F-002 — Connexion, déconnexion et retours de navigation

- **État observé :** implémentée sans test suffisant — S06 et auth Angular.
- **Priorité / horizon / effort :** MUST | V1 | S.
- **Valeur / parcours :** accéder au carnet, revenir à la recette demandée et quitter une session sur un appareil partagé.
- **Règles et cas limites :** échec de connexion générique ; returnUrl interne uniquement ; doubles clics bloqués ; un logout doit suivre la stratégie de session retenue, pas seulement masquer l'interface.
- **Données / API / droits :** POST login, GET me ; futur logout serveur selon F003. Ne pas retourner hash, état de membership ou données d'un autre compte.
- **Qualité / concurrence / OPS :** tests 401/429/réseau, token rejeté, retour externe refusé, plusieurs appels 401 simultanés ; documenter cookie/proxy si la session change.
- **Acceptation :** étant donné une recette protégée demandée hors connexion, quand la connexion aboutit, alors cette recette s'ouvre ; quand la session est quittée, alors le retour arrière ne révèle pas un cache privé utilisable.
- **Dépendances / exclusions :** F001/F003 ; pas de compte social en V1.

### BB-F-003 — Sessions durables, expiration et révocation

- **État observé :** partielle — JWT 15 min/sessionStorage ; refresh et révocation absents.
- **Priorité / horizon / effort :** MUST | V1 | L.
- **Valeur / parcours :** une saisie ou un service ne doit pas obliger à perdre son travail toutes les quinze minutes.
- **Règles et cas limites :** décision D2 avant code : session opaque cookie HttpOnly recommandée pour le web mono-origine, ou accès mémoire + refresh rotatif si conservation JWT. Inactivité et durée absolue distinctes, logout révoqué, appareil perdu, rotation et course entre onglets. Ne pas lancer deux renouvellements concurrents sans coordination.
- **Données / API / droits :** Session user-owned avec expiration/révocation et secret stocké haché ; endpoints état/logout, éventuellement refresh ; cookies Secure/HttpOnly/SameSite, contrôle origine/CSRF sur mutations. Définir aussi l'auth des médias.
- **Qualité / concurrence / OPS :** replay, CSRF, fixation, rotation, révocation, redémarrage API, secret/logs, expiration pendant requête ; migration additive, purge de sessions expirées, politique de clés et proxy documentées.
- **Acceptation :** étant donné une session valide, quand l'accès court expire, alors le travail peut continuer sans perte ; étant donné une session révoquée, alors l'API refuse son usage et aucun média privé n'est récupérable avec cette session.
- **Dépendances / exclusions :** D2, F051/F057 ; pas de plateforme d'identité externe en V1.

### BB-F-004 — Récupération d'accès, changement de mot de passe et email vérifié

- **État observé :** absente.
- **Priorité / horizon / effort :** SHOULD | V1.1 | L.
- **Valeur / parcours :** récupérer un accès sans intervention manuelle et sécuriser un changement d'identité. Devient MUST avant ouverture publique autonome.
- **Règles et cas limites :** réponse de demande non révélatrice, token aléatoire haché, usage unique, durée limitée, aucun mot de passe envoyé par email ; changement sensible après réauthentification, révocation des autres sessions selon choix explicite. Email de vérification distinct d'une invitation workspace.
- **Données / API / droits :** tokens account-owned ; POST demande/confirmation et changement ; 400 token invalide/expiré, 429 abus. Garder l'ancien email jusqu'à confirmation du nouveau.
- **Qualité / concurrence / OPS :** double consommation concurrente, ancien lien après nouveau mot de passe, compte inconnu, prestataire mail indisponible ; coût et connexion mail à approuver.
- **Acceptation :** étant donné un lien utilisé, quand il est rejoué, alors aucun second changement n'est possible ; email inconnu ou connu ne sont pas distinguables dans la réponse de demande.
- **Dépendances / exclusions :** F003 ; D1 ; prestataire et politique email à décider, aucun envoi réel autorisé par cet audit.

### BB-F-005 — Profil et préférences utilisateur

- **État observé :** partielle — displayName en lecture et thème local.
- **Priorité / horizon / effort :** SHOULD | V1.1 | M.
- **Valeur / parcours :** modifier son nom, choisir unités d'affichage et apparence, sur page de paramètres accessible au téléphone.
- **Règles et cas limites :** nom non vide après trim ; préférences sans effet sur quantités canoniques ; changement email dans F004. Distinguer préférence locale anonyme et compte connecté, sans écraser silencieusement un choix récent.
- **Données / API / droits :** PATCH `/api/me/preferences` et profil minimal ; seules les propriétés modifiables sont acceptées. Version pour deux onglets.
- **Qualité / concurrence / OPS :** unités mL/cL, stockage bloqué, restauration depuis serveur ; migration additive des préférences si synchronisées ; doc des valeurs par défaut.
- **Acceptation :** étant donné 45 ML stockés, quand l'affichage passe de cL à mL, alors la recette reste 45 ML ; un patch d'un autre userId est rejeté.
- **Dépendances / exclusions :** F003/F029/F050 ; pas de photo de profil ni de réseau social par défaut.

### BB-F-006 — Export personnel et fermeture de compte

- **État observé :** absente.
- **Priorité / horizon / effort :** SHOULD | V1.1 | L.
- **Valeur / parcours :** récupérer ses données et demander une suppression maîtrisée.
- **Règles et cas limites :** réauthentification, aperçu des conséquences, dernier OWNER d'un partagé bloqué tant qu'un transfert/fermeture n'est pas réglé ; politique de corbeille, purge et sauvegardes explicitée. Une cascade SQL ne décide pas de ces règles métier.
- **Données / API / droits :** export sans hashes/secrets/tokens d'autres personnes ; demande puis confirmation de clôture ; état pending/deleted, révocation sessions et médias.
- **Qualité / concurrence / OPS :** clôture pendant import/upload, reprise d'un job, compte déjà fermé ; suppression DB/médias coordonnée avec journal technique sans contenu privé ; rétention à approuver.
- **Acceptation :** étant donné un propriétaire unique d'espace partagé, alors une fermeture ne laisse pas l'espace sans responsable ; étant donné un export, alors aucune recette appartenant à un autre utilisateur n'y figure.
- **Dépendances / exclusions :** F003/F012/F042/F056 ; D5 ; pas de purge de sauvegarde fictivement instantanée.

### BB-F-007 — Protection renforcée des comptes

- **État observé :** partielle — Argon2id, JWT et rate limits ; MFA/événements sensibles absents.
- **Priorité / horizon / effort :** COULD | V2 | L.
- **Valeur / parcours :** protéger un responsable d'établissement et voir les sessions/événements sensibles.
- **Règles et cas limites :** MFA optionnel avec récupération, limitation IP + compte proportionnée, alertes sans contenu de recettes ; ne pas verrouiller définitivement une victime par tentatives hostiles. SSO entreprise est une étude distincte.
- **Données / API / droits :** secrets MFA chiffrés au repos, codes secours hachés, sessions propres, événements non sensibles et réauthentification.
- **Qualité / concurrence / OPS :** perte du second facteur, horloge, reuse, bruteforce, rotation et support d'urgence ; gestion de clés et mail à valider.
- **Acceptation :** étant donné un compte avec MFA, quand seul le mot de passe est fourni, alors aucune session utilisable n'est délivrée ; un code secours ne fonctionne qu'une fois.
- **Dépendances / exclusions :** F003/F004/F055 ; pas de SSO ou biométrie propriétaire sans besoin établi.

## B. Workspaces et collaboration

### BB-F-008 — Contexte personnel et sélection d'espace

- **État observé :** partielle — modèle PERSONAL/SHARED, API personnelle seulement.
- **Priorité / horizon / effort :** SHOULD | V2 | M.
- **Valeur / parcours :** savoir dans quel carnet on lit et écrit ; sélecteur visible avec nom et nature, sans mélanger listes personnelles et équipe.
- **Règles et cas limites :** contexte choisi côté client mais toujours autorisé côté serveur ; changement d'espace annule les lectures précédentes et purge caches ; départ d'équipe retire immédiatement l'accès. Pas de rôle workspace figé dans JWT.
- **Données / API / droits :** GET `/api/workspaces` ; nouvelles routes explicitement scoped ; conserver les routes personnelles en compatibilité tant que nécessaire.
- **Qualité / concurrence / OPS :** onglets sur deux espaces, ID hostile, membership révoqué, recherche en vol ; index memberships existants à mesurer ; pas de service supplémentaire requis.
- **Acceptation :** étant donné une recherche en cours sur A, quand B est choisi, alors la réponse tardive de A ne s'affiche pas dans B ; ID d'espace non membre → aucun contenu.
- **Dépendances / exclusions :** F009/F057 ; D3/D4 ; aucune collaboration implicite dans la V1.

### BB-F-009 — Espaces d'équipe, invitations et permissions

- **État observé :** prévue uniquement par les modèles OWNER/MEMBER.
- **Priorité / horizon / effort :** SHOULD | V2 | XL.
- **Valeur / parcours :** le responsable crée un espace, invite un collègue, lui attribue un rôle et peut retirer son accès.
- **Règles et cas limites :** matrice D4 ; OWNER gère membres/permissions, MEMBER selon droits validés ; READONLY seulement si nécessaire. Invitation email ciblée, hachée, expirante, révocable, à usage unique ; compte invité et email confirmés selon politique. Dernier OWNER ne peut ni partir ni être révoqué sans transfert.
- **Données / API / droits :** WorkspaceInvitation, memberships, état pending/accepted/revoked ; POST espace/invitation/acceptation, PATCH rôle, DELETE membre ; transaction acceptation + membership, 409 déjà membre/dernier owner.
- **Qualité / concurrence / OPS :** deux acceptations, invitations croisées, owner concurrent, membre révoqué pendant écriture ; tests de matrice sur chaque endpoint ; mail/quotas et rétention à documenter.
- **Acceptation :** étant donné un membre simple, quand il tente de se promouvoir, alors 403 ; étant donné une invitation révoquée, alors son lien ne donne aucun accès ; aucun scénario ne laisse zéro OWNER.
- **Dépendances / exclusions :** F003/F004/F008/F011 ; découper création, invitations, cycle de vie en sous-lots ; pas d'organigramme complexe.

### BB-F-010 — Copie personnelle vers un espace partagé

- **État observé :** absente ; règle envisagée à valider D3.
- **Priorité / horizon / effort :** SHOULD | V2 | L.
- **Valeur / parcours :** partager une création choisie avec l'équipe sans relier durablement les deux recettes.
- **Règles et cas limites :** source lisible, destination modifiable ; copie indépendante des lignes et médias autorisés ; jamais de FK cross-workspace ; pas de copie retour ni sync automatique. Choisir explicitement notes/photo/dossiers/tags exportés ; conflit de nom affiché, renommer ou annuler, jamais écraser.
- **Données / API / droits :** POST `/api/workspaces/:id/cocktail-copies` avec source id/version et clé d'idempotence ; provenance informative, pas une dépendance destructive ; ingrédient destination réutilisé sans écraser son ABV, override si nécessaire.
- **Qualité / concurrence / OPS :** édition source en cours, droits retirés, média absent, retry réseau ; transaction DB et copie média réconciliable ; audit de l'opération.
- **Acceptation :** étant donné la copie réussie, quand la source change ou disparaît, alors la destination reste identique ; rejouer la même demande ne crée pas une seconde copie.
- **Dépendances / exclusions :** F009/F028/F034 ; D3 ; synchronisation bidirectionnelle exclue.

### BB-F-011 — Attribution des contributions et journal métier

- **État observé :** absente — timestamps seuls sur plusieurs entités.
- **Priorité / horizon / effort :** SHOULD | V2 | M.
- **Valeur / parcours :** comprendre qui a changé une recette, un rôle ou une carte, sans enregistrer une surveillance permanente.
- **Règles et cas limites :** événements utiles, acteur/sujet/action/date/version ; pas de mot de passe, token, recette complète ni email inutile dans les logs techniques ; auteur supprimé représenté sans référence cassée.
- **Données / API / droits :** createdBy/updatedBy facultatifs en backfill et AuditEvent workspace-owned ; lecture réservée aux droits validés, rétention bornée.
- **Qualité / concurrence / OPS :** événement et mutation cohérents, export filtré, horodatage UTC, tamper via API refusé ; purge de rétention et index.
- **Acceptation :** étant donné un changement de rôle, alors l'ancien/nouveau rôle et l'acteur autorisé sont consultables ; un membre d'un autre espace ne voit aucun événement.
- **Dépendances / exclusions :** F008/F009/F055 ; journal fonctionnel ciblé, pas d'event sourcing global.

### BB-F-012 — Départ, transfert et fermeture d'espace partagé

- **État observé :** absente.
- **Priorité / horizon / effort :** MUST | V2 | L.
- **Valeur / parcours :** permettre à une équipe de continuer après le départ d'un responsable et fermer un espace sans effacer par surprise les recettes personnelles.
- **Règles et cas limites :** transfert atomique à un membre éligible ; dernier owner protégé ; contributions restent à l'espace après départ selon D3/D4 ; fermeture avec export, délai et purge approuvés ; invitations et liens publics révoqués.
- **Données / API / droits :** états active/archived/pending-deletion ; endpoints owner-only avec réauthentification et précondition de version ; suppression de fichiers coordonnée.
- **Qualité / concurrence / OPS :** deux transferts simultanés, import/stock en cours, accès révoqué, reprise de purge ; sauvegarde et restauration par espace à cadrer.
- **Acceptation :** quand un membre quitte, alors ses recettes personnelles restent intactes et il perd l'accès à l'espace ; fermer A ne supprime aucune donnée de B.
- **Dépendances / exclusions :** F006/F009/F011/F056 ; D5 ; pas de cascade SQL utilisée comme règle de gouvernance.

## C. Recettes et bibliothèque

### BB-F-013 — Bibliothèque et lecture d'une fiche fiable

- **État observé :** implémentée sans test suffisant — S04/S09/S10.
- **Priorité / horizon / effort :** MUST | V1 | M.
- **Valeur / parcours :** liste → fiche → retour à la même recherche ; informations générales, recette, garniture et étapes lisibles sur téléphone.
- **Règles et cas limites :** détail limité au bon espace, ordre stable, image cassée gérée, aucun résultat différent d'une bibliothèque vide ; conserver filtres/page au retour. Slug de navigation distinct de l'identité immuable ; segment `new` traité sans interdire le nom.
- **Données / API / droits :** conserver GET liste/détail actuels ; formats documentés et Decimal convertis explicitement ; fields minimaux ; 404 non révélateur.
- **Qualité / concurrence / OPS :** tests HTTP persistence/relecture, vrai routeur, petit écran, nom très long, réseau lent et page devenue vide ; optimiser placeholder sans migration.
- **Acceptation :** étant donné une recette complète, quand sa carte est ouverte puis la page rechargée, alors toutes ses quantités/étapes sont identiques ; un utilisateur étranger ne peut ni lire ni distinguer sa présence.
- **Dépendances / exclusions :** F020/F026/F049/F057 ; pas de communauté publique.

### BB-F-014 — Création complète et transactionnelle

- **État observé :** à revoir — code riche et tests, A001/A002 ouverts.
- **Priorité / horizon / effort :** MUST | V1 | M.
- **Valeur / parcours :** saisir une recette en plusieurs sections, corriger les erreurs au bon champ, enregistrer et voir le résultat exact.
- **Règles et cas limites :** nom 2–120, verre 1–80, famille/glace 80, notes 4 000 ; 1–50 ingrédients, 0–20 garnitures, 1–30 étapes de 1–500. TOP_UP sans quantité ; sinon >0 et <=99 999.999 ; ABV 0..100 ; slug canonique unique par ingrédient dans la recette. Fixer null/absent pour mainAlcoholName.
- **Données / API / droits :** POST existant ; réutilisation du catalogue sans le modifier ; transaction ingrédients/cocktail/lignes/étapes ; aucun workspace utilisateur dans le payload.
- **Qualité / concurrence / OPS :** tests limites, clients directs, doublon concurrent, rollback réel et retry après timeout réseau ; doc du contrat, pas de seed nécessaire au fonctionnement.
- **Acceptation :** étant donné une erreur à la création d'une étape, alors aucune recette ni nouvel ingrédient partiel ne subsiste ; une quantité 4.5 cL devient 45 ML ; doublon canonique refusé avant persistance.
- **Dépendances / exclusions :** F019/F028/F029/F051/F057 ; upload séparé, classement après création conservé pour la V1.

### BB-F-015 — Édition complète d'une recette

- **État observé :** absente ; seul le classement est modifiable.
- **Priorité / horizon / effort :** MUST | V1 | L.
- **Valeur / parcours :** corriger une dose, une étape ou un nom sans recréer la fiche.
- **Règles et cas limites :** formulaire prérempli et même validation que création ; `id` immuable ; stratégie de slug stable explicitée ; remplacer les sous-ensembles atomiquement ; ne pas effacer image/dossiers/tags parce qu'ils sont hors formulaire. Version attendue obligatoire pour éviter l'écrasement entre onglets.
- **Données / API / droits :** PUT/PATCH recette par ID stable, `version` ou If-Match ; version incrémentée dans la même transaction ; 409/412 avec rechargement guidé. Backfill version=1 sans réécrire l'historique.
- **Qualité / concurrence / OPS :** diff des lignes ordonnées, retrait de l'alcool principal, changement ABV sans effet catalogue, tags conservés, deux éditeurs ; migration additive et doc de compatibilité.
- **Acceptation :** quand A sauvegarde puis B tente une ancienne version, alors B reçoit un conflit et le travail de A reste intact ; renommer une recette conserve ses liens et son identité.
- **Dépendances / exclusions :** F014/F019/F028/F051 ; pas d'éditeur collaboratif temps réel.

### BB-F-016 — Archivage, suppression et récupération

- **État observé :** absente.
- **Priorité / horizon / effort :** MUST | V1 | L.
- **Valeur / parcours :** retirer une recette en sécurité, voir sa corbeille et la restaurer selon D5.
- **Règles et cas limites :** distinguer archiver, mettre en corbeille et purger ; confirmation avec nom/conséquences ; suppression d'un dossier ne supprime jamais les recettes. Réapparition lors de restauration, conflit de slug et rétention des médias explicités. Version/précondition et droits vérifiés.
- **Données / API / droits :** archivedAt/deletedAt si corbeille approuvée ; DELETE logique idempotent, POST restore ; purge physique séparée et contrôlée. Filtres doivent exclure les états cachés dans tous les accès normaux.
- **Qualité / concurrence / OPS :** suppression pendant édition/import, double DELETE, restauration après expiration, liens privés, nettoyage fichiers retardé ; sauvegarde et délai de purge documentés.
- **Acceptation :** étant donné un cocktail dans deux dossiers, quand il est restauré avant purge, alors ses données et liens récupérables reviennent ; suppression de dossier seule ne place rien en corbeille.
- **Dépendances / exclusions :** F015/F023/F034/F056 ; D5 ; aucun effacement massif sans aperçu et accord.

### BB-F-017 — Duplication et variations indépendantes

- **État observé :** absente ; enum VARIATION seulement.
- **Priorité / horizon / effort :** SHOULD | V1.1 | M.
- **Valeur / parcours :** expérimenter une recette sans modifier l'original ; nom prérempli mais éditable, provenance affichable.
- **Règles et cas limites :** copie interne à l'espace, nouveau cocktail et lignes ; référence d'origine informative facultative ; image choisie avec politique de copie ; dossiers/tags explicitement copiés ou non. Changer l'original n'altère jamais la variation.
- **Données / API / droits :** POST `/cocktails/:id/copies`, sourceVersion, nouveau nom, clé de rejeu ; slug unique ; aucun lien de propriété transverse.
- **Qualité / concurrence / OPS :** original supprimé/modifié pendant copie, nom collision, quantité/ABV Decimal préservés ; tests DB et UI ; doc provenance et cycle média.
- **Acceptation :** quand une variation est modifiée, alors l'original reste inchangé ; retry d'une même duplication identifiée ne produit pas de doublon.
- **Dépendances / exclusions :** F015/F034 ; pas de synchronisation entre variantes.

### BB-F-018 — Types, familles, méthodes, verrerie et service

- **État observé :** partielle — enums type/méthode, textes famille/verre/glace.
- **Priorité / horizon / effort :** MUST | V1 | S.
- **Valeur / parcours :** caractériser une recette et comprendre sa préparation sans confusion de vocabulaire.
- **Règles et cas limites :** Type ≠ Tag ≠ Dossier ; CLASSIC/PERSONAL_CREATION/VARIATION conservés ; familles/verres libres avec suggestions éventuelles, pas de nouveau référentiel obligatoire sans besoin. Nettoyer le doublon « Classique » du seed sans supprimer un tag utilisateur existant.
- **Données / API / droits :** contrats existants ; label français centralisé ; tout futur enum exige compatibilité clients et migration mesurée.
- **Qualité / concurrence / OPS :** tests labels/filtres, valeurs inconnues rejetées, anciens objets lisibles ; pas de migration pour simple correction du futur seed.
- **Acceptation :** un type Classique ne crée aucun tag système automatiquement ; retirer un tag ne change ni type ni dossier.
- **Dépendances / exclusions :** F014/F025 ; taxonomie mondiale rigide et renommage Barbook exclus.

### BB-F-019 — Composition structurée, étapes et garnitures

- **État observé :** implémentée sans test suffisant — règles et CHECK présents.
- **Priorité / horizon / effort :** MUST | V1 | M.
- **Valeur / parcours :** produire une fiche reproductible, avec ingrédients de préparation séparés de la finition.
- **Règles et cas limites :** un ingrédient canonique par recette ; répartitions à différents moments décrites dans les étapes ; garniture quantité+unité ensemble ou aucune, jamais TOP_UP ; alcool principal facultatif, présent dans les lignes et ABV effectif >0. `specification` décrit marque/style et reste distincte de notes.
- **Données / API / droits :** tables actuelles et ordre stable ; contrôles SQL additionnels uniquement si besoin démontré, par migration nouvelle ; pas de logique de préparation dans le controller.
- **Qualité / concurrence / OPS :** vrais tests CHECK/FK, ordre, doublons, minimum et maximum ; définition de l'édition des lignes F015 ; doc des invariants et unités.
- **Acceptation :** une garniture avec quantité seule est refusée ; changer sa note ne modifie pas l'ABV ; sélectionner comme alcool principal un ingrédient non alcoolisé est refusé.
- **Dépendances / exclusions :** F014/F029 ; plusieurs occurrences du même ingrédient différées tant que leur valeur n'est pas validée.

### BB-F-020 — Degré alcoolique estimé et incertitudes

- **État observé :** partielle — calcul avant dilution en ML ; présentation à clarifier.
- **Priorité / horizon / effort :** MUST | V1 | M.
- **Valeur / parcours :** comprendre une estimation et ses limites, sans précision trompeuse.
- **Règles et cas limites :** Σ(ML×ABV)/ΣML, garnitures exclues, `0` connu différent de null inconnu, TOP_UP inconnu → null ; aucune conversion inventée de DASH/cuillère ni dilution implicite. Choisir entre héritage catalogue et inconnu explicite pour une ligne F028.
- **Données / API / droits :** réponse estimée accompagnée de statut/reasons si évolution de contrat ; ne pas persister une valeur dérivée pouvant devenir périmée sans version/source.
- **Qualité / concurrence / OPS :** cas purement sans alcool, alcool non ML, override 0, absence de volume et précision ; tests de calcul et affichage ; aucun service externe.
- **Acceptation :** étant donné 50 ML à 40 %, 25 et 15 ML à 0 %, alors 22.22 % avant dilution ; avec TOP_UP, alors inconnu ; un degré inconnu ne devient jamais 0.
- **Dépendances / exclusions :** F019/F028/F029 ; pas de certification « sans alcool », calcul légal ou dilution exacte automatique.

### BB-F-021 — Brouillons versionnés et historique des recettes

- **État observé :** absente, timestamps seulement.
- **Priorité / horizon / effort :** COULD | V2 | L.
- **Valeur / parcours :** comparer un essai et revenir à une recette précédente sans perdre la version publiée à l'équipe.
- **Règles et cas limites :** brouillon, recette courante et publication de carte sont distincts ; restauration crée une nouvelle version, ne réécrit pas l'histoire ; historique de l'espace, pas une copie personnelle de chaque membre.
- **Données / API / droits :** révisions immuables avec snapshot métier borné, auteur et version ; GET revisions/diff, POST restore avec version attendue ; pas de copie des secrets ou objets binaires.
- **Qualité / concurrence / OPS :** deux restaurations, ingrédients supprimés, changement de schéma, rétention ; sauvegarde volume/historique ; migrations versionnées des formats.
- **Acceptation :** restaurer V2 depuis V5 crée V6 et garde V5 consultable ; un lecteur non autorisé n'accède pas aux anciennes notes privées.
- **Dépendances / exclusions :** F015/F011/F034 ; event sourcing et édition temps réel exclus.

### BB-F-022 — Favoris, modèles et raccourcis personnels

- **État observé :** absente ; un dossier nommé Favoris n'est pas un favori système.
- **Priorité / horizon / effort :** COULD | V1.1 | M.
- **Valeur / parcours :** retrouver ses recettes de service et démarrer depuis un modèle choisi.
- **Règles et cas limites :** favoris propres à l'utilisateur, éventuellement dans un workspace ; ne pas confondre préférence personnelle et classement commun. Un modèle instancié devient une copie indépendante, pas un nouveau type imposé à toutes les recettes.
- **Données / API / droits :** relation user/workspace/cocktail unique ; PUT/DELETE favorite idempotents ; modèle explicite ou duplication préremplie.
- **Qualité / concurrence / OPS :** recette supprimée, membership retiré, double clic, tri stable ; index et purge des références ; doc portée des favoris.
- **Acceptation :** le favori de A n'apparaît pas chez B ; ajouter deux fois ne crée qu'une relation ; supprimer un favori ne supprime pas sa recette.
- **Dépendances / exclusions :** F013/F017 ; pas de likes publics ni compteurs sociaux.

## D. Classement et recherche

### BB-F-023 — Appartenances multiples aux dossiers

- **État observé :** partielle — branche active, S13.
- **Priorité / horizon / effort :** MUST | V1 | L.
- **Valeur / parcours :** depuis une fiche, cocher plusieurs collections puis retrouver la même recette dans chacune.
- **Règles et cas limites :** 0..n dossiers plats ; déduplication des IDs ; relation unique, FK composites ; remplacer l'ensemble depuis la fiche atomiquement avec version attendue ; filtre folderId inchangé mais lecture via CocktailFolder. Liste vide retire seulement les appartenances, pas les tags/recette.
- **Données / API / droits :** reprendre la branche existante ; PUT `{folderIds: UUID[], tagNames: string[], expectedVersion}` et réponses `folders[]` ; compatibilité de `folder`/`folderId` explicitement temporisée ; aucun vieux client ne doit écraser un ensemble multiple.
- **Qualité / concurrence / OPS :** EXPAND/backfill/double écriture/read switch/CONTRACT en jalons distincts ; état des migrations des instances connu avant opération ; tests rollback, lien étranger, concurrence, filtre, backfill depuis données historiques et suppression.
- **Acceptation :** étant donné A dans X et Y, quand X est retiré, alors A reste dans Y et le catalogue ; étant donné un dossier d'un autre espace, alors toute la sauvegarde est rejetée sans mutation partielle ; deux sauvegardes concurrentes ne fusionnent pas silencieusement des états périmés.
- **Dépendances / exclusions :** F024/F057, A006/A007/A008 ; CONTRACT destructif après accord séparé ; pas de hiérarchie.

### BB-F-024 — Navigation et gestion complète des dossiers

- **État observé :** partielle — création dans la fiche, pas de page dédiée.
- **Priorité / horizon / effort :** MUST | V1 | L.
- **Valeur / parcours :** onglet Dossiers dans le header, liste et création visibles, ouverture, recherche des cocktails, ajout multiple, retrait local, renommage et suppression sûrs.
- **Règles et cas limites :** nom trim 1–80, unicité exacte par workspace selon ADR actuel, case policy explicite ; 0 recette = vrai état vide ; ajout en lot borné (proposition 100 IDs), validé entièrement ou rollback ; retirer ne modifie ni tags ni autres dossiers. Suppression confirmée détache les liens, jamais les recettes.
- **Données / API / droits :** GET/PATCH/DELETE folder par ID, GET cocktails paginés du dossier ; PUT `/folders/:id/cocktails/:cocktailId` et DELETE idempotents, endpoint lot additive ; 409 doublon, 404 hors scope ; verrouillage/version cohérent avec F023.
- **Qualité / concurrence / OPS :** sélection à travers pagination, dossier supprimé pendant ajout, doublon d'IDs, réseau après commit ; tests mobile/clavier et DB ; legacy Restrict traité avant suppression ; doc des limites de lot.
- **Acceptation :** depuis le catalogue vide, un utilisateur crée et ouvre un dossier sans devoir créer une recette ; supprimer X garde les recettes et leurs liens Y ; ajouter A deux fois ne crée qu'un lien.
- **Dépendances / exclusions :** F023/F049 ; pas de drag/drop, sous-dossiers, couleurs ou tri manuel imposés en V1.

### BB-F-025 — Tags libres, gestion et fusion contrôlée

- **État observé :** partielle — liste et création implicite, max 20/recette.
- **Priorité / horizon / effort :** SHOULD | V1.1 | M.
- **Valeur / parcours :** classer par caractéristiques, corriger une faute et retirer un tag sans toucher au contenu.
- **Règles et cas limites :** normaliser par slug canonique côté UI et serveur, pas seulement localeCompare ; nom 1–40, max20 ; renommage collision = proposer fusion explicite, pas effacer un tag utilisateur « Classique » parce que le seed le contient.
- **Données / API / droits :** GET paginé/recherchable, PATCH/DELETE tag ; fusion atomique avec déduplication des liens ; aucun changement automatique de type/famille.
- **Qualité / concurrence / OPS :** renommages simultanés, deux tags même slug, très grand nombre de liens, suppression puis sauvegarde vieille fiche ; doc/backfill limité aux données prouvées d'exemple.
- **Acceptation :** quand « Café » fusionne avec son alias approuvé, alors chaque recette garde une seule association ; supprimer un tag ne supprime jamais une recette ni son dossier.
- **Dépendances / exclusions :** F023/F026 ; pas de tags système redondants ni taxonomie globale imposée.

### BB-F-026 — Recherche, filtres combinables, tri et retour au contexte

- **État observé :** partielle — nom/type/méthode/dossier/tag/pagination existants.
- **Priorité / horizon / effort :** MUST | V1 | M.
- **Valeur / parcours :** retrouver une recette vite et revenir à sa liste après consultation ; desktop et mobile partagent le même état utile.
- **Règles et cas limites :** paramètres validés, recherche max120, page>=1 et offset sûr, taille<=100 ; filtres AND actuels documentés ; page1 lors changement ; état dans URL avec défauts canonisés. V1 garde un tag/dossier actif, filtre multi-tags AND/OR soumis à F027, pas ajouté en cachette.
- **Données / API / droits :** GET existant ; tri autorisé par enum et second critère id ; pas de tri SQL libre ; future recherche par ingrédient scoped et indexée après mesure.
- **Qualité / concurrence / OPS :** annulation des requêtes, retour arrière, liens partagés mais résultats privés, page devenue vide, 0/1/24/25 items ; profil DB sur volumes cibles et doc sémantique des filtres.
- **Acceptation :** étant donné recherche+type+dossier page2, quand on ouvre une fiche puis revient, alors cet état est restauré ; un ID de tag étranger ne révèle aucune donnée.
- **Dépendances / exclusions :** F013/F023/F049/F052 ; pas d'Elasticsearch ni fuzzy avant besoin mesuré.

### BB-F-027 — Collections intelligentes et recherche avancée

- **État observé :** absente.
- **Priorité / horizon / effort :** COULD | V2 | L.
- **Valeur / parcours :** enregistrer « sans tel ingrédient », « à tester », « gin + agrumes » sous une vue réutilisable.
- **Règles et cas limites :** filtres sauvegardés ≠ dossiers manuels ; langage d'opérateurs borné, AND/OR explicite ; pas de SQL arbitraire ; aucun indice de données d'autres espaces. Les disponibilités/contraintes alimentaires inconnues restent inconnues.
- **Données / API / droits :** SavedFilter versionné par workspace/user selon visibilité ; clauses validées côté serveur, pagination et coûts bornés.
- **Qualité / concurrence / OPS :** référence tag supprimée, filtre obsolète, normalisation accents, combinaison coûteuse ; index après EXPLAIN sur jeu synthétique.
- **Acceptation :** changer une recette peut modifier automatiquement sa présence dans une collection intelligente sans modifier ses dossiers ; une règle invalide affiche une erreur corrigeable, pas une vue vide trompeuse.
- **Dépendances / exclusions :** F025/F026/F028 ; pas de langage de requête libre ni moteur IA requis.

## E. Ingrédients et mesures

### BB-F-028 — Catalogue ingrédients, alias et degrés de référence

- **État observé :** partielle — résolution/ajout à la création, autocomplete, pas de gestion dédiée.
- **Priorité / horizon / effort :** SHOULD | V1.1 | L.
- **Valeur / parcours :** réutiliser « Gin » sans doublons, corriger un nom et préciser une valeur de référence sans altérer les recettes involontairement.
- **Règles et cas limites :** slug unique par espace, alias explicites ; jus et fruit distincts ; fusion nécessite aperçu des usages, collision de deux lignes d'une même recette à résoudre avant transaction. ABV catalogue changé : expliciter si les recettes héritantes sont recalculées ou figées ; aucune modification silencieuse depuis la création.
- **Données / API / droits :** CRUD catalogue et usages paginés ; alias table workspace-owned ; option de ligne `inherit/override/unknown` si besoin validé, distincte de valeur 0 ; migration/backfill réversible.
- **Qualité / concurrence / OPS :** fusions concurrentes, garde des références mainAlcohol/garniture, 40→0/null, recette versionnée ; doc effets des changements catalogue.
- **Acceptation :** un override à 50 reste 50 après changement catalogue ; une fusion qui créerait deux ingrédients identiques dans une recette n'écrase pas une dose ; une requête étrangère est rejetée.
- **Dépendances / exclusions :** F015/F020/F029 ; pas de référentiel mondial obligatoire.

### BB-F-029 — Unités canoniques et conversions explicites

- **État observé :** partielle — ML/G et mesures de bar, conversion cL et précision à corriger.
- **Priorité / horizon / effort :** MUST | V1 | M.
- **Valeur / parcours :** saisir 4.5 cL et relire 45 mL sans perte ; garder les mesures de bar compréhensibles.
- **Règles et cas limites :** ML canonique, Decimal(8,3), conversion cL×10 ; préserver précision à l'affichage, zéro interdit pour une quantité mesurée ; TOP_UP qualitatif, masse et volume non convertis sans densité sourcée. Cuillères/dashes dépendent d'un étalonnage explicite si conversion future.
- **Données / API / droits :** contrats existants en ML ; préférences d'affichage séparées ; toute nouvelle unité demande conversion déterministe et compatibilité des enums.
- **Qualité / concurrence / OPS :** arrondis, séparateur français, minimum/maximum, UI vs API, null/non numérique ; tests de propriétés aller/retour ; doc pas d'infra nouvelle.
- **Acceptation :** 2.25 cL →22.5 ML→2.25 cL ; 0.01 ML n'est pas affiché comme zéro ; une quantité TOP_UP chiffrée est refusée.
- **Dépendances / exclusions :** F019/F020 ; pas de conversion universelle feuille→gramme ou trait→mL inventée.

### BB-F-030 — Produits, marques et substitutions

- **État observé :** partielle — texte specification seulement.
- **Priorité / horizon / effort :** COULD | V2 | L.
- **Valeur / parcours :** distinguer ingrédient générique et bouteille réellement utilisée, puis proposer un remplacement documenté.
- **Règles et cas limites :** Product référence Ingredient dans le même workspace ; degré/conditionnement propres au produit ; une substitution n'est pas une équivalence de goût/ABV/allergènes automatique ; marque libre et produit archivable.
- **Données / API / droits :** Product, packaging, références facultatives des lignes ; version d'usage pour calculs historiques ; migration additive, anciens specification préservés en texte.
- **Qualité / concurrence / OPS :** produit supprimé/référencé, volume inconnu, variantes de bouteille, prix variable ; tests coût/ABV avec substitution ; pas de récupération web de marques non approuvée.
- **Acceptation :** substituer un gin 40 par un 47 modifie l'estimation de l'essai choisi, pas toutes les recettes utilisant Gin ; produit étranger interdit.
- **Dépendances / exclusions :** F028/F029 ; prérequis aux coûts/stock ; pas de catalogue commercial externe par défaut.

### BB-F-031 — Allergènes et informations nutritionnelles sourcées

- **État observé :** absente.
- **Priorité / horizon / effort :** COULD | V2 | XL.
- **Valeur / parcours :** disposer d'informations documentées par produit/recette, utiles au service, avec origine et date.
- **Règles et cas limites :** inconnu ≠ absent ; données spécifiques au produit, composition et contamination potentielle distinctes ; jamais inférer une garantie depuis une recette vide ou une réponse IA ; sources et validation métier nécessaires avant publication.
- **Données / API / droits :** attributs sourcés, statut validé/inconnu, unités nutritionnelles, versions et revalidation ; affichage des informations manquantes ; permissions d'édition/validation.
- **Qualité / concurrence / OPS :** produit remplacé invalide les dérivations concernées, ingrédients composites, quantités non convertibles ; sources/licences et budget à approuver.
- **Acceptation :** si un ingrédient a une donnée inconnue, alors la recette n'est jamais annoncée garantie sans cet allergène ; source/date sont consultables.
- **Dépendances / exclusions :** F028/F030 ; pas de conseil médical ni certification automatique ; découverte métier indispensable.

### BB-F-032 — Disponibilité des ingrédients et recettes réalisables

- **État observé :** absente.
- **Priorité / horizon / effort :** COULD | V1.1 | M.
- **Valeur / parcours :** cocher ce qu'on possède pour retrouver les recettes réalisables, avant un stock comptable complet.
- **Règles et cas limites :** disponibilité qualitative distincte d'une quantité de stock ; manquant, disponible et inconnu distincts ; ingrédients optionnels/substituables seulement si marqués ; TOP_UP n'a pas de consommation chiffrée inventée.
- **Données / API / droits :** disponibilité par espace, éventuellement préférence personnelle ; filtre de recettes et explication des manques ; aucun mouvement de stock.
- **Qualité / concurrence / OPS :** catalogue modifié, disponibilité périmée, caches d'espace ; tests combinaisons et permissions ; doc de la limite « disponibilité déclarée ».
- **Acceptation :** une recette avec ingrédient inconnu n'est pas marquée assurément réalisable ; voir les ingrédients manquants ne modifie ni recette ni inventaire.
- **Dépendances / exclusions :** F028/F026 ; ne remplace pas F045/F046.

## F. Images et médias

### BB-F-033 — Ajout de photos depuis ordinateur, galerie et appareil photo

- **État observé :** absente pour l'upload ; affichage imageUrl/placeholder présent.
- **Priorité / horizon / effort :** MUST | V1 | L.
- **Valeur / parcours :** depuis une recette, choisir un fichier ou prendre une photo, prévisualiser, envoyer, voir la miniature et pouvoir remplacer.
- **Règles et cas limites :** fichiers JPEG/PNG/WebP proposés ; D6 fixe tailles/quotas. Proposition initiale : 8 Mio maximum d'entrée, décodage borné à 25 mégapixels, normalisation orientation, retrait EXIF, redimensionnement 2 048 px et miniatures. SVG et fichiers exécutables refusés ; extension/MIME déclaré insuffisants, décodage réel requis. HEIC : conversion locale/serveur seulement si support testé, sinon message explicite et possibilité de choisir un JPEG ; ne pas prétendre accepter toutes les photos iPhone.
- **Données / API / droits :** POST média attaché à un cocktail autorisé ; IDs et noms serveur, checksum, format réel, dimensions, statut pending/ready ; URL externe non récupérée par le serveur. 413 trop gros, 415 format refusé, 400/422 contenu illisible selon contrat.
- **Qualité / concurrence / OPS :** tests fichier déguisé, image décompressée énorme, EXIF, interruption, double envoi et remplacement concurrent ; stockage persistant privé, limites Nginx/API alignées, permissions et monitoring disque.
- **Acceptation :** photo d'une recette A illisible par un autre compte ; une image refusée ne laisse pas d'objet prêt ni remplace la précédente ; orientation et aperçu sont corrects sur mobile.
- **Dépendances / exclusions :** D2/D6, F034/F057 ; pas de traitement IA ou import distant en V1.

### BB-F-034 — Accès privé, remplacement et cycle de vie des médias

- **État observé :** absente — imageUrl seul n'établit aucun contrôle d'accès.
- **Priorité / horizon / effort :** MUST | V1 | L.
- **Valeur / parcours :** retrouver ses photos après un déploiement et les conserver privées.
- **Règles et cas limites :** un nom opaque n'est pas une autorisation ; GET média vérifie le workspace et l'état. Avec cookie même origine, `<img>` peut s'authentifier ; avec Bearer mémoire, charger via HttpClient/blob puis révoquer objectURL. Ne jamais réutiliser le refresh token comme droit de lecture média. Remplacement valide d'abord le nouveau fichier puis change la référence, nettoyage ancien différé. Échec fichier/DB récupérable, scan d'orphelins prudent.
- **Données / API / droits :** MediaAsset workspace-owned, état et variantes ; GET/DELETE par ID ; cache privé/no-store ou revalidation définie ; aucun répertoire Nginx public pour les originaux ; copie inter-workspace explicite F010.
- **Qualité / concurrence / OPS :** membre révoqué, session expirée, cache partagé, ancien lien, purge vs restauration ; sauvegarde cohérente DB+fichiers, contrôle des quotas, GC borné et observable.
- **Acceptation :** après remplacement raté l'ancienne photo fonctionne ; après redéploiement les photos persistent ; un accès étranger retourne une réponse non révélatrice et ne récupère pas une miniature privée en cache.
- **Dépendances / exclusions :** F003/F016/F033/F056 ; stockage objet seulement si volume/budget le justifie.

## G. Préparation et service au bar

### BB-F-035 — Mode service lisible et rapide

- **État observé :** absente, fiche standard seulement.
- **Priorité / horizon / effort :** SHOULD | V1.1 | M.
- **Valeur / parcours :** rechercher et lire une recette pendant le service, avec grosses quantités, étapes courtes et actions tactiles accessibles.
- **Règles et cas limites :** vue de lecture distincte de l'édition ; éviter suppression/édition accidentelle ; mise en veille désactivable uniquement par une API navigateur supportée et après choix ; pas de promesse plein écran/écran allumé universelle. Retour rapide à la recherche.
- **Données / API / droits :** réutiliser détail autorisé ; état de lecture local borné, aucune mutation recette ; ne pas précharger tout le carnet privé sans besoin.
- **Qualité / concurrence / OPS :** 390/430 px, mains/tactile, zoom, contraste, connexion lente et session expirée ; test utilisateur au bar à prévoir ; pas de nouvel hébergement.
- **Acceptation :** la dose et les ingrédients sont lisibles sans parcourir les contrôles d'organisation ; quitter le mode service ne change aucun contenu.
- **Dépendances / exclusions :** F013/F049/F050 ; pas de caisse ou prise de commande.

### BB-F-036 — Calculateur de portions

- **État observé :** absente.
- **Priorité / horizon / effort :** SHOULD | V1.1 | M.
- **Valeur / parcours :** passer d'un verre à plusieurs portions, avec tableau original/calculé et retour à l'unité.
- **Règles et cas limites :** facteur strictement positif et borné, quantité de référence explicite ; calcul exact séparé de l'arrondi mesurable. ML et G ne se mélangent pas ; feuilles/pièces restent des unités distinctes ; TOP_UP reste « compléter ». Garnitures choisies séparément, pas incluses dans un volume liquide.
- **Données / API / droits :** calcul pur à partir d'une version de recette, endpoint facultatif si réutilisé pour exports ; aucune mutation du catalogue ; nombre de portions mémorisé seulement si l'utilisateur crée une préparation.
- **Qualité / concurrence / OPS :** précision décimale, facteur fractionnaire, très grand facteur, quantité manquante, recette modifiée pendant calcul ; tests de propriétés et présentation.
- **Acceptation :** 45 ML×12=540 ML ; un TOP_UP ne devient pas 0 ML ; revenir à 1 portion restitue les valeurs originales, pas des valeurs réarrondies.
- **Dépendances / exclusions :** F029 ; conversion des mesures qualitatives exclue sans étalonnage.

### BB-F-037 — Batchs et prébatchs avec arrondis vérifiables

- **État observé :** absente.
- **Priorité / horizon / effort :** SHOULD | V1.1 | L.
- **Valeur / parcours :** préparer une base d'environ un litre et garder au service citron, blanc d'œuf ou compléments choisis ; visualiser volumes, portions et reste.
- **Règles et cas limites :** inclusion/exclusion explicite de chaque ligne ; cible « volume de base » différente de « volume final » et de « nombre de verres » ; TOP_UP ou volume inconnu empêche une fausse somme exacte ; arrondis par pas mesurable avec écart et ratio affichés. Dilution ajoutée seulement si saisie/validée, pas estimée automatiquement ; aucune durée de conservation inventée.
- **Données / API / droits :** BatchPlan référence une version/snapshot, cible, lignes incluses et politique d'arrondi ; calcul réutilisable par fiche/PDF. Sauver un plan ne consomme pas le stock ; production réelle est F038/F045.
- **Qualité / concurrence / OPS :** tests calcul exact, seuil/arrondi, cible sous une portion, exclusion totale, unité G non sommable en ML, édition source et rejeu ; documenter hypothèses et limites.
- **Acceptation :** base 45 ML+15 ML, frais 30 ML exclus : cible 1 000 ML donne 750+250 ML, soit 16 portions complètes de base à 60 ML et 40 ML restants ; frais requis pour 16 services =480 ML, hors bouteille de base. Aucun arrondi ne devient invisible.
- **Dépendances / exclusions :** F036/F029 ; paramètres de conservation doivent être validés par le responsable, pas produits par défaut.

### BB-F-038 — Mise en place, listes de préparation et lots produits

- **État observé :** absente.
- **Priorité / horizon / effort :** SHOULD | V2 | L.
- **Valeur / parcours :** préparer un service, cocher les tâches, répartir des quantités et identifier les lots effectivement fabriqués.
- **Règles et cas limites :** plan prévu ≠ produit réellement enregistré ; validation finale, auteur/date/quantité/rendement réels ; ingrédients frais et assemblage séparés ; annulation ou correction par opération traçable. Dates d'utilisation saisies selon politique validée, aucune garantie de stabilité automatique.
- **Données / API / droits :** PrepList, tasks, ProductionBatch, lignes réelles ; droits production distincts si nécessaire ; idempotency-key sur validation et mouvements stock associés.
- **Qualité / concurrence / OPS :** deux personnes cochent, produit partiel, perte, rupture ingrédient, retour réseau après commit ; transaction et verrouillage stock testés ; impression/étiquettes et audit.
- **Acceptation :** cocher une tâche ne déduit pas deux fois le stock ; enregistrer un rendement différent conserve prévu et réel sans réécrire le plan.
- **Dépendances / exclusions :** F009/F037/F045 ; pas de traçabilité réglementaire certifiée sans étude dédiée.

### BB-F-039 — Fiches techniques imprimables et PDF

- **État observé :** absente.
- **Priorité / horizon / effort :** SHOULD | V1.1 | M.
- **Valeur / parcours :** imprimer une recette ou un prébatch avec quantités, étapes, version et date, lisibles sur une page.
- **Règles et cas limites :** contenu explicitement choisi, notes internes privées par défaut, unités et incertitudes conservées ; aucune coupure d'ingrédient/étape illisible ; photo optionnelle, A4 et format compact à valider.
- **Données / API / droits :** export d'une version autorisée ; génération locale d'impression ou serveur selon qualité, sans URL publique permanente ; nom de fichier sûr.
- **Qualité / concurrence / OPS :** longues recettes, caractères français, saut de page, image absente, relecture du PDF ; limites de génération et purge des exports temporaires si serveur.
- **Acceptation :** les nombres du PDF correspondent au calcul de la version affichée ; une recette inaccessible n'est pas exportable ; aucun coût privé dans une fiche destinée aux clients.
- **Dépendances / exclusions :** F013/F036/F037/F034 ; pas de partage public implicite.

## H. Cartes, partage et portabilité

### BB-F-040 — Cartes saisonnières et sélection éditoriale

- **État observé :** absente ; un dossier peut seulement servir de sélection informelle.
- **Priorité / horizon / effort :** SHOULD | V2 | L.
- **Valeur / parcours :** créer une carte, choisir l'ordre, les descriptions/prix et préparer la version de saison suivante.
- **Règles et cas limites :** une carte référence ou fige une version choisie de la recette ; publication ne diffuse jamais notes techniques/coûts sans choix ; brouillon/publication séparés, disponibilité/rupture explicites ; monnaie et libellés à valider.
- **Données / API / droits :** Menu, sections, entries et version publiée ; CRUD membre autorisé, publication selon rôle ; précondition de version.
- **Qualité / concurrence / OPS :** recette archivée, deux éditeurs, prix absent, images privées, repli QR ; snapshot/publication atomique et réversible ; doc des champs publiables.
- **Acceptation :** modifier une recette de travail ne change pas silencieusement une carte déjà publiée ; une publication ne contient que les champs sélectionnés.
- **Dépendances / exclusions :** F021/F041/F044 ; pas de commande ni paiement.

### BB-F-041 — Partage sélectif, liens publics et QR codes

- **État observé :** absente.
- **Priorité / horizon / effort :** COULD | V2 | L.
- **Valeur / parcours :** partager une fiche approuvée ou une carte via QR, avec aperçu exact de ce qu'un visiteur anonyme verra.
- **Règles et cas limites :** privé par défaut ; publication explicite par propriétaire autorisé ; séparation DTO public/privé ; lien révocable, expiration optionnelle, visibilité indexable ou non choisie. QR n'est qu'une représentation d'URL, pas une permission. Copies/cache déjà téléchargés ne sont pas récupérables magiquement après révocation.
- **Données / API / droits :** PublicPublication avec version, champs et médias publics dérivés autorisés ; endpoints publics séparés et bornés ; aucune réutilisation directe d'un répertoire média privé.
- **Qualité / concurrence / OPS :** révocation, abus, enumeration, fuite de notes/marges, caches/CDN ; tests anonymes et membre révoqué ; rate limits et politique de cache.
- **Acceptation :** l'aperçu public et la réponse anonyme exposent exactement les mêmes champs ; révoquer empêche toute nouvelle lecture serveur autorisée par le lien.
- **Dépendances / exclusions :** D1/D6, F034/F040 ; aucune exposition publique activée sans accord.

### BB-F-042 — Export et import portable JSON/CSV

- **État observé :** absente ; seed interne non assimilable à un import.
- **Priorité / horizon / effort :** SHOULD | V1.1 | L.
- **Valeur / parcours :** sauvegarder, transférer et réimporter un carnet avec aperçu avant changement.
- **Règles et cas limites :** JSON versionné canonique pour les relations ; CSV sous-ensemble documenté, pas promesse d'aller/retour complet sans convention. Dry-run : nombre de créations, conflits, champs non compris, médias manquants ; aucune exécution de code, récupération réseau ou écrasement automatique ; limites fichier/lignes.
- **Données / API / droits :** DTO d'import distinct des modèles DB, nouveaux IDs et remapping local des liens ; propriétaire source non accepté comme autorisation ; job/lot atomique borné, idempotence et rapport par ligne ; cellules exportées protégées contre formule tableur.
- **Qualité / concurrence / OPS :** doublons, version future, unité inconnue, fichier malformé, annulation et retry ; tests fixtures, export→import→comparaison ; média via manifeste sûr sans secrets.
- **Acceptation :** un fichier contenant un workspaceId étranger ne relie aucune donnée à cet espace ; import non confirmé ne modifie rien ; un format inconnu échoue explicitement.
- **Dépendances / exclusions :** F014/F028/F034 ; pas d'accès de cet audit à la DB de production.

## I. Coûts, stocks et exploitation

### BB-F-043 — Coût matière documenté

- **État observé :** absente.
- **Priorité / horizon / effort :** SHOULD | V2 | L.
- **Valeur / parcours :** connaître le coût d'une recette à partir des bouteilles et conditionnements réellement utilisés.
- **Règles et cas limites :** quantité/conditionnement/prix/devise/date/source ; formule pour unités compatibles ; pertes/rendement explicites ; information manquante = coût partiel/inconnu, jamais 0. Prix historiques figés pour une simulation ou production, pas recalcul rétroactif invisible.
- **Données / API / droits :** ProductPrice, packaging et CostSnapshot ; montants Decimal, aucun float monétaire ; accès financier séparé des fiches publiques ; calcul avec détail de chaque poste.
- **Qualité / concurrence / OPS :** pack multiplié, prix mis à jour, volume inconnu, multi-devise non convertie sans source ; tests arrondis et précision ; doc HT/TTC et provenance.
- **Acceptation :** 45 ML issus d'une bouteille 700 ML à 21 unités monétaires coûtent 1.35 avant autres postes ; un ingrédient sans prix rend le total incomplet et l'explique.
- **Dépendances / exclusions :** F030/F029 ; pas de comptabilité ni règle fiscale inventée.

### BB-F-044 — Prix de vente et simulations de marge

- **État observé :** absente.
- **Priorité / horizon / effort :** COULD | V2 | M.
- **Valeur / parcours :** simuler prix, coût, pertes et paramètres fiscaux approuvés, comparer des scénarios sans modifier une carte publiée.
- **Règles et cas limites :** distinguer HT/TTC et paramètres configurables, taux de marque `(PVHT-coût)/PVHT` et taux de marge `(PVHT-coût)/coût` ; division par zéro et coût inconnu signalés. Ne pas prétendre calculer le bénéfice net d'un établissement.
- **Données / API / droits :** PricingScenario privé, version des prix/coûts et arrondis ; publication vers une carte seulement par action dédiée.
- **Qualité / concurrence / OPS :** devise, taux absent, prix nul, coût partiel, historique ; tests décimaux, droits et export sans fuite ; paramètres documentés et validés selon contexte.
- **Acceptation :** modifier un scénario ne change pas le prix publié ; sans coût complet, aucune marge définitive n'est affichée.
- **Dépendances / exclusions :** F043/F040 ; pas de conseil tarifaire automatique ou de conformité fiscale présumée.

### BB-F-045 — Stock par produits et journal de mouvements

- **État observé :** absente.
- **Priorité / horizon / effort :** SHOULD | V2 | XL.
- **Valeur / parcours :** enregistrer réception, consommation et ajustement en expliquant l'origine de chaque quantité.
- **Règles et cas limites :** unité de stock par produit et conversions compatibles ; mouvements immuables, corrections par contre-mouvement ; pas de déduction sur simple consultation d'une recette. Politique de stock négatif explicite ; un retry ne produit jamais un deuxième mouvement.
- **Données / API / droits :** StockItem, StockMovement avec raison, auteur, référence et idempotency-key unique dans le scope ; solde calculé ou matérialisé transactionnellement et réconciliable ; composite FK.
- **Qualité / concurrence / OPS :** deux consommations simultanées, transaction échouée, bouteille entamée, mesure inconnue, import ; tests réels de verrouillage/soldes ; audit, sauvegardes et volumes à dimensionner.
- **Acceptation :** pour 100 ML disponibles, deux consommations de 60 ne peuvent aboutir à un état non autorisé par la politique ; rejouer une réception identifiée conserve un seul mouvement.
- **Dépendances / exclusions :** F009/F030/F011 ; pas d'event sourcing générique ni de stock automatiquement déduit d'une vente inexistante.

### BB-F-046 — Inventaires, pertes, seuils et ruptures

- **État observé :** absente.
- **Priorité / horizon / effort :** SHOULD | V2 | L.
- **Valeur / parcours :** compter les produits, rapprocher le théorique et le réel, expliquer casse/pertes et préparer un réassort.
- **Règles et cas limites :** session d'inventaire avec instant/périmètre ; prise en compte des mouvements survenus pendant comptage ; validation séparée d'un simple brouillon ; seuil par produit, alertes sans répétition infinie. Ne pas remplacer un solde sans mouvement explicatif.
- **Données / API / droits :** InventorySession/Count et ajustements liés au ledger ; permissions validation ; version et date de mesure ; raison requise pour perte.
- **Qualité / concurrence / OPS :** comptage partagé, mouvements en service, abandon, unité incompatible, correction après validation ; tests de rapprochement ; alertes et rétention approuvées.
- **Acceptation :** valider deux fois le même inventaire ne crée pas deux ajustements ; un écart explique quantité mesurée, mouvement intermédiaire et correction finale.
- **Dépendances / exclusions :** F045 ; pas de valorisation comptable certifiée.

### BB-F-047 — Fournisseurs, conditionnements et commandes

- **État observé :** absente.
- **Priorité / horizon / effort :** COULD | V2 | XL.
- **Valeur / parcours :** préparer une commande depuis les ruptures, comparer les conditionnements et enregistrer une réception partielle.
- **Règles et cas limites :** brouillon → validée → envoyée/commandée → réception partielle/complète ; prix et taxes conservés selon contrat ; annulation ne supprime pas les réceptions déjà faites ; contacts fournisseurs privés. Aucun email/commande réelle envoyé automatiquement sans autorisation dédiée.
- **Données / API / droits :** Supplier, Offer, PurchaseOrder, Receipt ; droits achat ; création des mouvements de réception idempotente et transactionnelle.
- **Qualité / concurrence / OPS :** livraison partielle, produit de remplacement, prix changé, devises, double réception, litige ; tests ledger/permissions ; éventuel connecteur payant soumis à accord.
- **Acceptation :** recevoir 6 unités sur 12 conserve 6 restantes ; rejouer la réception n'ajoute pas à nouveau le stock.
- **Dépendances / exclusions :** F030/F043/F045/F046 ; pas d'EDI ou achat automatique dans la V1/V1.1.

### BB-F-048 — Statistiques utiles et suivi de l'exploitation

- **État observé :** absente.
- **Priorité / horizon / effort :** COULD | V2 | L.
- **Valeur / parcours :** voir les recettes utilisées, préparations, coûts et pertes, avec période et source compréhensibles.
- **Règles et cas limites :** consultation ≠ consommation ≠ vente ; pas de chiffre d'affaires sans source de ventes ; fuseau/périodes définis ; aucune surveillance individuelle par défaut. Indicateurs partiels signalés et agrégations respectant les droits financiers.
- **Données / API / droits :** événements minimaux ou agrégations ledger ; accès workspace, pas global ; pagination des détails et bornes de période.
- **Qualité / concurrence / OPS :** événements retardés/doublons, heure d'été, modifications historiques, petits effectifs ; tests agrégats et confidentialité ; durée de rétention et coût à valider.
- **Acceptation :** une ouverture de fiche n'augmente pas les ventes ; un événement rejoué ne double pas la préparation ; l'utilisateur voit la source de chaque indicateur.
- **Dépendances / exclusions :** F011/F038/F043/F045 ; pas de dashboards décoratifs avant disponibilité de données fiables.

## J. Expérience utilisateur et performances

### BB-F-049 — Expérience mobile et filtres repliables

- **État observé :** partielle — responsive CSS existant, filtres trop présents.
- **Priorité / horizon / effort :** MUST | V1 | M.
- **Valeur / parcours :** trouver une recette avant de parcourir une pile de filtres ; gestes simples en service.
- **Règles et cas limites :** recherche visible, filtres secondaires repliables avec compteur actif, reset, titre du dossier/contexte ; ouverture/fermeture au clavier, focus restauré ; ne pas perdre les paramètres quand le panneau se ferme. Pas de débordement horizontal.
- **Données / API / droits :** état URL F026, aucun nouveau droit ; résultat vide et erreur distincts, loading sans saut massif.
- **Qualité / concurrence / OPS :** 320/390/430/768 px, paysage, zoom200 %, clavier virtuel, nom long, safe-area ; tests navigateur + contrôle manuel ; budget asset mobile.
- **Acceptation :** sur 390 px les contrôles secondaires n'occupent pas cinq rangées permanentes ; les mêmes filtres produisent le même résultat desktop/mobile.
- **Dépendances / exclusions :** F026/F050/F052 ; pas de refonte complète de l'identité visuelle.

### BB-F-050 — Accessibilité, thèmes et cohérence d'interface

- **État observé :** partielle — thèmes et patterns accessibles présents, vérification visuelle manquante.
- **Priorité / horizon / effort :** MUST | V1 | L.
- **Valeur / parcours :** tout parcours critique utilisable au clavier, avec lecteur d'écran et thèmes clair/sombre/contraste.
- **Règles et cas limites :** focus visible et ordonné, labels accessibles, messages associés aux champs, premier invalide accessible, états asynchrones annoncés sans bruit excessif ; conserver aria-activedescendant de l'autocomplete. Animation respectant la réduction de mouvement.
- **Données / API / droits :** préférence locale ou F005 ; aucun thème ne modifie le sens des données ; stockage indisponible n'empêche pas l'accès.
- **Qualité / concurrence / OPS :** axe ou équivalent + tests clavier/lecteur d'écran/contrastes/zoom ; sélecteur de thème Escape et retour focus ; tests dans navigateurs cibles ; tokens existants conservés.
- **Acceptation :** créer et classer une recette entièrement au clavier ; l'erreur d'une dose est annoncée avec son champ ; trois thèmes restent lisibles à 200 %.
- **Dépendances / exclusions :** F049/F057 ; pas de revendication de conformité formelle sans audit adapté.

### BB-F-051 — Saisie protégée, erreurs et récupération

- **État observé :** partielle — erreurs/retry présents, pas de protection de brouillon.
- **Priorité / horizon / effort :** MUST | V1 | M.
- **Valeur / parcours :** ne pas perdre une recette en changeant de route ou lors d'une reconnexion ; distinguer échec certain et résultat serveur inconnu.
- **Règles et cas limites :** guard de sortie sur formulaire modifié, confirmation explicite ; brouillon privé borné avec compte/espace, durée et effacement définis ; ne jamais montrer le brouillon de A à B sur appareil partagé. Pas de répétition aveugle d'un POST après timeout ; messages de validation concrets.
- **Données / API / droits :** choix mémoire/local/serveur proportionné au besoin ; stockage de token et brouillon distincts ; identifiant de création rejouable si adopté ; déconnexion volontaire purge selon politique annoncée.
- **Qualité / concurrence / OPS :** refresh, navigation, stockage bloqué, session expirée, double submit, response perdue après commit ; tests de récupération et confidentialité ; doc de ce qui est sauvegardé.
- **Acceptation :** quitter une recette modifiée demande confirmation ; après reconnexion du même compte le brouillon prévu est récupérable ; connexion d'un autre compte ne révèle rien.
- **Dépendances / exclusions :** F003/F014/F015 ; pas de sync offline complète en V1.

### BB-F-052 — Budgets de performance et volumes réalistes

- **État observé :** partielle — lazy routes, pagination, limites suggestions, budgets build.
- **Priorité / horizon / effort :** MUST | V1 | M.
- **Valeur / parcours :** chargement utile sur téléphone et résultats cohérents avec un vrai carnet.
- **Règles et cas limites :** objectifs mesurés sur environnement défini ; garder données synthétiques, réseau/CPU et percentile ; index après EXPLAIN/mesure, pas d'optimisation spéculative. Placeholder réduit et images responsives ; catalogues bornés.
- **Données / API / droits :** jeux 1 000 puis 10 000 recettes/espace ; recherche contains réévaluée ; index trigram éventuel seulement si nécessaire ; aucune requête de benchmark sur production sans accord.
- **Qualité / concurrence / OPS :** temps réponse p95, volume JSON, LCP/CLS mesurés, 0/24/25 résultats et 200 catalogues ; budgets initiaux à fixer avec la baseline, pas chiffres inventés ; profil DB et capacité VPS.
- **Acceptation :** une qualification reproductible explique les régressions de poids/latence et fait échouer un dépassement de budget approuvé ; aucune liste n'est tronquée en silence.
- **Dépendances / exclusions :** F013/F026/F034/F057 ; pas de Redis/moteur de recherche sans mesure.

### BB-F-053 — PWA et consultation hors connexion

- **État observé :** absente.
- **Priorité / horizon / effort :** LATER | Long terme | XL.
- **Valeur / parcours :** consulter une sélection de recettes durant une coupure de réseau dans un bar.
- **Règles et cas limites :** cache privé par compte/espace, consentement au téléchargement local, limite/expiration, logout purge ; une révocation de droit ne peut pas effacer instantanément un appareil déconnecté. Édition offline distincte, conflits de version explicites et pas de promesse de stock exact hors ligne.
- **Données / API / droits :** manifest de sélection/version et médias, IndexedDB/service worker si retenu ; statut offline visible ; mutations en attente seulement dans une phase ultérieure validée.
- **Qualité / concurrence / OPS :** changement de compte, cache périmé, stockage plein, retour réseau, migration du cache ; tests navigateur offline et sécurité ; politique de rétention locale.
- **Acceptation :** une recette téléchargée affiche sa version et l'état hors ligne ; une recette jamais téléchargée n'est pas faussement vide ; aucun cache A visible à B.
- **Dépendances / exclusions :** F003/F021/F034 ; report tant que valeur terrain non validée ; pas de stock offline automatique.

### BB-F-054 — Langues et préférences régionales

- **État observé :** partielle — libellés français et format fr-FR, pas d'i18n.
- **Priorité / horizon / effort :** LATER | Long terme | L.
- **Valeur / parcours :** utiliser les fiches avec une équipe multilingue et formats de nombres compréhensibles.
- **Règles et cas limites :** traduire interface et contenu éditorial sont deux fonctions différentes ; nom/slug canonique non réécrit lors d'un changement de langue ; dates UTC stockées et fuseau d'affichage choisi ; unité US oz seulement avec convention explicite.
- **Données / API / droits :** préférences locale/timezone ; contenu traduit versionné si besoin, fallback visible ; valeurs API canoniques inchangées.
- **Qualité / concurrence / OPS :** virgules/décimales, longs labels, dates d'été, traduction manquante, formats export ; tests de localisation et budgets bundles ; coût traduction validé.
- **Acceptation :** changer de langue n'altère aucune quantité ou date stockée ; un contenu non traduit reste affiché avec son origine, sans traduction inventée.
- **Dépendances / exclusions :** F005/F029 ; pas de traduction automatique imposée.

## K. Qualité, administration et exploitation

### BB-F-055 — Santé, logs structurés et supervision

- **État observé :** partielle — logs framework, Hello World, health PostgreSQL local.
- **Priorité / horizon / effort :** MUST | V1 | M.
- **Valeur / parcours :** détecter une panne et diagnostiquer une requête sans consulter les recettes privées.
- **Règles et cas limites :** liveness processus différente de readiness DB/migrations/dépendances ; temps de réponse borné ; erreurs publiques sans stack ; request-id, statut, durée et identifiants techniques minimisés. Ne pas journaliser corps auth, cookies, URL signée privée ou recette entière.
- **Données / API / droits :** endpoints santé publics minimaux et diagnostic protégé/interne ; métriques limitées, événements métier F011 séparés.
- **Qualité / concurrence / OPS :** DB indisponible, démarrage incomplet, disque plein, log volumineux et shutdown ; rotation/rétention, alertes certificat/disque/DB ; tests d'erreurs et redaction.
- **Acceptation :** DB coupée rend readiness négative sans fuite de connexion ; une erreur utilisateur peut être corrélée aux logs via request-id ; aucun mot de passe n'y apparaît.
- **Dépendances / exclusions :** F058/F059 ; pas de stack d'observabilité lourde imposée.

### BB-F-056 — Sauvegardes, restauration et rétention

- **État observé :** absente dans le dépôt ; VPS inconnu.
- **Priorité / horizon / effort :** MUST | V1 | L.
- **Valeur / parcours :** récupérer données et photos après panne, erreur ou perte du serveur.
- **Règles et cas limites :** DB + fichiers + manifeste de version cohérents ; sauvegarde hors machine et chiffrée ; secrets d'accès hors Git ; rétention et RPO/RTO D7 ; restauration dans cible isolée avant toute restauration réelle. Un volume Docker n'est pas une sauvegarde.
- **Données / API / droits :** procédures d'exploitation, checksums, version migrations et release ; pas d'endpoint utilisateur de restauration arbitraire.
- **Qualité / concurrence / OPS :** sauvegarde corrompue/incomplète, média manquant, espace disque, clé perdue ; exercice de restauration horodaté et mesure du temps ; notification d'échec du job.
- **Acceptation :** restaurer sur une instance vierge permet connexion, lecture de recettes et médias cohérents ; la procédure note les données potentiellement perdues depuis le point récupéré.
- **Dépendances / exclusions :** D7, F034/F055 ; aucune manipulation de sauvegarde production sans accord.

### BB-F-057 — CI, contrats, DB, sécurité et dépendances

- **État observé :** partielle — deux quality jobs réellement verts, couverture incomplète.
- **Priorité / horizon / effort :** MUST | V1 | L.
- **Valeur / parcours :** chaque PR donne une preuve reproductible avant merge.
- **Règles et cas limites :** conserver noms requis et actions épinglées ; Node/lockfiles contrôlés, zéro warning lint ; lint/build/unit frontend/backend, validation Prisma, DB migrations et tests hostiles, contrats HTTP et navigateur critique ; audit deps actuel avec exceptions motivées, jamais faux green si tests ignorés.
- **Données / API / droits :** PostgreSQL éphémère, fixtures synthétiques et secrets CI non réutilisés ; OpenAPI ou schéma de contrat versionné et vérifié ; permissions lecture en CI non trusted, secrets de déploiement indisponibles aux PR.
- **Qualité / concurrence / OPS :** tests d'échec volontaire du gate, logs/artefacts sans secrets, concurrence annulée par PR, différencier échec réseau advisory et résultat propre ; rapports conservés avec SHA.
- **Acceptation :** une FK ou un DTO incompatible fait échouer la PR ; le check requis ne passe pas si un sous-job requis est skipped/failed ; la branche dossiers n'est pas déclarée verte sans run observé.
- **Dépendances / exclusions :** A003/A004, F060 ; aucun changement de protection GitHub pendant la phase A.

### BB-F-058 — Releases, déploiement contrôlé et rollback

- **État observé :** absente ; cible VPS/Nginx/Docker seulement documentée.
- **Priorité / horizon / effort :** MUST | V1 | XL.
- **Valeur / parcours :** livrer depuis une PR validée, identifier la release active et revenir à la précédente en cas d'échec.
- **Règles et cas limites :** construire une fois par SHA, image/digest immuables ; environnement production protégé, déploiements sérialisés ; migration compatible avant bascule, readiness, smoke puis trafic ; rollback applicatif seulement si DB compatible ; jamais un down-migration destructif automatique.
- **Données / API / droits :** image API non root, Angular statique versionné, PostgreSQL et médias persistants ; utilisateur de déploiement limité, réseau API/DB privés ; secrets hors Git.
- **Qualité / concurrence / OPS :** inventaire VPS, staging, release rompue, bascule ratée, migration échouée, signaux shutdown ; sauvegarde et journal release ; limite de disponibilité mono-VPS explicitée.
- **Acceptation :** une image non prête ne reçoit aucun trafic ; panne de smoke garde ou rétablit la release compatible précédente ; commit/digest/date/migrations sont retrouvables.
- **Dépendances / exclusions :** D7/D8, F055/F056/F057 ; zéro downtime absolu, Kubernetes et migration OS non demandés exclus.

### BB-F-059 — Administration limitée, quotas et maintenance

- **État observé :** absente hors configuration technique.
- **Priorité / horizon / effort :** SHOULD | V1.1 | M.
- **Valeur / parcours :** limiter l'espace disque/abus et effectuer une maintenance sans ouvrir un accès général aux recettes des utilisateurs.
- **Règles et cas limites :** politique owner/support distincte ; pas de rôle global super-admin donnant lecture à tout par commodité ; quotas explicites et erreurs compréhensibles ; diagnostics non sensibles, opérations de purge revues et tracées.
- **Données / API / droits :** configuration des limites, compteurs réconciliables ; endpoints internes seulement si nécessaires ; action destructive avec réauthentification/confirmation appropriée.
- **Qualité / concurrence / OPS :** uploads simultanés au seuil, compteur périmé, disque plein, nettoyage interrompu ; tests intégrité et audit ; journal maintenance et alertes.
- **Acceptation :** dépasser un quota ne corrompt ni recette ni média existant ; une opération de support ne permet pas de télécharger le carnet d'un utilisateur sans autorisation définie.
- **Dépendances / exclusions :** F033/F055/F056 ; pas de back-office universel en V1.

### BB-F-060 — Pilotage versionné et relais Work ↔ Chat

- **État observé :** prévue uniquement par les documents de cadrage, pas de journal versionné actuel.
- **Priorité / horizon / effort :** MUST | V1 | S.
- **Valeur / parcours :** reprendre un bloc autorisé après interruption sans réécrire ni perdre des commits.
- **Règles et cas limites :** GitHub source du poussé ; un responsable actif par branche ; passation explicitement confirmée ; état local non poussé distinct ; documents roadmap/backlog/decisions/handoff cohérents et sans secrets. Aucun pourcentage de progression inventé.
- **Données / API / droits :** documents canoniques `docs/project/` proposés ; SHA complets, branche, base, PR/CI/tests/migrations réels, prochain micro-bloc et conditions d'arrêt ; créée seulement après accord phase B.
- **Qualité / concurrence / OPS :** reprise à blanc depuis GitHub, divergence de SHA, CI en cours, migration appliquée ailleurs inconnue ; contrôle remote après chaque commit/push ; handoff actualisé avant arrêt.
- **Acceptation :** une autre session peut identifier l'étape suivante sans relire le chat ; si le remote a changé, elle suspend les écritures jusqu'à réconciliation ; aucun test non exécuté n'est annoncé passé.
- **Dépendances / exclusions :** validation phase A et accès écriture ; pas de verrou technique prétendu par un simple YAML.

## L. Extensions exploratoires

### BB-F-061 — Suggestions explicables à partir des ingrédients disponibles

- **État observé :** absente.
- **Priorité / horizon / effort :** COULD | V2 | M.
- **Valeur / parcours :** proposer des recettes connues qu'on peut préparer et expliquer ce qui manque, plutôt qu'inventer un cocktail opaque.
- **Règles et cas limites :** moteur déterministe d'abord, catalogue autorisé uniquement, critères et manquants visibles ; degré/disponibilité inconnus signalés ; pas de recommandation alimentaire garantie ; popularité personnelle sans collecte globale implicite.
- **Données / API / droits :** calcul à partir de recettes et disponibilités/stock existants ; scores et raisons, pas de modèle ML nécessaire.
- **Qualité / concurrence / OPS :** rupture récente, synonymes et substitutions, aucun résultat, coût de calcul ; tests pertinence sur scénarios terrain ; pagination/cache scoped.
- **Acceptation :** chaque suggestion est une recette réellement accessible et explique les ingrédients pris en compte ; un filtre strict exclut une recette dont un ingrédient requis manque.
- **Dépendances / exclusions :** F027/F032, éventuellement F045 ; aucune IA payante requise.

### BB-F-062 — Assistance IA à l'import ou à la création

- **État observé :** absente.
- **Priorité / horizon / effort :** LATER | Long terme | XL.
- **Valeur / parcours :** convertir une photo/texte autorisé en proposition structurée, ou suggérer une variation à valider.
- **Règles et cas limites :** consentement avant envoi de recette privée, fournisseur/coût/rétention choisis ; proposition ≠ donnée validée ; nombres/unités/ABV/allergènes jamais inventés comme faits ; validation manuelle avant enregistrement, indication de provenance et champs incertains. Texte importé traité comme donnée, pas instruction système.
- **Données / API / droits :** job borné, quotas, résultats non publiés, secrets fournisseur côté serveur ; pas d'agent capable de supprimer ou publier un carnet.
- **Qualité / concurrence / OPS :** OCR ambigu, fractions, prompt injection dans document, panne, coût excessif, doublons ; corpus de validation et suivi budget ; D dédié avant tout service payant.
- **Acceptation :** une quantité illisible reste à confirmer ; aucune recette ni publication n'est créée sans validation humaine ; refus de l'envoi externe respecte le choix.
- **Dépendances / exclusions :** F042/F031/F059 ; étude seulement, pas d'intégration incluse dans V1/V2 par défaut.

### BB-F-063 — Intégrations tierces et API contrôlée

- **État observé :** absente.
- **Priorité / horizon / effort :** LATER | Long terme | XL.
- **Valeur / parcours :** importer un catalogue autorisé, exporter vers un outil choisi ou déclencher une automatisation.
- **Règles et cas limites :** vérifier API/licence/coût et but réel avant développement ; permissions minimales par workspace ; webhook signé, anti-rejeu, retries bornés, consentement sur données sortantes ; URLs distantes protégées contre SSRF.
- **Données / API / droits :** IntegrationConnection, secrets chiffrés, scopes, cursors/imports idempotents ; journal de synchronisation sans contenu privé. Synchronisation bidirectionnelle = nouvelle décision, pas conséquence d'un connecteur.
- **Qualité / concurrence / OPS :** API supprimée, rate limits, payload hostile, URL interne, doublons, révocation ; tests contrat fournisseur et file d'attente seulement si nécessaire.
- **Acceptation :** révoquer la connexion arrête les nouveaux échanges ; un webhook rejoué ne double pas l'import ; aucun accès aux métadonnées cloud/réseau privé par URL.
- **Dépendances / exclusions :** F009/F042/F059 ; fournisseur et périmètre non choisis, aucune promesse de compatibilité actuelle.

### BB-F-064 — Application mobile dédiée

- **État observé :** absente ; frontend web responsive existant.
- **Priorité / horizon / effort :** LATER | Long terme | XL.
- **Valeur / parcours :** étudier une app seulement si caméra, offline ou usages terrain dépassent durablement le web.
- **Règles et cas limites :** réutiliser contrats autorisés, stockage sécurisé et révocation ; éviter une deuxième logique métier ; plateformes, distribution et maintenance à budgéter ; aucune obligation React Native/Capacitor choisie aujourd'hui.
- **Données / API / droits :** client API supplémentaire, stratégie de session dédiée si nécessaire, notifications optionnelles et préférences ; versionnement des contrats.
- **Qualité / concurrence / OPS :** OS vieux, droits caméra refusés, réseau, changement compte, migration cache, stores ; sécurité mobile et coût de support.
- **Acceptation :** un prototype terrain démontre un gain mesuré face au web ; sans gain, rester sur le responsive/PWA.
- **Dépendances / exclusions :** F049/F053/F003 ; pas de développement natif maintenant.

### BB-F-065 — Commandes, caisse, POS et paiements

- **État observé :** absente.
- **Priorité / horizon / effort :** OUT | Hors programme proposé | XL.
- **Valeur / parcours :** piste possible pour tables, commandes, notes, partage d'addition et liaison à une caisse existante.
- **Règles et cas limites :** domaine métier autonome : annulations/remises/retours, clôture, fiscalité, argent et permissions ; aucun pilotage direct d'un TPE ou stockage de données carte ajouté au carnet. Étude fournisseur, exigences légales et responsabilités indispensable avant spécification exécutable.
- **Données / API / droits :** inconnus tant que système/API/protocoles réellement disponibles non identifiés ; ne pas importer les suppositions historiques sur un logiciel de caisse comme faits actuels.
- **Qualité / concurrence / OPS :** paiements partiels/doublons, déconnexion, stock, indisponibilité et audit nécessitent qualification spécifique ; coûts et sécurité distincts.
- **Acceptation d'étude :** produire documentation fournisseur vérifiée et décision go/no-go ; aucun bouton de paiement ou de vente fictivement opérationnel.
- **Dépendances / exclusions :** nouvelle mission approuvée, F045/F047 ; totalement exclu des V1/V1.1/V2 proposées.

### BB-F-066 — Carnet d'essais, dégustation et apprentissage personnel

- **État observé :** absente.
- **Priorité / horizon / effort :** COULD | V2 | M.
- **Valeur / parcours :** noter un essai, une modification et le résultat pour progresser en mixologie sans perdre la recette de référence.
- **Règles et cas limites :** observations subjectives, date/version et doses réellement essayées ; notes privées distinctes d'une carte d'équipe/publique ; notation personnelle optionnelle ; pas d'évaluation publique de personnes ni de contenu d'apprentissage non autorisé.
- **Données / API / droits :** TastingTrial user-owned rattaché à une recette autorisée/version, snapshot si nécessaire ; export personnel et suppression séparés.
- **Qualité / concurrence / OPS :** recette supprimée, essai hors ligne non synchronisé, photo privée, multiples versions ; tests droits/restitution ; rétention bornée.
- **Acceptation :** modifier une note d'essai ne modifie pas la recette de référence ; un collègue ne voit pas les notes personnelles de dégustation sans partage explicite.
- **Dépendances / exclusions :** F017/F021/F034 ; pas de réseau social ou cursus payant construit par défaut.

## Couverture du mandat et frontière des décisions

| Domaine du mandat | Fiches principales |
|---|---|
| A Comptes/sécurité | F001–F007 |
| B Workspaces/collaboration | F008–F012 |
| C Recettes | F013–F022, F066 |
| D Classement/découverte | F023–F027, F061 |
| E Ingrédients/mesures | F028–F032 |
| F Médias | F033–F034 |
| G Production au bar | F035–F039 |
| H Coûts/exploitation | F043–F048 |
| I Menus/partage/exports | F039–F042 |
| J UX | F049–F054 |
| K Administration/observabilité | F055–F060 |
| L Extensions | F061–F066 |

Les fiches V1 sont des bases de développement avec invariants et critères testables. Les fiches lointaines sont des **spécifications de cadrage** : leur passage en backlog exécutable exige découverte métier, choix des sources/fournisseurs et validation explicite. Leur donner aujourd'hui un schéma détaillé définitif ou une estimation ferme serait prématuré.
