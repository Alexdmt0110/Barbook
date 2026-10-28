# BB1d minimal — Design Review création autonome et identité initiale

28 octobre2026. Base réellement qualifiée38149070950a2a4f10a14325b8be5bbe9932f828, merge PR40. Six contrôles post-merge/journaux273backend/263frontend/250PG-HTTP/24Chromium, audits0 ; parents76d96822/c7c5c2c8, arbre identiquee18f1e19. Mandat BB-ESPACES-UX-01 confirmé par le propriétaire : BB1b puis BB1d minimal puis inventaire manuel/suggestions et batchs autonomes. Aucun arbitrage métier supplémentaire identifié.

## Périmètre et invariants

Un utilisateur authentifié crée explicitement un Bar indépendant, nom et couleur de palette, et en devient OWNER local. Un MEMBER d’un autre Bar peut créer son propre Bar sans modifier ses droits existants. Personnel demeure privé ; aucune recette copiée/synchronisée, aucun compte créé, aucune session renouvelée par cette opération. Ajout/retrait de comptes existants réutilisent BB1b. Réglages ultérieurs de nom/couleur, logos, transfert OWNER, fermeture, suppression et purge exclus de cet incrément.

Le succès de création ne sélectionne pas automatiquement le Bar. L’action distincte « Ouvrir ce Bar » réutilise WorkspaceContext et les gardes D2 de purge volontaire ; refuser la bascule conserve le contexte, ses brouillons et son accent, sans annuler le Bar déjà créé.

## Contrats et idempotence

POST /api/workspaces : SessionGuard et protections origine/CSRF existantes, DTO strict {name,accentKey,creationRequestId}. Nom trim1–80, accentKey enum AMBER/RED/TEAL/BLUE, UUID d’intention. Aucun ownerId/userId/kind/role/members accepté.201renvoie id,nom,kindSHARED,rôle courant,accessVersion,couleur ; replay exact renvoie la même ressource, sans écriture ni réactivation. Plusieurs Bars et noms identiques autorisés : aucune unicité globale inventée.

Une transaction verrouille la ligne User FOR NO KEY UPDATE, recherche le reçu (acteur serveur,UUID), puis crée Workspace et membre OWNER ensemble. Le verrou sérialise deux intentions du même acteur sans bloquer inutilement les FK KEY SHARE ; éviter User FOR UPDATE puis Workspace qui créerait un ordre incompatible avec les ajouts de membres. Un reçu existant est relu sous le verrou Workspace et l’appartenance active via une méthode transactionnelle extraite de WorkspaceAccessService ; jamais d’autorisation séparée d’une écriture dans une autre transaction. Même clé/autre empreinte canonique nom/couleur409, autre acteur/même UUID indépendant. Aucun retry automatique de transaction ou HTTP.

GET /api/workspaces/creation-intents/:requestId : reçu du seul acteur authentifié, autorisation courante du Bar dans la même transaction ; absent/étranger/révoqué404. Lecture sans création/réadmission. Un404 ne prouve pas qu’une opération encore en cours ne finira pas ; après vérification, seule une action explicite peut reprendre exactement la même clé et le même payload. Pas de nouvelle clé silencieuse pour contourner un résultat incertain.

L’UI conserve en mémoire l’intention et bloque ses modifications tant que son résultat est incertain. Vérification explicite par le reçu/liste ; succès retrouvé propose l’ouverture, ne resoumet rien. Après actualisation sans clé conservée, ne pas promettre une déduplication entre intentions différentes : catalogue rechargé et vérification explicite des Bars avant une nouvelle création confirmée. Formulaire de création Bar en mémoire, sans promesse de brouillon24h ni second DraftStore. Déconnexion/changement d’identité effacent cette mémoire et invalident les réponses tardives. Les opérations déjà autorisées suivent la frontière HTTP existante ; aucune session révoquée n’est renouvelée/réactivée.

## Migration additive, compatibilité et rollback

Dixième migration proposée20261028115000_bar_self_service, uniquement sur PostgreSQL de test jetable gardé. Nouveau enum BarAccent ; Workspace.accentKey nullable pour l’historique, création exigeant une clé. Métadonnées nullable creationActorId (FK User RESTRICT), creationRequestId UUID et creationFingerprint SHA256 hex64 ; unicité acteur/clé, CHECK cohérence tout absent ou tout présent pour SHARED et palette absente sur PERSONAL. FK RESTRICT ne supprime jamais un Bar ; une future suppression de compte demandera sa propre politique, aujourd’hui hors périmètre. Aucun propriétaire historique inféré, aucun backfill/couleur forcée, aucune donnée effacée.

Les neuf migrations historiques ne sont pas modifiées. Essais d’upgrade avec données historiques, rejeu/drift, contraintes hostiles et rollback DDL dans un schéma jetable. Le rollback applicatif conserve la migration additive et revient à une version compatible BB1b/révocation ; jamais de down destructif. Toute base propriétaire reste interdite. Les métadonnées ne confèrent aucun droit : l’accès repose toujours sur WorkspaceMember actif.

La couleur apparaît dans le contexte partagé et le catalogue seulement lorsqu’elle existe ; historique sans couleur et réponses personnelles conservent leur contrat. Version de contenu, organisation et accès indépendantes. Pas de PATCH d’identité dans ce minimum immuable : identityVersion et réglages OWNER restent à introduire avec cette fonction ultérieure, aucune API retirée.

## Application des accents

Table frontend bornée de quatre clés, jamais CSS/hex utilisateur libre. Réutiliser la palette/ratios étudiés dans bb1-workspace-ux-design.md, puis mesurer le rendu effectif. Modifier seulement accent,on-accent,accent-soft,accent-soft-strong dans le shell du contexte confirmé. Le mode clair/sombre reste celui de ThemeService ; contraste élevé garde ses tokens renforcés. Danger/erreur/avertissement/succès,fonds de sécurité,texte et focus-ring restent inchangés. Personnel, contexte suspendu/non confirmé, déconnexion ou identité changée retirent les overrides. Deux membres du même Bar reçoivent la même clé ; aucune synchronisation temps réel promise.

La palette dans le formulaire est un aperçu local radio+libellé sélectionné accessible ; elle ne recolore pas Personnel avant ouverture. « Créer mon premier bar » seulement après catalogue SHARED réussi total0, sinon « Créer un bar ». Erreur/chargement ne valent jamais zéro. Aucun bouton factice ni formulaire auto-soumis.

## Qualification exigée

- HTTP/PG : auth401/CSRF403, payloads/clé/palette invalides400 sans effet, personnalisation ROLE/kind rejetée, User/Personnel/autres Bars inchangés.
- Création OWNER atomique, deux appels concurrents même acteur/clé →un Bar/un membre, payload différent409, autre acteur mêmeclé isolé ; reçu étranger ou membership révoqué404 et aucune réactivation.
- Échec injecté entre Workspace et membre →rollback complet métadonnées incluses, reprise explicite mêmeclé possible ; conservation des historiques et contraintes/migration réversible réellement testées.
- Chromium deux comptes : création UI puis choix explicite d’ouverture, ajout d’un membre existant et visibilité réelle, pas de copie personnelle ; brouillon Personnel gardé si ouverture annulée puis purge honnête si acceptée.
- Réponse réellement commitée puis perdue, lecture explicite du reçu sans replay ; double clic/pending, actualisation, identité changée et réponse tardive ; stockage refusé traité honnêtement.
- Radio/clavier/mobile et captures clair/sombre, nom long, contraste effectif ; comparaison des tokens de sécurité avant/après, même clé entre membres, retour Personnel et mode utilisateur inchangés, contraste élevé préservé.
- Non-régression BB1b/L4/L5, six CI dernier HEAD, diff/historique/discussions/Review Gate sans BLOCKER/P1 ; D8 merge commit puis main qualifié. Pas de développement sur main.

## OPS et disponibilité

Schéma nouveau à inventorier dans la future demande OPS, pas à appliquer sur une base propriétaire. Aucun VPS, déploiement, compte réel, coût ni infrastructure. D7/cible/sauvegarde restaurée/rollback restent non qualifiés ; une mise en service complète au30octobre n’est pas un engagement réaliste. Ce bloc rend le socle autonome en développement ; inventaire manuel/suggestions et batchs restent distincts, sans consommation automatique.
