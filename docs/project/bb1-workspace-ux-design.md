# BB1 — Espaces depuis le panneau de compte et création de Bar

Design Review préventive, 27 octobre 2026. Décision utilisateur BB-ESPACES-UX-01 validée ce jour. Base main76d96822ce97ce3720b4214c678138f18037677f qualifiée ; branche BB1b/PR40 au6eb35c9c, réintégration six contrôles273/234/242/16 et audits0. **Conception et incréments à développer, aucune fonction nouvelle annoncée livrée.**

## 1. Périmètre et responsabilités
Le nom/les initiales ouvrent le panneau existant. Il accueille Personnel privé, les Bars de l’utilisateur et l’action de création. Compte et sécurité reste accessible ; GlobalLogout demeure monté une fois et sa résolution incertaine non masquable. Pas de fausses préférences de profil. Le mode clair/sombre reste géré par ThemeService, distinct du contexte métier.

AccountPanel compose les sections, sans porter les requêtes ou les règles de permissions. Un composant de sélection cohésif présente le catalogue et les intentions ; le service de contexte métier confirmé reste responsable de la bascule/génération, les clients API forment les routes scoped et le serveur autorise chaque opération. Aucun service relais ni second DraftStore.

Personnel est épinglé à partir de l’identité personnelle réellement confirmée ; il n’est pas déduit d’un Bar. Le catalogue des Bars est paginé, jamais tronqué. Ajouter un filtre GET /api/workspaces?kind=SHARED, sans changer la réponse par défaut existante. Le total filtré, et non le nombre de Bars de la première page, détermine « Créer mon premier bar ». Sinon « Créer un bar ». Chargement, erreur et zéro résultat sont distincts. Un échec réseau ne doit pas être présenté comme zéro Bar.

L’espace actif reste identifiable panneau fermé, par un libellé/badge compact associé au profil ; la couleur seule ne suffit jamais. Nom et rôle confirmés, cibles44px, noms longs, clavier, mobile360/390, tablette768 et grands écrans sont à qualifier. Le sélecteur n’est pas une seconde barre concurrente dans l’en-tête. Les actions de création/paramétrage ne sont affichées comme disponibles qu’avec un parcours fonctionnel.

## 2. Bascule explicite et brouillons
1. Recueillir l’intention de l’utilisateur et consulter les gardes des formulaires de contenu ET classement. Une annulation ne change ni contexte, ni couleur, ni bail.
2. Conserver D2 : une bascule volontaire de workspace purge les brouillons concernés après confirmation explicite ; expiration involontaire suspend et conserve jusqu’à24h. Le texte de confirmation de bascule doit annoncer la purge. Ne pas réutiliser tel quel le message actuel « quitter en conservant24h » puis purger, ce serait contradictoire. Réutiliser les gardes/FormDraft, avec une intention de sortie appropriée, sans deuxième moteur.
3. Pour un Bar, GET /workspaces/:id confirme l’appartenance, le rôle et les versions dans le même mécanisme serveur que la révocation. Pour Personnel, l’identité et le workspace privé proviennent de /me confirmé ; ne pas appeler la route de contexte SHARED pour autoriser Personnel. Un ID stocké, un résultat de catalogue ou un accent ne confère aucun droit.
4. Changer la génération du contexte, invalider les anciennes réponses/leases et recharger les données métier. Une ancienne réponse ne peut repeindre l’accent ni alimenter un autre workspace. Aucune session n’est révoquée ou recréée pour une simple sélection d’espace.
5. En cas de refus/échec, ne pas afficher des recettes personnelles sous un titre Bar. Une réponse ambiguë après tentative ne provoque pas de replay. Après reconnexion/BFCache, confirmer l’identité puis le workspace candidat avant restauration ; ne pas confirmer temporairement Personnel au risque de purger un brouillon Bar suspendu. Déconnexion globale atteint les onglets du même compte quel que soit leur workspace.

La confirmation concerne aussi les brouillons retenus dans DraftStore dont le formulaire n’est plus monté : une simple garde du composant courant ne suffit pas. Exposer seulement les métadonnées nécessaires du moteur existant, sans recopier son stockage. Pendant la vérification d’une bascule, le contenu métier ne doit pas accepter de nouvelle saisie/écriture ; conserver l’accès à la sécurité. Avant le commit du contexte, recontrôler l’identité/génération et l’état des brouillons. Une commande métier encore en cours bloque la bascule jusqu’à résolution explicite ; une réponse d’authentification/déconnexion survenue entre-temps annule la transition. La confirmation de purge est unique et honnête, pas deux messages contradictoires de sortie de page.

Les routes personnelles restent personnelles. Corbeille/restauration partagées exclues ; aucun bouton personnel en repli dans Bar. Une surface de classement partagée non encore disponible doit l’indiquer et ne jamais employer les routes personnelles.

## 3. Création autonome — contrat proposé pour l’incrément court
POST /api/workspaces, SessionGuard/CSRF/admission privée existants. DTO borné : nom trim1–80caractères, accentKey dans une allowlist, creationRequestId UUID d’intention. Aucun ownerId, personalOwnerId, rôle ou kind fourni par le client. Le serveur crée uniquement un Workspace SHARED et une appartenance OWNER de l’acteur authentifié, dans la même transaction. Personnel, droits des autres Bars et comptes restent inchangés. Aucune auto-inscription ni provisionnement de compte.

Plusieurs Bars sont possibles ; aucun nom globalement unique ni limite « un Bar par compte » n’est inventé. Les IDs identifient les Bars, même si des noms sont identiques. Pagination, validation et throttling existant restent requis. Les membres ajoutés ensuite doivent déjà posséder un compte admis ; les routes OWNER existantes sont réutilisées et vérifient le droit serveur.

Une même intention concurrente doit produire un seul Bar. Prévoir sur Workspace des métadonnées de création nullable pour les lignes historiques : acteur serveur, clé d’intention, empreinte du DTO canonique, unicité acteur/clé. Même clé/autre contenu →409 ; replay identique ne réactive jamais un membre et revérifie l’accès. La représentation précise et la FK seront finalisées dans la Design Review de migration, avant schéma/code. Pas de nouvelle politique de purge.

« Créer le bar » crée la ressource seulement. Le succès propose « Ouvrir ce Bar », action distincte et explicite passant par les gardes de contexte, y compris les brouillons personnels retenus. Un aperçu de palette dans le formulaire ne repeint pas globalement Personnel avant sélection confirmée. Aucune bascule automatique après une réponse perdue ou une création simplement terminée.

L’UI garde une intention unique tant que son résultat est incertain ; pas de retry automatique ni nouvelle clé silencieuse après réponse perdue. Résolution explicite par lecture du résultat/liste. Après actualisation sans clé récupérable, ne pas prétendre que deux intentions différentes sont dédupliquées : imposer la vérification des Bars avant une nouvelle création confirmée. Formulaire de création en mémoire sans promesse de brouillon24h ; aucun nouveau moteur de brouillons.

## 4. Identité persistée et concurrence
Prévoir accentKey nullable/additif pour les historiques ; Bar sans valeur utilise une valeur de repli définie, Personnel conserve ses accents actuels. La création exige une clé de palette. identityVersion≥0 est indépendante d’accessVersion, des versions recettes et de classement. Une modification OWNER du nom/de la couleur vérifie expectedAccessVersion ET expectedIdentityVersion sous le verrou Workspace existant ; obsolète/manquante409, refus d’accès404, payload invalide400. No-op vérifié sans incrément ; capacité int32 contrôlée.

PATCH /api/workspaces/:id/identity ne change jamais identité/kind/propriétaire/membres. Un MEMBER ou OWNER d’un autre Bar ne peut modifier cette identité. Une couleur modifiée ne révoque pas les sessions et n’invalide pas arbitrairement les intentions de recette. Les changements d’appartenance continuent à incrémenter accessVersion. Les membres reçoivent la même configuration serveur à la prochaine lecture confirmée ; aucune synchronisation temps réel n’est promise.

Migrations uniquement additives sur PostgreSQL jetable gardé : colonnes nullable pour anciens Bars, version avec défaut0, CHECK palette/capacité et unicité de l’intention. Ne pas modifier les neuf migrations historiques, ne pas inférer de propriétaire pour les anciennes lignes, aucun CONTRACT. Tests de compatibilité/upgrade et rollback sur copie jetable ; pas de down destructif ou migration propriétaire. Le choix exact du delta reste à publier avant implémentation.

## 5. Accents et accessibilité
Persister une clé, jamais du CSS ou une couleur arbitraire. Table frontend versionnée de tokens clair/sombre. Seuls accent, accent-soft, accent-soft-strong et on-accent varient. Danger/erreur/avertissement/succès, texte, fonds de sécurité et focus-ring ne sont pas recolorés. Personnel retire l’override. Déconnexion, changement d’identité ou suspension d’un contexte non confirmé retire immédiatement l’identité visuelle du Bar ; le mode utilisateur reste inchangé. Le mode Contraste élevé existant garde ses tokens renforcés et n’est pas dégradé par une palette Bar.

Palette initiale technique proposée, sans personnalisation libre :

| Clé | Accent clair | Accent sombre | Texte sur accent clair/sombre | Accent sur fond teinté clair/sombre |
| --- | --- | --- | --- | --- |
| AMBER | #873f19 | #f1b57c | 7,36 / 9,98 | 4,76 / 6,26 |
| RED | #981b28 | #ff9198 | 8,04 / 8,36 | 5,02 / 5,47 |
| TEAL | #005b55 | #5fd8c8 | 7,71 / 10,41 | 4,94 / 6,63 |
| BLUE | #1c4d99 | #8bb8ff | 7,88 / 8,91 | 5,05 / 5,82 |

Calcul préalable par luminance relative, texte #fffaf7 en clair/#24120b en sombre ; fond teinté17%accent sur bases #f1e4dc/#2b1b1b. Ces ratios ne constituent ni validation du rendu complet ni audit WCAG. Vérifier les couleurs réellement calculées dans Chromium, états hover/focus/disabled, boutons, liens et pastilles dans les deux modes, et l’invariance des tokens de sécurité. Pastille nommée + radio/état sélectionné accessibles ; jamais couleur seule. Les tokens Personnel ne changent pas.

## 6. Séquencement et calendrier
- BB1b immédiat : point d’accès dans AccountPanel, catalogue paginé/total fiable, contexte confirmé et carnet partagé réellement fonctionnel. Ne pas activer le sélecteur Bar tant que ses données et brouillons ne suivent pas le même contexte.
- BB1d création minimale, incrément distinct et cohérent : nom + palette initiale, transaction OWNER, gestion d’intention perdue, formulaire et accent appliqué après confirmation. Nécessaire au premier usage sans provisionnement manuel. L’action « Créer un bar » n’est pas un lien factice dans une livraison intermédiaire.
- BB1d suite si nécessaire après première bêta : modification ultérieure d’identité par OWNER, palette enrichie. Cette possibilité de phasage n’annonce pas ces fonctions livrées. Logos, couleurs libres, transfert OWNER, fermeture et gouvernance avancée exclus.
- BB2 batchs et BB3 inventaire manuel peuvent partir du socle BB1b qualifié ; ils ne dépendent pas du réglage ultérieur de couleur. BB4 dépend du stock manuel seulement. Aucun lien de consommation automatique.

La bêta complète du30octobre reste à risque. Minimum sûr proposé pour premier usage : comptes séparés admis, Personnel privé, création d’un Bar et OWNER, ajout d’un membre existant, sélection explicite depuis le profil, lecture/création/édition partagées, révocation et conflits/brouillons qualifiés. Stock manuel/suggestions et batchs restent des livraisons distinctes si absents ; aucune disponibilité réelle sans autorisation et qualification OPS.

## 7. Critères et preuves attendues
1. Personnel et catalogue complet des seuls Bars autorisés, état vide fiable après GET réussi, pas de troncature.
2. Sélecteur clavier/mobile dans le panneau ; sécurité globale/reauthentification restent accessibles et montées une fois.
3. Bascule annulée sans effet, bascule acceptée avec garde honnête, absence de mélange des données/réponses/brouillons.
4. Expiration/BFCache/reconnexion, changement de compte, stockage refusé et déconnexion globale multi-onglets conservent les garanties L4.
5. Création explicite authentifiée +OWNER atomiques ; rollback réel entre les écritures, personnel inchangé et autres Bars isolés.
6. Double clic/concurrence/même intention et réponse réellement perdue : un résultat, aucun replay automatique ni nouvelle clé silencieuse.
7. Palette inconnue/CSS hostile rejetés serveur ; couleur persistée partagée, modes indépendants, retour Personnel inchangé.
8. OWNER seul pour modification ; versions identité/accès, révocation et courses testées dans les deux ordres PostgreSQL/HTTP.
9. Deux membres voient la même couleur après lecture confirmée ; ancienne réponse après sélection ne repeint pas le nouveau contexte.
10. Tests unitaires/API réels et parcours Chromium deux comptes, captures visuelles et contraste calculé sur rendu avant Gate. SixCI au dernierHEAD, diff/historique/discussions/Gate sans BLOCKER/P1, mergecommit D8 et main réellement qualifié.

## 8. Limites OPS
La nouvelle capacité utilisateur remplace la dépendance obligatoire à un script OPS créant le Bar/OWNER. Elle n’autorise aucune action réelle aujourd’hui sur comptes, VPS, bases propriétaires ou déploiement. D7 reste non validée, admission privée conservée. Préparation/exécution de migration et création de comptes/Bars synthétiques uniquement dans les tests autorisés. Toute future mise en service conserve sa demande OPS distincte, sauvegarde restaurée et rollback compatible avec la révocation.
