> Archive de la phase A validée comme base de travail le 16 octobre 2026. Les autorisations actuelles figurent dans ../roadmap.md ; les propositions de cette archive ne valent pas accord de développement. Les états et preuves sont ceux de l’audit, à revérifier.

# Barbook — architecture cible, qualité et exploitation

**Conception proposée. Aucune configuration ni migration appliquée.** Préserver Angular/Nest/PostgreSQL/Prisma et la séparation workspace existante. Une nouvelle version majeure d'un outil n'est pas une raison suffisante pour migrer : les versions et API actuellement résolues restent la référence.

## 1. Architecture proportionnée

Un **monolithe modulaire** et une seule base PostgreSQL conviennent aux besoins observés. Le frontend et l'API partagent une origine via Nginx. Pas de microservices, bus d'événements, CQRS, event sourcing, Kubernetes, moteur de recherche ou Redis par défaut.

| Module | Responsabilités | Frontière à respecter |
|---|---|---|
| Auth / Sessions | Identité, mots de passe, sessions, récupération | Ne décide pas à lui seul de l'accès à un workspace |
| Workspaces | Résolution du personnel, membership et permissions futures | Vérification serveur à chaque opération sensible ; pas de rôle périmé dans JWT |
| Cocktails / Recipes | Identité, lecture, création, édition, état, règles de recette | Contrats HTTP dans controllers/DTO, invariants dans règles/services |
| Organization | Tags, dossiers, appartenances | Ni propriété exclusive ni copie de recette |
| Ingredients | Catalogue canonique et usages ; produits plus tard | Une création de recette ne modifie pas silencieusement la référence catalogue |
| Media | Validation, assets privés, accès, remplacement, nettoyage | Pas d'accès public par simple chemin disque |
| Operations | Santé, logs, version de release, tâches d'entretien bornées | Aucune route support donnant accès global aux données sans politique |
| Production / Cost / Stock | Modules futurs distincts, une fois approuvés | Calculer un plan ne crée pas un mouvement de stock ou une vente |

Controllers fins ; services d'usage orchestrant les transactions ; fonctions pures pour quantités/ABV/arrondis ; PrismaService central. Ajouter un repository uniquement pour une frontière réellement réutilisable ou complexe. Un wrapper par méthode Prisma n'apporterait pas de valeur. Extraire une résolution de workspace partagée lorsque le contexte de plusieurs modules justifie de centraliser la politique, sans transformer cette extraction en framework.

Angular : routes lazy par fonctionnalité, services HTTP typés, formulaires réactifs, composants de présentation ciblés, shared UI pour les patterns réellement réutilisés. Centraliser les labels/enums et le contrat réseau ; ne pas déplacer le métier dans le composant ni imposer un store global alors que des signals/services suffisent.

## 2. Modèle de propriété cible

- User : identité et préférences ; exactement un espace personnel créé transactionnellement ; 0..n memberships partagés.
- Workspace : propriétaire des recettes, ingrédients, dossiers, tags, médias et futures données métier.
- Cocktail : ID immuable ; slug de navigation stable ou alias explicite ; type structurel distinct du classement ; version pour préconditions ; états de cycle de vie seulement après D5.
- CocktailFolder : relation explicite workspace/cocktail/folder unique, avec deux FK composites ; dossiers plats.
- Recipe children : quantités canoniques Decimal, ordre et contraintes ; accéder à un enfant impose toujours l'autorisation du parent. Ajouter workspaceId à toutes les tables aveuglément n'est pas un objectif en soi.
- MediaAsset : workspace, objet/variantes, état, référence(s), métadonnées techniques minimales ; jamais secret en URL persistée publique par défaut.
- Produit, prix, stock, cartes, révisions : **migrations futures**, pas de tables anticipées pour les fiches LATER/OUT.

Une copie vers un autre workspace crée de nouveaux objets et remappe toutes les relations. Aucun changement de workspaceId d'un cocktail en place, aucun déplacement implicite ni synchronisation automatique. Les notes personnelles et favoris personnels demandent une portée user explicite s'ils apparaissent dans un espace partagé.

## 3. Contrats API et frontières frontend/backend

Garder les endpoints personnels actuels pendant la V1. Les futures routes partagées seront explicitement scoped, par exemple `/api/workspaces/:workspaceId/cocktails/:id`, avec contrôle de membership et de rôle serveur. Ne pas accepter simplement un header workspace sans validation. Ne pas casser les URL actuelles pour préparer hypothétiquement une application mobile.

Proposition de contrat d'organisation à stabiliser avant la bascule :

```json
{
  "folderIds": ["uuid-dossier-a", "uuid-dossier-b"],
  "tagNames": ["Agrumes"],
  "expectedVersion": 3
}
```

Les chaînes ci-dessus illustrent les champs : les tests emploieront de vrais UUID. Réponse avec `folders[]`, `tags[]` et version nouvelle. Le remplacement d'ensemble de la fiche diffère des commandes additives/retraits depuis un dossier. Ces dernières ne doivent pas effacer les autres collections. Définir un seul mécanisme de précondition, version de corps ou If-Match, pas les deux sans motif.

| Sujet | Proposition |
|---|---|
| Erreurs | Statut HTTP correct, code métier stable, message utilisateur traduisible, erreurs de champs quand utiles, request-id |
| Non visible | 404 uniforme pour détail privé absent/étranger ; 403 pour action interdite dans un espace dont l'utilisateur connaît légitimement l'existence |
| Null | Contrat écrit par champ ; null/absent/vide testés séparément ; pas de cast pour faire disparaître l'ambiguïté |
| Décimales | Garder l'exactitude métier dans les calculs ; nombres bornés pour recette, Decimal/chaînes décimales adaptées aux coûts futurs ; précision d'affichage indépendante |
| Pagination | Valeurs par défaut, maximum, offset sûr et tri stable ; retour page vide cohérent ; pas de cursor pagination avant besoin démontré |
| Idempotence | PUT/DELETE add/remove de liens ; clé d'opération pour import, copie, mouvement et production rejouables ; ne pas répéter automatiquement un POST après timeout |
| Documentation | OpenAPI ou schémas HTTP versionnés, exemples et tests de contrat ; générer les types clients si cela supprime une duplication effective, sans réécrire tous les DTO |

Les garanties de transaction n'impliquent pas un snapshot de lecture stable en Read Committed. Le choix d'isolation doit suivre l'invariant : précondition/version pour l'édition, ordre de verrouillage déterministe pour les lots, retries bornés uniquement pour les conflits transitoires identifiés. La base est la dernière défense d'intégrité ; elle ne remplace pas l'autorisation.

## 4. Sessions et médias : décision conjointe

D2 doit précéder les médias privés. Pour un produit web mono-origine, recommandation : session serveur opaque en cookie `Secure`, `HttpOnly`, `SameSite` approprié, identifiant aléatoire stocké haché, expiration inactive/absolue, rotation aux événements sensibles et révocation. Avantage : un mécanisme unique pour API et images. Coût : adapter le contrat d'auth existant et ajouter la protection CSRF/Origin sur les mutations.

Alternative crédible, proche de la piste ADR 0002 : JWT d'accès en mémoire et refresh rotatif en cookie HttpOnly. Elle exige gestion du refresh/rejeu/onglets et chargement privé des images via requête authentifiée puis blob/objectURL. Le cookie de refresh n'est pas une session d'accès aux images. Les URL signées courtes sont une autre option, avec accès transférable et révocation différée : pas le défaut pour une V1 privée.

Dans tous les cas : pas de token dans URL, logs ou localStorage ; pas de CORS large avec credentials ; HTTPS ; protections XSS/headers ; aucun secret de production dans la documentation. Les cookies HttpOnly réduisent le vol du secret par JavaScript mais n'empêchent pas une XSS d'agir avec la session : les autres défenses restent nécessaires.

Source de conception : [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html). Les durées exactes et la persistance sur appareil partagé sont des choix D2, pas des valeurs imposées ici.

## 5. Transition des dossiers : ordre et conditions d'arrêt

| Étape | Ce qui doit être prouvé | Arrêt / retour possible |
|---|---|---|
| Inventaire | SHA, migrations effectivement appliquées par environnement, anciens binaires/clients/scripts écrivains, sauvegarde | Si état DB inconnu : pas de migration |
| EXPAND existant | Table, index, FK, backfill complet ; tests depuis fixture historique | Ancienne application compatible ; ne pas modifier le SQL poussé |
| Double écriture | Tous les chemins d'écriture concernés pris en charge ; lignes legacy et nouvelles cohérentes | Revenir à un binaire ancien nécessite de ne pas avoir activé les multiples |
| Rattrapage | Changements survenus dans la fenêtre entre EXPAND et double écriture réconciliés ; anti-jointures vides | Incohérence = suspendre read switch, pas effacer des lignes au hasard |
| Lecture compatible | Liste/détail/filtres et frontend comprennent folders[] ; contrat des anciens clients défini | Ancien champ temporaire possible uniquement si sa signification est sûre |
| Activation multi | Aucun écrivain ancien ne peut remplacer n liens par 1 ; opérations de dossier additive/retrait correctes | À partir de là, rollback vers le vieux modèle peut perdre une sémantique : pas de retour aveugle |
| CONTRACT séparé | Aucun usage legacy, période de vérification, sauvegarde/restauration et accord de suppression | Retirer folderId et FK historique est destructif ; consentement distinct requis |

Le comptage égal ne suffit pas : vérifier les clés exactes et le workspace, les liens manquants, les liens en trop et les orphelins. La migration SQL actuelle est transactionnelle mais ne rend pas atomique l'ensemble du déploiement applicatif réparti dans le temps. Éviter de tenir une très longue transaction de backfill en production sans qualification du volume et des verrous.

Une petite V1 mono-instance peut préférer un créneau bref de suspension d'écriture lors de la reconciliation à un mécanisme de synchronisation beaucoup plus complexe. Le choix dépend de la base réelle et de l'objectif de disponibilité approuvé, pas du mot « expand » seul.

## 6. Stratégie de test par risque

| Couche | Risques protégés | Preuves attendues |
|---|---|---|
| Unitaire métier | ABV, conversions, règles recette, arrondis de batch, invariants de rôle | Tables de cas, limites/null/0, propriétés utiles ; pas seulement mocks d'appel |
| Validation/contrat HTTP | DTO, transformations, statut, auth, refus des propriétés étrangères | Bootstrap réel partagé : préfixe `/api`, ValidationPipe, guards et erreurs |
| Intégration PostgreSQL 16 | CHECK, FK composites, unicité, rollback, isolation, concurrence | Vraie DB éphémère, client Prisma réel, deux utilisateurs + espaces ; pas de base personnelle |
| Migrations | Installation vierge, upgrade depuis fixtures, backfill, compatibilité | Migrations appliquées uniquement en environnement test en phase B ; schéma/données contrôlés |
| Angular composants/services | États UI, conversions, erreurs, focus/ARIA, annulation HTTP | HttpTestingController, routeur réel pour les segments réservés, tests ciblés |
| Navigateur | Login→création→détail→classement→édition, expiration, mobile, images | Playwright ou équivalent ; navigateur réel/émulé, trace d'échec et captures sans secrets |
| Qualif non fonctionnelle | Charge raisonnable, réseau mobile, accessibilité, disque/DB indisponibles | Jeux synthétiques, environnement et seuils définis, tests de panne/staging |
| Exploitation | Packaging, start, readiness, migration avant trafic, rollback, restauration | Image finale réellement démarrée et exercice de recovery documenté |

Matrice minimale hostile : ressource de A lue/éditée/attachée par B ; ID étranger comme folder/tag/ingredient/media ; membre révoqué ; rôle insuffisant ; deux mises à jour de la même version ; duplicate slug/email sous concurrence ; échec après première écriture ; retry après commit ; migration sur anciennes données incohérentes. Tester les FK aussi en SQL/Prisma direct pour vérifier la seconde défense.

Le test E2E Hello World actuel ne suffit pas. Les fixtures ne doivent pas dépendre du seed des recettes d'Alex. Un reset est limité à une DB éphémère créée pour le test et n'est jamais une commande de maintenance par défaut. La phase A n'a appliqué aucune migration, même de test.

Couverture : mesurer après mise en place, cibler les branches de risque ; pas de seuil 100 % artificiel. Les scénarios critiques doivent rester obligatoires même si la couverture chiffrée est élevée. Les tests du tactile, de la luminosité en service et du lecteur d'écran demandent encore une validation manuelle utile.

## 7. CI cible

Conserver les jobs requis **Backend Quality** et **Frontend Quality** comme gates stables. Les étapes supplémentaires peuvent être dans ces jobs ou derrière un agrégateur dont les dépendances échouées/skipped font réellement échouer le check ; ne jamais avoir un gate vert parce que les tests importants n'ont pas tourné.

1. Checkout en lecture, actions épinglées, Node24 maîtrisé, lockfiles et npm cohérents ; pas de secret de déploiement accessible à une PR.
2. `npm ci` reproductible ; politique de scripts d'installation examinée ; génération Prisma contrôlée.
3. Lint zéro warning, build, Jest/Vitest ; validation du schéma.
4. Service PostgreSQL éphémère, migrations, tests DB et HTTP ; fixture d'upgrade pour les changements concernés.
5. Navigateur pour les parcours critiques et vérifications d'accessibilité ciblées ; rapports d'échec.
6. Audit dépendances courant, distinction prod/tooling, analyse des exceptions bornée et datée ; scan secrets (arbre/historique selon outil), image/SBOM avant release.
7. Diff propre, contrats/docs pertinents vérifiés ; aucune publication depuis un code PR non fiable.

Le pipeline actuel s'exécute sur PR vers main et push sur main, **pas** sur simple push de feature. Cela explique l'absence de run de la branche dossiers et n'autorise pas une PR avant Review Gate. Avant la première PR de reprise, lancer les vérifications disponibles localement ; une évolution de déclencheur CI par push feature peut être proposée si elle évite cette fenêtre, avec contrôle des coûts et de la duplication des runs.

Les advisories ne sont pas des preuves automatiques d'exploitation. Les exceptions doivent citer version, chemin, conditions d'exposition, mitigation, responsable et date de réexamen ; pas d'exemption générale « dev donc sans risque ». Ne pas introduire de mise à jour majeure globale pour satisfaire un outil.

## 8. Packaging et environnement de production

| Composant | Proposition initiale | Vérifications avant usage |
|---|---|---|
| Nginx host | TLS, statique Angular, proxy `/api`, limites/headers | Configuration actuelle d'autres sites, API seulement derrière proxy, `X-Forwarded-For` correct, SPA fallback sans masquer 404 API |
| Angular | Build production versionné, assets hashés | `index.html` revalidé, assets avec cache approprié, anciennes références d'assets conservées pendant transition |
| API | Image multi-stage, utilisateur non root, healthchecks, arrêt gracieux | Client Prisma généré et dépendances runtime incluses ; aucun `.env`/source sensible ; limite mémoire/concurrence |
| PostgreSQL | Version majeure16 au départ, stockage persistant, réseau privé | Migrations réelles, utilisateur applicatif limité, utilisateur migration séparé si pertinent, sauvegardes, monitoring |
| Médias | Volume privé hors répertoire statique public | Permissions, quota, transformations bornées, backup et GC |
| Secrets | Fichier/environnement protégé hors Git ou gestionnaire adapté | Rotation, minimum de droits, jamais dans build Angular ou logs |

**Risque de packaging à vérifier :** `start:prod` pointe aujourd'hui vers `node dist/main`. Le tsconfig de build n'exclut pas `prisma.config.ts` et `prisma/seed.ts`, hors de `src`. La position exacte du fichier compilé et le packaging runtime doivent être prouvés par un smoke test de l'image finale ; le simple succès `nest build` ne certifie pas cette commande de démarrage. Aucun résultat d'exécution de ce start n'est prétendu ici.

Les mots de passe d'exemple/CI ne sont pas des secrets de production. Le profil production doit refuser une configuration de démonstration et les origines invalides. Déclarer les ports et flux permis ; une variable d'environnement manquante doit faire échouer le démarrage clairement. Composer PostgreSQL sur 127.0.0.1 ne prouve pas que l'API est inaccessible directement depuis Internet.

## 9. CD et disponibilité minimale réaliste

Le flux cible est : branche → checks locaux → commit/push/checkpoint → Review Gate → PR → CI → merge autorisé → release construite → staging → autorisation production → déploiement sérialisé → contrôles → journal de release.

Sur un VPS unique, une bascule **blue/green légère** peut réduire l'interruption si mémoire/CPU suffisent : Nginx garde l'ancienne API, la nouvelle démarre sur un autre upstream, readiness et smoke passent, puis reload atomique de la configuration et drainage de l'ancienne instance. Les fichiers Angular sont promus via répertoire de release ; conserver les assets précédents évite de casser les navigateurs déjà ouverts. DB et médias restent partagés et persistants.

Contraintes : pas de garantie de disponibilité en cas de panne du VPS ou de migration bloquante ; deux versions API doivent accepter le même schéma ; deux instances doublent temporairement les compteurs mémoire du throttler. Une limite Nginx partagée et une stratégie de session DB commune peuvent couvrir le chevauchement ; sinon choisir une maintenance brève documentée ou un store partagé si son besoin est confirmé. Ne pas ajouter Redis uniquement pour donner un nom à l'architecture.

### Séquence de release proposée

1. Vérifier SHA approuvé, CI, environnement, capacité disque, backup récent et compatibilité DB N/N-1.
2. Sérialiser avec un verrou de déploiement ; ne jamais exécuter deux migrations/reloads concurrents. Build en CI, pas de compilation ad hoc sur VPS avec secrets.
3. Télécharger/vérifier l'image par digest et préparer le frontend versionné ; les credentials registry sont limités à la lecture sur le serveur.
4. Appliquer uniquement les migrations compatibles validées, avec timeouts/verrous observés ; si échec, ne pas promouvoir. CONTRACT hors de cette automatisation par défaut.
5. Démarrer l'API candidate, vérifier readiness et migration attendue ; smoke authentifié sur une fixture dédiée autorisée, sans données personnelles.
6. Basculer le trafic, vérifier liste/détail/média/auth et taux d'erreur, conserver l'ancien binaire pour un délai défini.
7. Journaliser digest, commit, migrations, heure, résultat et rollback possible ; nettoyer les vieilles releases selon rétention, pas les volumes métiers.

### Retour arrière

| Échec | Réponse |
|---|---|
| Build/test/image invalide | Pas de release |
| Migration incompatible ou inconnue | Arrêt avant bascule, diagnostic ; aucune suppression automatique |
| Candidate non prête | Garder l'ancienne API, corriger la candidate |
| Smoke après bascule échoué | Retour au binaire précédent **si schéma compatible**, suivi et journal |
| CONTRACT déjà appliqué | Ancien binaire potentiellement incompatible : roll-forward contrôlé ou restauration approuvée avec perte potentielle mesurée |
| Corruption/perte de données | Incident, gel approprié, restauration sur cible isolée puis plan approuvé ; jamais écraser une DB active par réflexe |

Le modèle de sécurité de CD est à valider : environnement GitHub protégé, secrets minimaux, branche main seulement, protection contre contenu non fiable, utilisateur de déploiement restreint. [GitHub — environnements](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments). Aucun accès SSH ni droit d'admin GitHub disponible n'est présumé.

## 10. Maintenance, sauvegardes et incidents

RPO/RTO proposés à discuter : sauvegarde quotidienne avec perte acceptable maximale 24 h et objectif de récupération 4 h pour une bêta, à mesurer et à adapter. Ce sont des objectifs à approuver, pas des garanties du serveur actuel. Pour usage en service avec stock, les exigences peuvent devenir plus strictes et demander WAL/PITR, davantage de coûts et une autre architecture de sauvegarde.

Sauvegarder hors VPS : DB, médias, manifeste de release/migrations, configuration non secrète ; conserver les clés de récupération séparément. Vérifier checksums, cohérence, âge et espace ; alerter sur échec. L'exercice de restauration doit tester login, recette, dossiers et photos, pas seulement l'ouverture d'un dump.

Surveillance minimale : API/readiness, erreurs, latence, saturation pool DB, stockage/DB/médias/logs, sauvegarde récente, certificat/TLS et ressource du VPS. Procédures courtes : DB inaccessible, disque plein, image refusée, migration en erreur, session/clé compromise, sauvegarde inutilisable. Logs structurés et rotation ; ne pas installer une plateforme de monitoring lourde avant de mesurer son utilité.

## 11. ADR proposés

| ADR | Décision à formaliser | Statut |
|---|---|---|
| 0004 existant | Dossiers multiples, compatibilité et stratégie de transition | Compléter après validation, ne pas créer un doublon |
| Sessions web | Cookie opaque ou JWT mémoire+refresh, CSRF, durées et médias | D2 requis |
| Médias privés | Stockage, autorisation, transformations, quotas, rétention | D6 requis |
| Cycle de vie | Archivage/corbeille/purge, compte et espace partagé | D5 requis |
| Copie entre workspaces | Propriété unique, indépendance et provenance | D3 requis avant V2 |
| Releases VPS | Packaging, migration, bascule, rollback et backup | D7/D8 et inventaire serveur requis |

Aucune ADR pour un nom de variable, un simple helper ou une extraction cosmétique. Chaque ADR devra exposer contexte, options, décision, conséquences et limites, et renvoyer aux tests et procédures utiles.
