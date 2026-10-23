# L5 B5c — Design Review préventive

23 octobre 2026. Base réellement qualifiée `58461d1cd3570a075cf38c23cee4327b660d03ff`, merge33 explicitement autorisé. Branche `feature/recipe-editing-ui` publiée sur cette base avant code. D1/D2/D5/L5-COMPAT-01B inchangés. Aucun arbitrage métier nouveau bloquant identifié.

## Besoin et contrats

Éditer complètement une recette personnelle depuis son détail : nom/type/famille/méthode/verre/glace/notes, alcool principal, ingrédients ordonnés avec mesures/spécifications/notes et modes ABV, garnitures et étapes. Route Angular dédiée par ID stable, avant la route par slug. GET/PUT `/api/cocktails/id/:id/content` existants ; aucun changement serveur requis. Slug, image, tags et dossiers sont hors formulaire et conservés par le serveur. Aucun endpoint de corbeille ou restauration activé.

Le contrat brut, et non le détail à ABV effectif, préremplit le formulaire. Chargement en ML canonique pour préserver exactement les décimales ; CL proposé pour une saisie volontaire, conversion bornée à trois décimales comme la création. Mode INHERIT conserve NULL override même si catalogue connu ; UNKNOWN conserve inconnu, jamais0 ; OVERRIDE conserve0 et égal catalogue. Catalogue existant jamais modifié. Le formulaire n'infère ni mode ni version. Version fournie exactement depuis le GET initial ou le brouillon restauré.

## Responsabilités et réutilisation

- Modèles et méthodes de CocktailsService : contrats typés de transport seulement.
- Adaptateur de formulaire édition : création/préremplissage/validation/mapping réversible, réutilise validateurs et options de création ; pas de refonte de la création, pas de conversion implicite des modes.
- Composant édition : orchestration GET/PUT, lifecycle de route et UI. Formulaire et comparaison lisible séparés si cela clarifie le template ; styles/tokens existants réutilisés. Champs HTML étiquetés, fieldset disabled pendant mutation/candidat, boutons de déplacement clavier, erreurs textuelles, focus sur erreurs. Navigation annulable et beforeunload via moteur existant.
- DraftStore/FormDraft restent l'unique moteur. Adaptateur de schéma strict `edit:<ID>`, valeur avec version de schéma indépendante du contentVersion du record. Propriétaire validé par auth/me ; lease invalide après suspension/purge. Aucune donnée d'auth dans le brouillon.
- DraftNotice reçoit un mode de résolution explicite pour édition : pas de bouton générique permettant de débloquer une ancienne intention incertaine. Les autres usages L4 gardent leur comportement et leurs tests.

## Concurrence, erreurs et navigation

Le GET initial vérifie l'ID et ne capture aucun brouillon. Chaque saisie conserve sa version chargée. Succès explicite : purge uniquement de ce brouillon, préremplissage avec réponse serveur et version retournée, feedback accessible ; sauvegarde inchangée sans modification de données/version. Pas de PUT automatique, retry ou force-save.

409 conserve saisie et bloque les nouveaux envois. Réponse réseau/5xx perdue : marqueur incertain persistant avant PUT via FormDraft, blocage conservé après refresh. Le bouton de vérification fait uniquement un GET et présente tous les champs serveur en lecture seule, à côté de la saisie conservée. Il ne réaffecte pas la version. Repartir de cette version exige une confirmation explicite d'abandon de la saisie ; l'utilisateur ressaisit les changements souhaités. Si le serveur change encore ensuite, PUT reçoit409. Cette résolution volontairement simple exclut fusion automatique ou comparaison à trois voies.

Restaurer un brouillon nécessite identité confirmée, GET de la recette active et contrôle du schéma/TTL/version. Version différente : affichage de la saisie autorisé pour consultation, conflit bloquant ; aucune mutation. Expiration involontaire conserve le brouillon ; logout/changement de compte/workspace purge via L4. Les réponses tardives sont rejetées par l'intercepteur existant et le composant vérifie sa lease avant tout effet. Route réutilisée : annulation des requêtes anciennes, guard si changements avant changement d'ID, aucune saisie d'une recette appliquée à une autre. Un GET de comparaison qui finit après une nouvelle saisie n'écrase jamais celle-ci.

Stockage refusé/saturé : avertissement mémoire honnête ; aucune promesse de24h. Si ni marqueur incertain ni retrait d'un ancien snapshot ne réussit, FormDraft bloque avant PUT. Abandon et annulation restent explicites ; l'annulation navigue avec guard et conserve temporairement le brouillon, l'abandon le retire et recharge l'état initial/serveur vérifié. Pas d'effacement physique garanti dans un navigateur inaccessible.

## Vérification prévue et critères

L5-01/02 : préremplissage complet, round-trip exact, no-op, renommer sans toucher slug/classement/image ; unitaires adaptateur et DOM, contrats HTTP/PG B5b existants conservés, parcours Chromium réels. L5-03/04/07/08 : deux éditeurs, version ancienne, réponses tardives et effets indépendants ; 187 tests PG/HTTP et vrais verrous/rollback B5b restent actifs. Ajouter des tests HTTP seulement si un nouveau risque serveur apparaît, pas de tests miroirs sans valeur.

L5-09 : unitaires schéma/adaptateur/composant et moteur existant pour TTL exact, restauration explicite, compte/workspace/recette/version, invalides et modes, suspension/reconnexion/purge, stockage refusé, ancien callback,409, réponse inconnue ; Chromium avec vrai PUT committé puis réponse coupée, vérification GET et aucun replay. Parcours desktop/mobile avec clavier, réordonnancement, annulation, messages et largeur réelle. Ne pas modifier quotas/timeout/retry ni configurations CI. Nouveaux scénarios isolés possibles avec comptes de fixture déjà autorisés ; pas d'admission ouverte ni nouvelle configuration d'infrastructure.

L5-05/06 et cycle complet L5-10 restent B5d/e/f : cette PR ne clôt pas L5. Validation locale lint/build/tests/compat et typage e2e, Gate entière main...branche avant PR ; six checks PR et journaux réels, puis attente autorisation Alex. Migrations8 existantes contrôlées seulement dans Actions jetables.

## Alternatives et risques

Écartés : détail effectif pour reconstituer ABV (perte de source), second moteur de brouillons (duplication/régression), réutilisation du mapper de création (inférence override incompatible), version fraîche injectée au retry (écrasement), grande refonte du formulaire création (risque hors tranche), fusion automatique (règles nouvelles). Formulaire édition distinct mais validateurs/options/styles partagés : frontière de contrat cohérente, duplication de présentation limitée et revue.

Risques à vérifier : perte null/0, décimales et ordre ; candidat écrasé au chargement ; lease expirée pendant requête ; route ID réutilisée ; incertain effacé à tort ; ancien snapshot non supprimable ; conflit réapparu entre comparaison et action. Aucune dépendance ni nouveau service/coût. Pas de migration nouvelle, déploiement, infra/VPS, CONTRACT, purge réelle ou L6–L8. Retour applicatif vers le binaire B5b compatible seulement.

## Étapes atomiques

1. Présent design et checkpoint merge33 publiés avant code.
2. Contrats/adaptateur formulaire et schéma de brouillon, tests exacts.
3. UI/route/navigation et résolution avec moteur L4, tests composants.
4. Parcours Chromium réels, vérifications complètes, Gate et documents ; PR puis six checks, aucune fusion sans accord.
