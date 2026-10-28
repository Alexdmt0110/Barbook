# Passe UX/UI — Design Review transversale

27 octobre2026. Mandat fourni dans Texte collé.txt lu intégralement. État GitHub vérifié : main d55288582d896adfb3b7dba24115698e2208f495 ; PR40 draft HEAD8f77909698a547fb9078b0b40bbb0bd79636bf73, six checks success ; worktree propre. BB1b demeure incomplet. Aucun merge prématuré, force-push, suppression ou duplication. Branche feature/ux-foundations publiée depuis main ; un seul écrivain.

## Intégration et preuves
PR40 conservée telle quelle avec checkpoint durable. Suspendre l'ajout métier BB1b pendant les corrections transversales prioritaires ; ne pas la fermer/recréer ni recopier son backend. Les PR UX partent de main qualifié ; après leurs merges D8, intégrer main à BB1b par merge non destructif. À ce jour BB1b n'a pas modifié le frontend : conflit immédiat limité, requalification complète toutefois obligatoire.

Diagnostic ci-dessous fondé sur code réel et signalements utilisateur ; **ce n'est pas encore une qualification visuelle complète**. Aucune des captures annotées mentionnées dans le mandat n'est fournie comme image locale dans cette pièce jointe : seul le texte est accessible. Ne pas inventer leur contenu ou associer arbitrairement d'autres images de la mémoire. Références visuelles à constituer par captures navigateur avant/après sur fixtures synthétiques ; joindre les captures utilisateur si elles deviennent disponibles. Les Gates ne pourront être franchis sans inspection visuelle réelle.

## Inventaire et anomalies

| Zone / composants réels | Cause / constat | Priorité et correction |
| --- | --- | --- |
| styles.css, app-shell.css, home.css, cocktails.css, cocktail-detail.css, folders.css | max-width1180 répété, grilles3colonnes et espacements locaux ; grands écrans sous-exploités | P1 UX-A : conteneurs fluides selon contenu, grilles adaptatives, spacing commun |
| AppShell / GlobalLogout | composant global-logout inséré avant router-outlet sur chaque page ; nom utilisateur span non interactif | P1 UX-B : lien utilisateur vers page Compte et sécurité ; déplacer le composant existant, conserver états incertains et écran privé masqué |
| Cocktails / filtres/pagination | styles locaux select/input et boutons, états dispersés | P1 UX-D : contrôles natifs stylisés via directives/styles communs, labels et erreurs préservés |
| CocktailDetail / hero | lien corbeille hors carte, lien modifier sous titre | P1 UX-C : groupe haut-droite intérieur hero, icônes inline accessibles, libellés/tooltip, confirmation existante |
| CocktailDetail / service-grid | fond de grille bordure et nombre impair de cellules si pas de dossier ; zone restante peut ressembler à une cellule vide | P2 UX-C : tester cas5/6cellules, dernière cellule pleine largeur ou grille transparente ; pas de métadonnée factice |
| CocktailDetail / OrganizationEditor | éditeur affiché systématiquement ; marge entre hero et composant insuffisante | P1 UX-C : lecture seule initiale, organisation activée explicitement ; conserver transaction/version/brouillon propre |
| CocktailCreate / CocktailEdit | styles partagés partiellement, padding/rayons/row-actions locaux, disabled opacity0.5 | P1 UX-D : échelle et variantes communes, cohérence des groupes/champs ; calculs/validation/FormDraft inchangés |
| Login/Register auth-page.css | champs déjà stylisés mais langage d'interaction spécifique, disabled opacity0.58 | P2 UX-D : aligner états sur tokens sans changer admission/cookies ni autofill |
| FolderIndex/FolderDetail/FolderCocktailPicker, folders.css | grille fixe3colonnes, actions et checkbox locales | P1 UX-A/D : layout fluide et états lisibles ; garder preview/version/rollback et suppression sans recette |
| CocktailTrash/LifecycleAction/CocktailDelete | composants inline réutilisent peu de styles communs ; commandes sensibles explicites existantes | P1 UX-D : variantes/messages/espacement, aucune simplification du protocole d'intention ou deadline |
| Home | introduction et panneau statiques sans recettes | P2 UX-E : raccourcis et aperçu réel paginé ; compte vide sans nombre inventé |
| Autocomplete/IngredientAutocomplete | composant ARIA déjà qualifié, clavier via aria-activedescendant | P1 non-régression : conserver modèle sémantique, adapter seulement apparence avec tests clavier |
| ThemeSwitcher / themes | trois thèmes existants, focus global ; contrastes hover/disabled à mesurer | P1 UX-A/D : tokens par thème et états ; préserver aussi high-contrast |
| Espaces/membres | API BB1a, pas encore de sélecteur ni gestion UI qualifiée | Hors constat UI disponible : aucune fausse page ni surface personnelle présentée comme Bar |
| Messages/confirmations | styles locaux et boutons natifs parfois sans variante | P1 UX-A/D : états status/alert, groupes d'actions cohérents ; pas de modal générique refondant les règles sensibles |

Aucun P0 confirmé par cette inspection statique ; les anomalies de contraste/débordement restent à mesurer. P3 esthétique pure différée. Les anomalies découvertes par captures seront ajoutées avec preuve, et non réputées corrigées par une classe CSS.

## Fondations et composants
Conserver brun/crème/terracotta, typographie expressive et tokens de couleurs existants. Ajouter échelle de spacing4/8/12/16/24/32/48/64px, gaps fluides bornés, rayons existants plutôt qu'un nouveau thème. Conteneur collection : largeur disponible avec marges clamp16–48px ; grille auto-fit de cartes ciblées280–360px avec répartition sur4/5/6colonnes aux grandes tailles, sans carte géante quand peu d'items. Conteneur détail : zones visuelles fluides, paragraphes≤70ch. Formulaires : largeur lisible spécifique, pas étirement à2560px. Auth conserve une composition adaptée, pas un plafond global supprimé partout.

Directives Angular d'apparence sur véritables button/a/input/select/textarea/checkbox quand elles évitent duplication ; variantes primaire/secondaire/ghost/danger/icône. Liens de navigation restent liens. Attributs aria, labels, focus et ReactiveForms ne sont pas encapsulés inutilement. Autocomplete existant conservé ; aucun select custom ARIA ni bibliothèque externe. États normal/hover/focus-visible/pressed/disabled/loading/erreur cohérents, cibles tactiles≥44px pour actions principales, reduced-motion. Les composants métier restent responsables des commandes et de leur autorisation.

## Navigation, édition et sécurité
Choix UX-B : page Compte et sécurité, accessible par nom/initiales ; éviter une nouvelle mécanique de menu qui piège le focus. Afficher seulement infos réellement disponibles, ThemeSwitcher et actions existantes. Garder GlobalLogout tel quel pour réauthentification, incertitude, CSRF, purge et révocation ; tests ajustés pour naviguer vers cette page, sans supprimer assertions de sécurité. Conserver accès au résultat incertain même si session masquée.

Choix UX-C : fiche initialement consultative ; groupe crayon/corbeille haut-droite du hero. Crayon ouvre l'édition de contenu existante ; organisation via section explicitement activée et nommée, jamais ouverte au chargement. Versions et sauvegardes demeurent séparées et annoncées ; ne pas inventer un Enregistrer tout atomique sur deux API. Annuler utilise les garde-fous de brouillon existants. Pas de corbeille partagée ni chemin personnel exposé depuis un futur Bar. Un regroupement ultérieur de navigation ne doit pas fusionner les transactions.

## PR et critères mesurables
1. UX-A : tokens, conteneurs, grilles et variantes communes. Tous viewports sans scroll horizontal involontaire, texte long reflow, cartes non géantes, paragraphes bornés.
2. UX-B : page utilisateur et déplacement sécurité ; tous parcours logout/local/global/erreur/incertitude/clavier réexécutés.
3. UX-C : hero/actions et lecture seule ; noms accessibles exacts, confirmation D5, organisation explicite, no-op/conflit/draft inchangés.
4. UX-D : migration cohérente contrôles/formulaires/filtres/dossiers/corbeille/auth ; états lisibles dans les thèmes et associations d'erreurs.
5. UX-E : hub léger avec données autorisées déjà disponibles ; étude découverte seulement.

Chaque incrément : Design Review ciblée, commit/push immédiat/checkpoint, tests pertinents, revue entière, six checks dernier HEAD, captures inspectées, merge D8 puis six post-merge et journal. Pas de grande PR globale. UX-A/B/C et défautsP1UX-D avant reprise BB1b ; UX-E non bloquant s'il menace le carnet Bar.

## Matrice de qualification visuelle
Avant/après sur360,390,768,1024,1440,1920,2560 et3440 si disponible ; clair/sombre sur pages affectées, high-contrast conservé. Au minimum captures mobile/desktop/granddesktop par page modifiée. Vérifier scrollWidth≤clientWidth, nom long, état vide, quelques et nombreux items, champs invalides, loading/disabled, focus/hover, zoom200%, reduced-motion. Inspecter images réelles et interactions : une capture seule ne prouve pas le fonctionnement.

Chromium existant desktop/mobile conservé (timeouts/retries/quotas inchangés), scénarios de navigation profil, focus et disposition ajoutés. Unitaires pour comportement nouveau ; pas de tests miroir des valeurs CSS. PostgreSQL/HTTP et audits inchangés réexécutés. Auth/session/BFCache/CSRF/drafts/préconditions/intégrité sont des critères bloquants de non-régression.

## Découverte quotidienne — proposition différée
Pas de modèle ni administration à implémenter. Proposition minimale ultérieure : collection éligible par workspace avec activation explicite, gestion OWNER dans Bar et titulaire dans personnel ; sélection sans doublon déterministe à partir workspace/date EuropeParis/collection, au plus3, aucune recette inaccessible ou corbeille. Calcul à la lecture, sans cron, cartes stables pour la journée si collection inchangée ; changement de collection nécessite règle explicite à valider. Présentation en liste/carrousel manuel clavier sans autoplay. Effort indicatif2–3 incréments avec serveur/gestion/tests ; hors chemin critique et mandat actuel limité à étude/backlog.

## Calendrier et OPS
27octobre : diagnostic/fondations ;28 : navigation/fiche et P1contrôles ;29 : qualification visuelle/non-régression puis reprise collaboration ;30 : cible de recette, pas promesse. Cette passe rend **irréaliste de garantir simultanément** collaboration complète, inventaire/suggestions, batchs et mise en service avant30octobre. Prioriser défautsP1transversaux puis carnet partagé sûr, inventaire manuel ensuite ; batchs indépendants. P3, carrousel et administration différés. Aucun BB2/3/4 avant qualification des défauts bloquants de cette passe.

Dossier OPS documentaire conservé ; D7, cible, HTTPS/provisionnement/migrations/sauvegarde restaurée et rollback à autoriser séparément. Aucun VPS/base propriétaire/compte réel/déploiement/coût. Stock exclusivement manuel et indépendant.
