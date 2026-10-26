# BB1 — Design Review collaboration minimale ; incrément BB1a

26 octobre 2026, base main f4a905e3f0a2ad74b31c062353fb60ddbdccb09c qualifiée six contrôles :273 backend/229 frontend/226 PostgreSQL-HTTP/12 Chromium, audits zéro. L5/BB0 clos techniquement, preuves complètes dans PR38. Branche feature/bar-workspace-access publiée à cette base avant code. D3/D4 initiaux et D8 conditionnelle autorisent cet incrément.

## Inventaire et frontière
Workspace, WorkspaceMember et rôles OWNER/MEMBER existent. Les services de recettes, contenu, classement, dossiers et ingrédients résolvent actuellement personalOwnerId. WebSessionService décrit le workspace personnel ; AuthInterceptor compare ce contexte et AuthService confirme l'identité de DraftStore. Un sélecteur seul serait insuffisant et pourrait invalider/purger les mauvais brouillons.

Découpage court : BB1a autorisation serveur et gestion des membres ; BB1b bascule coordonnée contexte/API/UI pour lecture/création/édition partagées ; BB1c copie explicite et qualification de tous parcours. Aucun BB1 complet prétendu à la fin de BB1a. Les routes personnelles et la corbeille demeurent personnelles. Suppression/restauration partagée, fermeture/transfert/dernier propriétaire et changement de rôle ne sont pas activés.

## BB1a — contrats et données
GET /api/workspaces paginé : espaces personnels propres et partagés dont l'appelant est membre actif. GET /api/workspaces/:id : contexte partagé autorisé (id, nom, rôle, accessVersion). GET /api/workspaces/:id/members : liste paginée réservée OWNER. POST /api/workspaces/:id/members : email exact d'un compte existant, expectedAccessVersion ; POST /api/workspaces/:id/members/:userId/revoke : expectedAccessVersion. Aucun mail/invitation externe, inscription ou ajout implicite par domaine. Le compte cible doit déjà exister ; l'admission à l'inscription et l'autorisation d'espace restent deux responsabilités distinctes.

Ajouter Workspace.accessVersion entier non négatif, défaut0, et WorkspaceMember.revokedAt nullable. Les appartenances existantes restent actives. Retrait conserve la ligne et les données Bar ; réadmission explicite réactive MEMBER et avance accessVersion. Les intentions avant retrait/réadmission ne redeviennent pas valides. Ni auto-attribution OWNER, ni suppression/modification d'un OWNER par ces endpoints. Un doublon avec précondition fraîche est un no-op ; précondition absente/périmée409, invalide400 ; espace inaccessible404 sans fuite ; opérations OWNER refusées au MEMBER.

Le Bar initial et son OWNER doivent être provisionnés lors d'une opération OPS séparément autorisée ; aucun bouton générique de création d'espace ou élévation de rôle. Les tests créent uniquement des espaces et acteurs synthétiques sur DB jetable. Aucun compte réel ni donnée d'exploitation créé maintenant.

## Autorisation et concurrence
Service WorkspaceAccess dédié : transaction, verrou Workspace FOR NO KEY UPDATE, vérification kind SHARED, membership non révoqué et rôle avant le callback métier ; si mutation, comparer accessVersion fournie, jamais l'inférer. Révocation et écritures partagées futures emploient le même verrou. Une opération déjà ordonnée peut précéder un retrait ; après retrait, aucun nouvel accès autorisé. Les lectures déjà transmises à un appareil ne peuvent être effacées à distance.

WorkspaceMembershipService gère uniquement les commandes/listes de membres, contrôleur DTO fin. Pas de couche repository artificielle ni duplication des services recettes. Incrément de version et changement de membership dans la même transaction, capacité int32 vérifiée. Tests de rollback injecté et des deux ordres d'accès/révocation, deux commandes concurrentes et retrait/réadmission.

## BB1b/c — garde-fous de conception à préciser avant leur code
Routes partagées explicitement scoped ; vérifier toutes lectures/écritures, recherches/suggestions/compteurs, images référencées, anciens endpoints et FK. Réutiliser règles de contenu et transactions, aucune copie de service complète. Contexte sélectionné par onglet, reconfirmé côté serveur ; ne pas le transformer en un droit contenu dans le cookie. Changement explicite d'espace : garde de saisie, purge/invalidations selon L4, réponses tardives rejetées. Expiration involontaire conserve les brouillons jusqu'à identité et version reconfirmées ; déconnexion globale doit purger aussi les onglets dans un autre espace.

Copie personnelle→Bar explicite, nouvelle identité et relations remappées, pas de synchronisation ni FK interworkspace ; aperçu/confirmation pour notes et image, conservation honnête des sources/degrés ABV. Résoudre les collisions de catalogue et de slug explicitement avant écriture, sans changer une autre recette. Ces détails seront revus avant activation, pas improvisés dans BB1a.

## Migration, tests et Gate
Migration additive neuve transactionnelle, historiques immuables ; upgrade synthétique préserve comptes/memberships/recettes, défauts/CHECK et rollback DDL testés. Aucun down destructif. Ancien binaire personnel n'ouvre aucun accès partagé ; ne pas revenir à un futur binaire partagé ignorant revokedAt.

BB1a : tests DTO, HTTP/PostgreSQL de pagination/isolation/CSRF/rôles/préconditions/no-op/capacité, révocation réelle/réadmission, concurrence observée, rollback et migration ; suites personnelles et Chromium inchangés réexécutés. Aucun parcours UI Bar revendiqué avant BB1b/c. Revue entière, six checks dernier HEAD, merge D8 non destructif, main requalifié et checkpoint durable. Aucun seuil/timeout/retry abaissé.

Aucun arbitrage métier nouveau nécessaire pour BB1a. Risques restants : contexte UI/drafts et copie à qualifier dans leurs incréments, capacité réelle non prouvée. Aucun VPS, déploiement, migration propriétaire, service externe ou purge. D7 et préparation OPS restent séparés.
