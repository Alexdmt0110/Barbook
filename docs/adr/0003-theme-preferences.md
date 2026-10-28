# ADR 0003 — Préférences de thème frontend

## Statut

Accepté.

## Contexte

Barbook doit proposer plusieurs apparences sans obliger chaque composant à connaître ou gérer directement le thème actif.

Les interfaces existantes et futures doivent pouvoir fonctionner avec :

```text
sombre
clair
contraste élevé
```

Le système doit également fonctionner avant authentification.

La préférence de thème n'est pas une donnée sensible et doit survivre à la fermeture du navigateur.

## Décision

Les thèmes sont implémentés au niveau global du frontend Angular.

Le thème actif est appliqué sous la forme :

```html
<html data-theme="dark">
```

Les valeurs supportées sont :

```text
dark
light
high-contrast
```

Le thème sombre constitue la valeur par défaut de Barbook.

## Persistance

La préférence est stockée dans :

```text
localStorage
```

avec la clé :

```text
barbook.theme
```

Le stockage local est adapté car la préférence :

```text
n'est pas sensible
doit survivre aux sessions
ne nécessite pas de synchronisation serveur
```

Une valeur absente ou invalide provoque un retour au thème sombre.

Une impossibilité d'accéder au stockage local ne doit jamais empêcher l'application de fonctionner.

## Initialisation

`ThemeService` est initialisé au démarrage Angular via un application initializer.

Le thème est donc disponible sur toutes les routes, notamment :

```text
/login
/register
/
/cocktails
```

et ne dépend pas du shell authentifié.

## Tokens CSS

Les composants utilisent des tokens sémantiques :

```text
--color-background
--color-surface
--color-text
--color-accent
--color-on-accent
--color-border
--color-focus-ring
--color-danger
```

Ils ne doivent pas choisir directement une couleur en fonction du thème actif.

Le composant exprime la fonction visuelle souhaitée.

Le thème décide ensuite de la couleur réelle.

## Contraste élevé

Le mode contraste élevé est une palette dédiée.

Il n'utilise pas :

```css
filter: contrast(...)
```

Il possède notamment :

```text
fond noir
texte blanc
accent jaune
focus cyan
bordures blanches
aucune ombre décorative
aucun halo décoratif
```

Ce choix permet de contrôler directement la lisibilité et les états interactifs.

## Interface

Le composant partagé :

```text
ThemeSwitcher
```

est réutilisé dans :

```text
AppShell
Login
Register
```

Il propose trois boutons à état utilisant `aria-pressed`.

Le panneau peut être utilisé au clavier et fermé avec `Escape`.

## Conséquences

Les futurs composants frontend doivent utiliser les tokens existants ou introduire un nouveau token sémantique lorsqu'un nouveau besoin visuel apparaît.

Une couleur spécifique à un thème ne doit pas être codée directement dans un composant métier.

Les exceptions possibles sont les représentations visuelles des thèmes eux-mêmes, comme les miniatures du sélecteur.

## Hors périmètre

Ne sont pas implémentés actuellement :

```text
mode système
préférence synchronisée avec le compte
thèmes personnalisés
accent personnalisable
```
