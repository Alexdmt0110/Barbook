# Préférences de thème

## Thèmes disponibles

Barbook propose actuellement :

```text
Sombre
Clair
Contraste élevé
```

Le thème sombre est utilisé par défaut.

## Architecture

```text
ThemeService
↓
localStorage
↓
<html data-theme>
↓
tokens CSS
↓
composants
```

La préférence ne dépend pas de l'authentification.

## Stockage

Clé :

```text
barbook.theme
```

Valeurs valides :

```text
dark
light
high-contrast
```

Le stockage utilise `localStorage`.

Une valeur absente, invalide ou inaccessible provoque un retour vers :

```text
dark
```

## Initialisation

`ThemeService.initialize()` est exécuté pendant l'initialisation Angular.

Le thème est donc appliqué aussi aux routes publiques :

```text
/login
/register
```

## Ajouter une couleur

Les composants ne doivent pas utiliser une couleur liée directement au thème.

Éviter :

```css
background: rgba(18, 11, 11, 0.82);
```

Préférer :

```css
background: var(--color-header-background);
```

Si aucun token ne correspond au besoin, créer un token sémantique dans chaque palette.

## Ajouter un thème

Un nouveau thème nécessite :

```text
1. ajouter sa valeur dans theme.models.ts
2. définir l'ensemble des tokens dans styles.css
3. l'ajouter au ThemeSwitcher
4. vérifier les contrastes
5. tester login/register/home/cocktails
6. ajouter les tests correspondants
```

## Accessibilité

Les principaux couples texte/fond ont été vérifiés pour conserver au minimum un contraste adapté au texte normal.

Le thème contraste élevé utilise volontairement :

```text
#000000 fond
#ffffff texte
#ffd600 accent
#00e5ff focus
```

Le focus clavier global utilise :

```css
:focus-visible
```

et reste visible dans les trois thèmes.

Les vérifications manuelles comprennent :

```text
navigation clavier
Escape sur le sélecteur
zoom 200 %
390 px
430 px
tablette
desktop
```

## Vérification

Depuis la racine :

```powershell
npm --prefix frontend run verify
```

La feature n'introduit aucune dépendance backend ou base de données.

## Limites

Le thème n'est actuellement pas synchronisé entre plusieurs navigateurs ou appareils.

Le choix dépend du stockage local du navigateur utilisé.
