# BB1b — Design Review : carnet Bar utilisable

27 octobre 2026. Base main d55288582d896adfb3b7dba24115698e2208f495, PR39 intégrée et six contrôles post-merge qualifiés273/229/240/12, audits zéro. Branche feature/bar-recipe-workspace publiée depuis ce SHA. BB1a fournit l'autorisation transactionnelle ; BB1b doit livrer sélection, consultation, création et édition. BB1c ajoutera copie explicite puis qualification globale. Aucun provisionnement réel.

## Contrat de contexte et isolation
Conserver le contexte de session personnel L4 (expected-user/workspace et CSRF) pour l'authentification, logout et logout-all. Le workspace métier actif est un contexte distinct confirmé par GET /workspaces/:id ; un ID navigateur n'accorde aucun droit. Routes Bar explicitement sous /api/workspaces/:id/cocktails et /ingredients. Précondition accessVersion obligatoire sur toute mutation partagée, en plus de contentVersion ou organizationVersion pertinente. Anciennes routes restent personnelles et ne changent jamais de cible selon un état implicite.

Sous WorkspaceAccessService.shared : verrou, appartenance active, version d'accès, puis lecture ou écriture dans le même callback transactionnel. Ne pas autoriser dans une transaction puis écrire dans une autre. Extraction des opérations cohésives des services existants vers méthodes recevant tx/workspaceId ; wrappers personnels conservent leur contrat. Pas de faux userId, de recherche du propriétaire pour contourner le scope, de duplication complète des services ou de transaction imbriquée. Création doit déplacer aussi recherche de slug et résolution catalogue sous la transaction autorisée.

## Parcours minimal
Sélecteur Personnel/Bar visible desktop/mobile, rôle et nom courant ; OWNER dispose de la gestion des membres, MEMBER ne peut l'invoquer. Liste, filtres/recherche, détail, création, autocomplete ingrédients et édition doivent tous utiliser la même cible confirmée. Recettes créées dans Bar y restent ; slug unique dans l'espace. Aucun accès à une recette personnelle par une URL Bar ou réciproquement.

Corbeille/restauration restent personnelles. Ne pas afficher une commande personnelle dans une fiche partagée. Les surfaces de classement/dossiers doivent être inventoriées avant bascule : toute surface présentée en contexte Bar doit être scoped et autorisée ; aucune suggestion, compteur ou lien personnel affiché comme partagé. Une surface différée est explicitement indisponible, jamais redirigée silencieusement vers le personnel.

## Sessions, réponses tardives et brouillons
Un service de contexte métier par onglet possède génération et identité confirmée. Les services HTTP capturent ce contexte pour former URL et versions ; réponse rejetée après bascule/retrait/changement de compte. Une sélection locale persistée n'est qu'un candidat à reconfirmer après reload/BFCache/reconnexion. Stockage refusé : fonctionnement mémoire et message honnête.

Réutiliser DraftStore/FormDraft : propriétaire=user/workspace métier, recette/version ; garde de sortie avant sélection, purge sur changement volontaire selon L4, suspension et conservation sur expiration involontaire. Après reconnexion, reconfirmer session puis droit au contexte candidat avant de proposer le brouillon ; ne pas confirmer temporairement le personnel au risque de purger un brouillon Bar conservé. Déconnexion globale/notification doit atteindre les onglets du même compte même lorsqu'ils ont choisi des espaces différents. Aucun second moteur de brouillons, retry automatique ou adoption silencieuse d'une version fraîche.

## Révocation et concurrence
Appartenance courante revérifiée pour chaque opération. Une opération engagée sous verrou peut précéder le retrait ; après retrait, aucune nouvelle opération ne passe. Retrait/réadmission change accessVersion et ne réactive aucune ancienne intention. Résultat déjà transmis ne peut être effacé à distance ; UI cache le contexte après refus et demande une sélection autorisée, sans prétendre effacer un appareil.

## Tests et sortie
Unitaires contexte/générations/stockage/drafts et composants accessibles. Vrais HTTP/PG OWNER/MEMBER/étranger : personnel isolé, ID/slug forgés, autocomplete, création/édition, conflits et rollback, retrait dans les deux ordres, ancien accessVersion après réadmission. Chromium deux comptes desktop/mobile : choix visible, création Bar visible à l'autre membre sans apparaître dans son personnel, édition concurrente, retrait effectif, expiration/reconnexion et purge entre contextes, réponses tardives et perdues. Conserver les suites personnelles et leurs assertions/quotas/timeouts.

Gate complet contre main, diff et dépendances vérifiés, six contrôles dernier HEAD puis merge D8 non destructif et main qualifié. Aucun code avant publication de cette revue ; aucun nouveau droit métier, suppression partagée, transfert OWNER, achat ou infrastructure.

## Risque calendrier et OPS
BB1b/c, batchs, inventaire manuel et recette d'exploitation restent nécessaires avant30octobre : risque de retard réel, aucune promesse de disponibilité. Prioriser ces parcours et leurs protections, pas les fonctions secondaires. OPS : cible, packaging, proxy/TLS, sauvegarde restaurée, rollback compatible et D7 restent à valider séparément ; aucun VPS/base propriétaire/provisionnement de compte réel.

## Revalidation préventive après la passe UX — 27 octobre 2026
Base de reprise main76d9682 qualifiée après PR41–44 ; le contenu serveur BB1b antérieur reste conservé. Aucun conflit applicatif dans la réconciliation, journal seulement. Les choix de contexte, verrous, préconditions et deux comptes ci-dessus restent applicables.
Conserver la fiche readonly et le crayon principal ; le composant d’édition réutilise maintenant contenu et classement, avec deux sauvegardes clairement distinctes et deux brouillons. Toutes nouvelles données/écritures doivent rester dans le contexte métier confirmé. Une surface de classement non disponible en Bar doit le dire explicitement et ne jamais appeler les routes personnelles en repli. Corbeille, restauration et suppression restent personnelles ; aucun bouton corbeille personnel dans une fiche Bar. Le sélecteur d’espace doit disposer d’une place responsive explicite sans écraser Compte et sécurité.
Réutiliser DraftStore/FormDraft et les gardes actuels ; ne pas confirmer temporairement le personnel à la reconnexion si cela purge un brouillon Bar suspendu. Révocation globale/notification doit couvrir le même compte sur des onglets ayant choisi des espaces différents. Préserver les tests et captures UX-A/D et ne pas introduire de second moteur. Les parcours Bar et la qualification BB1c restent à livrer avant Gate complet de PR40 ; six CI verts de réintégration ne valent pas livraison complète ni merge de PR40.
