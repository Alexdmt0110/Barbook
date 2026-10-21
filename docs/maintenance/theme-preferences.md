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

## Stockage tolérant B4c

ThemeService utilise BrowserStorageService.read/write (zone local, clé barbook.theme). Le try englobe le getter localStorage et la méthode ; fenêtre absente, SecurityError et quota plein ne bloquent ni bootstrap ni changement de thème. Le signal courant reste en mémoire ; après refresh avec persistance bloquée, le thème sombre par défaut revient. Le service ne fait aucun clear global et ne contient aucun cache privé.

BrowserStorageService offre read(zone,clé) → string|null et write/remove → booléen, zones local/session ; les appels sont best-effort et le consommateur garde son état mémoire. AuthService emploie remove pour la seule ancienne clé JWT, sans lecture ni secret nouveau en stockage JS. Les futurs brouillons B4d devront vérifier identité/workspace/TTL/version séparément et signaler l'absence de persistance ; cette brique ne les sérialise pas.
