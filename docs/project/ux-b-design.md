# UX-B — Design Review préventive
27 octobre2026. Base main e9dd29afbb3fba62dd602035bd36b33ba13dcd5b, UX-A intégré six contrôles273/229/240/16 et audits0. PR40 préservée. Mandat utilisateur UX-B/C prioritaire, aucune fonction compte nouvelle.

## Choix après inventaire des dépendances
Le scénario réel globalLogoutJourney ouvre la sécurité pendant une création non sauvegardée, annule puis retrouve exactement la saisie. Une navigation vers une page compte détruirait le formulaire et imposerait une restauration supplémentaire. Ajustement de la proposition transversale : panneau utilisateur non modal, ouvert par le nom/initiales en haut à droite, sans navigation. Composant AccountPanel cohésif, infos compte en lecture seule, aucune fausse préférence ou modification de profil. ThemeSwitcher existant conservé.

Le panneau contient le GlobalLogout existant, monté une seule fois et conservé pendant ouverture/fermeture et expiration locale de la commande. Masquage visuel hors ouverture ; globalLogoutUncertain force son affichage pour conserver erreur et réauthentification explicite. Aucun déplacement de logique de révocation, aucun nouvel endpoint, aucune modification AuthService/CSRF/drafts. Retirer le rendu isolé du composant dans main.

## Accessibilité et UX
Bouton natif avec nom Compte et sécurité, aria-expanded/controls ; initiales visibles sur mobile, nom complet borné, aucune dépendance au hover. Panneau nommé, pas role menu puisque formulaires ; boutons natifs, focus visible, Échap referme et rend le focus au déclencheur. Pas de focus trap modal. Le panneau se borne au viewport, scroll interne si nécessaire, touch44px. État incertain ne doit pas pouvoir masquer la seule résolution disponible.

## Qualification
Unitaires ouverture/fermeture/Escape/focus/incertitude, GlobalLogout et AuthService existants conservés. Adapter le parcours Chromium uniquement pour ouvrir l'accès utilisateur avant l'action ; garder assertions mot de passe refusé, annulation conserve saisie, réponses perdues réellement committées, révocation distante et BFCache. Captures panneau clair/sombre mobile/desktop/granddesktop, absence d'action globale isolée hors panneau. Sécurité et comportement doivent être testés, pas seulement capturés.

Diff/architecture/dépendances/Gate entiers, six contrôles dernierHEAD puis mergecommitD8 et main qualifié. Aucun backend, migration, compte réel, infrastructure ou déploiement. UX-C suivra avec crayon principal et lecture seule ; UX-E/carrousel interdits dans cette tranche.
