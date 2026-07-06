import { Recipe } from '../models/recipe.model';

const PLACEHOLDER_IMAGE = '/placeholder-cocktail.svg';

const ABV = {
  vodka: 40,
  gin: 40,
  rhum: 40,
  tequila: 40,
  cachaca: 40,
  whisky: 40,
  cointreau: 40,
  campari: 25,
  vermouthRouge: 15,
  aperol: 11,
  limoncello: 30,
  liqueurBergamote: 20,
  liqueurSureau: 20,
  liqueurPassion: 18,
  liqueurRose: 18,
  liqueurPomme: 18,
  liqueurCafe: 20,
  baileys: 17,
  cremePeche: 15,
  cremant: 12,
  champagne: 12,
};

export const RECIPES: Recipe[] = [
  {
    id: 1,
    slug: 'daiquiri',
    name: 'Daiquiri',
    imageUrl: PLACEHOLDER_IMAGE,

    type: 'Classique',
    family: 'Sour',
    mainAlcohol: 'Rhum',
    method: 'Shaker',

    glass: 'Coupette',
    ice: 'Shaké avec glaçons, servi sans glace',

    tags: ['classique', 'rhum', 'citron vert', 'sucre', 'sour', 'shaké'],

    ingredients: [
      {
        name: 'Rhum blanc',
        quantity: '6 cl',
        volumeCl: 6,
        abv: ABV.rhum,
      },
      {
        name: 'Jus de citron vert',
        quantity: '3 cl',
        volumeCl: 3,
        abv: 0,
      },
      {
        name: 'Sirop de sucre',
        quantity: '1 cl',
        volumeCl: 1,
        abv: 0,
      },
    ],

    garnishIngredients: [],

    preparation: [
      'Verser le rhum blanc, le jus de citron vert et le sirop de sucre dans le shaker.',
      'Ajouter les glaçons.',
      'Shaker franchement.',
      'Filtrer dans une coupette.',
    ],

    notes: 'Classique simple : équilibre alcool, acidité et sucre.',
  },
  {
    id: 2,
    slug: 'caipirinha',
    name: 'Caipirinha',
    imageUrl: PLACEHOLDER_IMAGE,

    type: 'Classique',
    family: 'Cocktail pilé',
    mainAlcohol: 'Cachaça',
    method: 'Build',

    glass: 'Old Fashioned',
    ice: 'Glace ou glace pilée',

    tags: ['classique', 'cachaça', 'citron vert', 'sucre', 'build', 'pilé'],

    ingredients: [
      {
        name: 'Citron vert',
        quantity: '1/2 lime coupée en 4',
        volumeCl: 1.5,
        abv: 0,
      },
      {
        name: 'Sucre',
        quantity: '2 bar spoons',
        abv: 0,
      },
      {
        name: 'Fruit de la passion',
        quantity: '1/2 passion',
        abv: 0,
        notes: 'Optionnel',
      },
      {
        name: 'Cachaça',
        quantity: '6 cl',
        volumeCl: 6,
        abv: ABV.cachaca,
      },
    ],

    garnishIngredients: [],

    preparation: [
      'Mettre la lime et le sucre dans le verre.',
      'Écraser.',
      'Ajouter la cachaça.',
      'Mélanger.',
      'Ajouter la glace.',
    ],

    notes: 'Version avec demi-passion possible.',
  },
  {
    id: 3,
    slug: 'margarita',
    name: 'Margarita',
    imageUrl: PLACEHOLDER_IMAGE,

    type: 'Classique',
    family: 'Sour',
    mainAlcohol: 'Tequila',
    method: 'Shaker',

    glass: 'Verre Margarita',
    ice: 'Shaké avec glaçons, servi sans glace',

    tags: ['classique', 'tequila', 'cointreau', 'citron vert', 'agave', 'sour', 'shaké'],

    ingredients: [
      {
        name: 'Tequila',
        quantity: '4 cl',
        volumeCl: 4,
        abv: ABV.tequila,
      },
      {
        name: 'Cointreau',
        quantity: '2 cl',
        volumeCl: 2,
        abv: ABV.cointreau,
      },
      {
        name: 'Jus de citron vert',
        quantity: '3 cl',
        volumeCl: 3,
        abv: 0,
      },
      {
        name: 'Sirop d’agave',
        quantity: '1,5 cl',
        volumeCl: 1.5,
        abv: 0,
      },
    ],

    garnishIngredients: [
      {
        name: 'Sel',
        quantity: 'QS',
        usage: 'Faire un rim sur le bord du verre',
      },
    ],

    preparation: [
      'Préparer le verre avec le sel sur le bord.',
      'Verser la tequila, le Cointreau, le jus de citron vert et le sirop d’agave dans le shaker.',
      'Ajouter les glaçons.',
      'Shaker.',
      'Servir dans le verre préparé.',
    ],

    notes: 'Version notée avec 3 cl de jus de citron vert à la place de “1 lime”.',
  },
  {
    id: 4,
    slug: 'mule',
    name: 'Mule',
    imageUrl: PLACEHOLDER_IMAGE,

    type: 'Classique',
    family: 'Long drink',
    mainAlcohol: 'Au choix',
    method: 'Build',

    glass: 'Old Fashioned',
    ice: 'Glaçons',

    tags: ['classique', 'mule', 'ginger beer', 'citron vert', 'build', 'long drink'],

    ingredients: [
      {
        name: 'Citron vert',
        quantity: '1/2 lime coupée en 4',
        volumeCl: 1.5,
        abv: 0,
      },
      {
        name: 'Sirop de sucre',
        quantity: '2 cl',
        volumeCl: 2,
        abv: 0,
      },
      {
        name: 'Alcool au choix',
        quantity: '5 cl',
        volumeCl: 5,
        abv: ABV.vodka,
        notes: 'Vodka, gin, rhum, tequila… selon la variante',
      },
      {
        name: 'Ginger beer',
        quantity: '1 bouteille',
        volumeCl: 12,
        abv: 0,
      },
    ],

    garnishIngredients: [
      {
        name: 'Citron vert',
        quantity: '1 tranche',
        usage: 'Décoration sur le verre',
      },
    ],

    preparation: [
      'Écraser la lime avec le sirop de sucre.',
      'Ajouter l’alcool choisi.',
      'Ajouter les glaçons.',
      'Compléter avec la ginger beer.',
      'Mélanger légèrement.',
    ],

    notes: 'Fiche générique pour les variantes de Mule.',
  },
  {
    id: 5,
    slug: 'negroni',
    name: 'Negroni',
    imageUrl: PLACEHOLDER_IMAGE,

    type: 'Classique',
    family: 'Cocktail à parts égales',
    mainAlcohol: 'Gin',
    method: 'Verre à mélange',

    glass: 'Old Fashioned',
    ice: 'Gros glaçon ou glaçons',

    tags: ['classique', 'gin', 'campari', 'vermouth rouge', 'amer', 'verre à mélange'],

    ingredients: [
      {
        name: 'Gin',
        quantity: '3 cl',
        volumeCl: 3,
        abv: ABV.gin,
      },
      {
        name: 'Campari',
        quantity: '3 cl',
        volumeCl: 3,
        abv: ABV.campari,
      },
      {
        name: 'Vermouth rouge',
        quantity: '3 cl',
        volumeCl: 3,
        abv: ABV.vermouthRouge,
      },
    ],

    garnishIngredients: [
      {
        name: 'Orange',
        quantity: '1 zeste ou tranche',
        usage: 'Décoration et aromatique',
      },
    ],

    preparation: [
      'Mettre les ingrédients dans le verre à mélange.',
      'Ajouter la glace.',
      'Faire environ 20 tours.',
      'Servir dans un verre Old Fashioned.',
    ],

    notes: 'Negroni classique à parts égales.',
  },
  {
    id: 6,
    slug: 'aperol-spritz',
    name: 'Aperol Spritz',
    imageUrl: PLACEHOLDER_IMAGE,

    type: 'Classique',
    family: 'Spritz',
    mainAlcohol: 'Aperol',
    method: 'Build',

    glass: 'Verre à vin',
    ice: 'Glaçons',

    tags: ['classique', 'spritz', 'aperol', 'crémant', 'eau pétillante', 'build'],

    ingredients: [
      {
        name: 'Aperol',
        quantity: '6 cl',
        volumeCl: 6,
        abv: ABV.aperol,
      },
      {
        name: 'Crémant',
        quantity: '9 cl',
        volumeCl: 9,
        abv: ABV.cremant,
      },
      {
        name: 'Eau pétillante',
        quantity: '3 cl',
        volumeCl: 3,
        abv: 0,
      },
    ],

    garnishIngredients: [
      {
        name: 'Orange',
        quantity: '1 tranche',
        usage: 'Décoration dans le verre',
      },
    ],

    preparation: [
      'Remplir le verre de glaçons.',
      'Verser l’Aperol.',
      'Ajouter le crémant.',
      'Compléter avec l’eau pétillante.',
      'Mélanger légèrement.',
      'Ajouter la décoration.',
    ],

    notes: 'Base spritz : 6 cl liqueur, 9 cl crémant, 3 cl eau pétillante.',
  },
  {
    id: 7,
    slug: 'campari-spritz',
    name: 'Campari Spritz',
    imageUrl: PLACEHOLDER_IMAGE,

    type: 'Classique',
    family: 'Spritz',
    mainAlcohol: 'Campari',
    method: 'Build',

    glass: 'Verre à vin',
    ice: 'Glaçons',

    tags: ['classique', 'spritz', 'campari', 'crémant', 'eau pétillante', 'amer', 'build'],

    ingredients: [
      {
        name: 'Campari',
        quantity: '6 cl',
        volumeCl: 6,
        abv: ABV.campari,
      },
      {
        name: 'Crémant',
        quantity: '9 cl',
        volumeCl: 9,
        abv: ABV.cremant,
      },
      {
        name: 'Eau pétillante',
        quantity: '3 cl',
        volumeCl: 3,
        abv: 0,
      },
    ],

    garnishIngredients: [
      {
        name: 'Orange',
        quantity: '1 tranche',
        usage: 'Décoration dans le verre',
      },
    ],

    preparation: [
      'Remplir le verre de glaçons.',
      'Verser le Campari.',
      'Ajouter le crémant.',
      'Compléter avec l’eau pétillante.',
      'Mélanger légèrement.',
      'Ajouter la décoration.',
    ],

    notes: 'Version plus amère que l’Aperol Spritz.',
  },
  {
    id: 8,
    slug: 'limoncello-spritz',
    name: 'Limoncello Spritz',
    imageUrl: PLACEHOLDER_IMAGE,

    type: 'Classique',
    family: 'Spritz',
    mainAlcohol: 'Limoncello',
    method: 'Build',

    glass: 'Verre à vin',
    ice: 'Glaçons',

    tags: ['classique', 'spritz', 'limoncello', 'citron', 'crémant', 'eau pétillante', 'build'],

    ingredients: [
      {
        name: 'Limoncello',
        quantity: '6 cl',
        volumeCl: 6,
        abv: ABV.limoncello,
      },
      {
        name: 'Crémant',
        quantity: '9 cl',
        volumeCl: 9,
        abv: ABV.cremant,
      },
      {
        name: 'Eau pétillante',
        quantity: '3 cl',
        volumeCl: 3,
        abv: 0,
      },
    ],

    garnishIngredients: [
      {
        name: 'Citron jaune',
        quantity: '1 tranche',
        usage: 'Décoration dans le verre',
      },
    ],

    preparation: [
      'Remplir le verre de glaçons.',
      'Verser le limoncello.',
      'Ajouter le crémant.',
      'Compléter avec l’eau pétillante.',
      'Mélanger légèrement.',
      'Ajouter la décoration.',
    ],

    notes: 'Spritz citronné.',
  },
  {
    id: 9,
    slug: 'spritz-bergamote',
    name: 'Spritz Bergamote',
    imageUrl: PLACEHOLDER_IMAGE,

    type: 'Classique',
    family: 'Spritz',
    mainAlcohol: 'Liqueur de bergamote',
    method: 'Build',

    glass: 'Verre à vin',
    ice: 'Glaçons',

    tags: ['classique', 'spritz', 'bergamote', 'citron vert', 'crémant', 'eau pétillante', 'build'],

    ingredients: [
      {
        name: 'Liqueur de bergamote',
        quantity: '6 cl',
        volumeCl: 6,
        abv: ABV.liqueurBergamote,
      },
      {
        name: 'Crémant',
        quantity: '9 cl',
        volumeCl: 9,
        abv: ABV.cremant,
      },
      {
        name: 'Eau pétillante',
        quantity: '3 cl',
        volumeCl: 3,
        abv: 0,
      },
      {
        name: 'Citron vert',
        quantity: '1/2 lime',
        volumeCl: 1.5,
        abv: 0,
      },
    ],

    garnishIngredients: [
      {
        name: 'Citron vert',
        quantity: '1 tranche',
        usage: 'Décoration dans le verre',
      },
    ],

    preparation: [
      'Remplir le verre de glaçons.',
      'Ajouter la demi-lime.',
      'Verser la liqueur de bergamote.',
      'Ajouter le crémant.',
      'Compléter avec l’eau pétillante.',
      'Mélanger légèrement.',
      'Ajouter la décoration.',
    ],

    notes: 'Spritz avec ajout de citron vert.',
  },
  {
    id: 10,
    slug: 'hugo-spritz',
    name: 'Hugo Spritz',
    imageUrl: PLACEHOLDER_IMAGE,

    type: 'Classique',
    family: 'Spritz',
    mainAlcohol: 'Liqueur de sureau',
    method: 'Build',

    glass: 'Verre à vin',
    ice: 'Glaçons',

    tags: ['classique', 'spritz', 'sureau', 'menthe', 'citron vert', 'crémant', 'build'],

    ingredients: [
      {
        name: 'Liqueur de sureau',
        quantity: '6 cl',
        volumeCl: 6,
        abv: ABV.liqueurSureau,
      },
      {
        name: 'Crémant',
        quantity: '9 cl',
        volumeCl: 9,
        abv: ABV.cremant,
      },
      {
        name: 'Eau pétillante',
        quantity: '3 cl',
        volumeCl: 3,
        abv: 0,
      },
      {
        name: 'Citron vert',
        quantity: '1/2 lime',
        volumeCl: 1.5,
        abv: 0,
      },
      {
        name: 'Menthe',
        quantity: 'Quelques feuilles',
        abv: 0,
      },
    ],

    garnishIngredients: [
      {
        name: 'Menthe',
        quantity: '1 tête',
        usage: 'Décoration aromatique',
      },
      {
        name: 'Citron vert',
        quantity: '1 tranche',
        usage: 'Décoration dans le verre',
      },
    ],

    preparation: [
      'Remplir le verre de glaçons.',
      'Ajouter la demi-lime et les feuilles de menthe.',
      'Verser la liqueur de sureau.',
      'Ajouter le crémant.',
      'Compléter avec l’eau pétillante.',
      'Mélanger légèrement.',
      'Ajouter la décoration.',
    ],

    notes: 'Spritz au sureau avec menthe et citron vert.',
  },
  {
    id: 11,
    slug: 'mojito',
    name: 'Mojito',
    imageUrl: PLACEHOLDER_IMAGE,

    type: 'Classique',
    family: 'Long drink',
    mainAlcohol: 'Rhum',
    method: 'Build',

    glass: 'Highball',
    ice: 'Glaçons puis glace pilée',

    tags: ['classique', 'rhum', 'menthe', 'citron vert', 'angostura', 'eau pétillante', 'build'],

    ingredients: [
      {
        name: 'Citron vert',
        quantity: '1/2 lime coupée en 4',
        volumeCl: 1.5,
        abv: 0,
      },
      {
        name: 'Sucre',
        quantity: '2 bonnes cuillères',
        abv: 0,
      },
      {
        name: 'Menthe',
        quantity: 'Une dizaine de feuilles',
        abv: 0,
      },
      {
        name: 'Rhum blanc',
        quantity: '2 cl',
        volumeCl: 2,
        abv: ABV.rhum,
      },
      {
        name: 'Rhum ambré',
        quantity: '3 cl',
        volumeCl: 3,
        abv: ABV.rhum,
      },
      {
        name: 'Eau pétillante',
        quantity: 'Top',
        volumeCl: 8,
        abv: 0,
      },
      {
        name: 'Angostura',
        quantity: 'Quelques traits',
        abv: 44.7,
      },
    ],

    garnishIngredients: [
      {
        name: 'Menthe',
        quantity: '1 tête',
        usage: 'Décoration aromatique',
      },
    ],

    preparation: [
      'Écraser la lime avec le sucre.',
      'Ajouter la menthe.',
      'Ajouter les rhums.',
      'Ajouter la glace.',
      'Compléter avec l’eau pétillante.',
      'Bien mélanger avec une bar spoon.',
      'Ajouter la glace pilée.',
      'Finir avec l’Angostura.',
    ],

    notes: 'Version avec mélange rhum blanc et rhum ambré.',
  },
  {
    id: 12,
    slug: 'virgin-mojito',
    name: 'Virgin Mojito',
    imageUrl: PLACEHOLDER_IMAGE,

    type: 'Variation',
    family: 'Sans alcool',
    mainAlcohol: 'Sans alcool',
    method: 'Build',

    glass: 'Highball',
    ice: 'Glaçons puis glace pilée',

    tags: ['sans alcool', 'mojito', 'menthe', 'citron vert', 'jus de pomme', 'limonade', 'build'],

    ingredients: [
      {
        name: 'Citron vert',
        quantity: '1/2 lime coupée en 4',
        volumeCl: 1.5,
        abv: 0,
      },
      {
        name: 'Sucre',
        quantity: '2 bonnes cuillères',
        abv: 0,
      },
      {
        name: 'Menthe',
        quantity: 'Une dizaine de feuilles',
        abv: 0,
      },
      {
        name: 'Jus de pomme',
        quantity: '6 cl',
        volumeCl: 6,
        abv: 0,
      },
      {
        name: 'Limonade',
        quantity: 'Top',
        volumeCl: 8,
        abv: 0,
      },
    ],

    garnishIngredients: [
      {
        name: 'Menthe',
        quantity: '1 tête',
        usage: 'Décoration aromatique',
      },
    ],

    preparation: [
      'Écraser la lime avec le sucre.',
      'Ajouter la menthe.',
      'Ajouter le jus de pomme.',
      'Ajouter les glaçons.',
      'Compléter avec la limonade.',
      'Bien mélanger avec une bar spoon.',
      'Ajouter la glace pilée.',
      'Ajouter la décoration.',
    ],

    notes: 'Version sans alcool : pas d’Angostura, car c’est alcoolisé.',
  },
  {
    id: 13,
    slug: 'mai-tai',
    name: 'Mai Tai',
    imageUrl: PLACEHOLDER_IMAGE,

    type: 'Classique',
    family: 'Tiki',
    mainAlcohol: 'Rhum',
    method: 'Shaker',

    glass: 'Tiki ou Old Fashioned',
    ice: 'Glaçons ou glace pilée selon service',

    tags: ['classique', 'tiki', 'rhum', 'cointreau', 'orgeat', 'citron vert', 'shaké'],

    ingredients: [
      {
        name: 'Rhum blanc',
        quantity: '3 cl',
        volumeCl: 3,
        abv: ABV.rhum,
      },
      {
        name: 'Rhum ambré',
        quantity: '3 cl',
        volumeCl: 3,
        abv: ABV.rhum,
      },
      {
        name: 'Cointreau',
        quantity: '2,5 cl',
        volumeCl: 2.5,
        abv: ABV.cointreau,
      },
      {
        name: 'Sirop d’orgeat',
        quantity: '2 cl',
        volumeCl: 2,
        abv: 0,
      },
      {
        name: 'Jus de citron vert',
        quantity: '3 cl',
        volumeCl: 3,
        abv: 0,
      },
      {
        name: 'Sirop de sucre',
        quantity: 'Fond',
        volumeCl: 0.5,
        abv: 0,
      },
    ],

    garnishIngredients: [],

    preparation: [
      'Verser tous les ingrédients dans le shaker.',
      'Ajouter les glaçons.',
      'Shaker.',
      'Servir dans le verre.',
    ],

    notes: 'Version classique sans la note ananas.',
  },
  {
    id: 14,
    slug: 'pina-colada-classique',
    name: 'Piña Colada classique',
    imageUrl: PLACEHOLDER_IMAGE,

    type: 'Classique',
    family: 'Tropical',
    mainAlcohol: 'Rhum',
    method: 'Blender',

    glass: 'Hurricane ou grand verre',
    ice: 'Blender avec glace',

    tags: ['classique', 'rhum', 'ananas', 'coco', 'tropical', 'blender'],

    ingredients: [
      {
        name: 'Rhum blanc',
        quantity: '6 cl',
        volumeCl: 6,
        abv: ABV.rhum,
      },
      {
        name: 'Jus d’ananas',
        quantity: '8 cl',
        volumeCl: 8,
        abv: 0,
      },
      {
        name: 'Purée de coco',
        quantity: '8 cl',
        volumeCl: 8,
        abv: 0,
      },
      {
        name: 'Sirop de sucre',
        quantity: '2 cl',
        volumeCl: 2,
        abv: 0,
      },
    ],

    garnishIngredients: [
      {
        name: 'Ananas',
        quantity: '1 morceau',
        usage: 'Décoration sur le verre',
      },
    ],

    preparation: [
      'Verser tous les ingrédients dans le blender.',
      'Ajouter la glace.',
      'Mixer jusqu’à obtenir une texture homogène.',
      'Servir dans le verre.',
      'Ajouter la décoration.',
    ],

    notes: 'Version classique au blender.',
  },
  {
    id: 15,
    slug: 'pina-colada-shaker',
    name: 'Piña Colada shaker',
    imageUrl: PLACEHOLDER_IMAGE,

    type: 'Variation',
    family: 'Tropical',
    mainAlcohol: 'Rhum',
    method: 'Shaker',

    glass: 'Hurricane ou grand verre',
    ice: 'Shaké avec glaçons',

    tags: ['variation', 'rhum', 'ananas', 'coco', 'vanille', 'citron vert', 'tabasco', 'shaké'],

    ingredients: [
      {
        name: 'Rhum ambré',
        quantity: '4 cl',
        volumeCl: 4,
        abv: ABV.rhum,
      },
      {
        name: 'Jus d’ananas',
        quantity: '9 cl',
        volumeCl: 9,
        abv: 0,
      },
      {
        name: 'Purée de coco',
        quantity: '3 cl',
        volumeCl: 3,
        abv: 0,
      },
      {
        name: 'Sirop de coco',
        quantity: '1,5 cl',
        volumeCl: 1.5,
        abv: 0,
      },
      {
        name: 'Sirop de vanille',
        quantity: '2,5 cl',
        volumeCl: 2.5,
        abv: 0,
      },
      {
        name: 'Jus de citron vert',
        quantity: '1/2 lime',
        volumeCl: 1.5,
        abv: 0,
      },
      {
        name: 'Tabasco',
        quantity: '1 goutte',
        abv: 0,
      },
    ],

    garnishIngredients: [
      {
        name: 'Ananas',
        quantity: '1 morceau',
        usage: 'Décoration sur le verre',
      },
    ],

    preparation: [
      'Verser tous les ingrédients dans le shaker.',
      'Ajouter les glaçons.',
      'Shaker fort pour bien intégrer la coco.',
      'Servir dans le verre.',
      'Ajouter la décoration.',
    ],

    notes: 'Version repimpée au shaker.',
  },
  {
    id: 16,
    slug: 'bateau',
    name: '⛵️ Bateau',
    imageUrl: PLACEHOLDER_IMAGE,

    type: 'Variation',
    family: 'Recette du bar',
    mainAlcohol: 'Vodka',
    method: 'Shaker',

    glass: 'À préciser',
    ice: 'Shaké avec glaçons',

    tags: [
      'recette du bar',
      'vodka',
      'baileys',
      'ananas',
      'framboise',
      'vanille',
      'citron vert',
      'shaké',
    ],

    ingredients: [
      {
        name: 'Vodka',
        quantity: '4,5 cl',
        volumeCl: 4.5,
        abv: ABV.vodka,
      },
      {
        name: 'Baileys',
        quantity: '3 cl',
        volumeCl: 3,
        abv: ABV.baileys,
      },
      {
        name: 'Jus d’ananas',
        quantity: '6 cl',
        volumeCl: 6,
        abv: 0,
      },
      {
        name: 'Jus de citron vert',
        quantity: '1/2 lime',
        volumeCl: 1.5,
        abv: 0,
      },
      {
        name: 'Purée de framboise',
        quantity: '3 cl',
        volumeCl: 3,
        abv: 0,
      },
      {
        name: 'Sirop de vanille',
        quantity: '2 cl',
        volumeCl: 2,
        abv: 0,
      },
    ],

    garnishIngredients: [
      {
        name: 'Citron vert séché',
        quantity: '1 tranche',
        usage: 'Décoration sur le verre',
      },
    ],

    preparation: [
      'Verser tous les ingrédients dans le shaker.',
      'Ajouter les glaçons.',
      'Shaker.',
      'Filtrer dans le verre.',
      'Ajouter la tranche de citron vert séché.',
    ],

    notes: 'Cocktail appelé “Bateau” par les collègues du bar.',
  },
  {
    id: 17,
    slug: 'pornstar-martini-fruit-frais',
    name: 'Pornstar Martini fruit frais',
    imageUrl: PLACEHOLDER_IMAGE,

    type: 'Classique',
    family: 'Martini fruité',
    mainAlcohol: 'Vodka',
    method: 'Shaker',

    glass: 'Verre Martini ou coupette',
    ice: 'Shaké avec glaçons',

    tags: [
      'classique',
      'vodka vanille',
      'passion',
      'citron vert',
      'blanc d’œuf',
      'champagne',
      'shaké',
    ],

    ingredients: [
      {
        name: 'Vodka vanille',
        quantity: '5 cl',
        volumeCl: 5,
        abv: ABV.vodka,
      },
      {
        name: 'Jus de citron vert',
        quantity: '1/2 lime',
        volumeCl: 1.5,
        abv: 0,
      },
      {
        name: 'Fruit de la passion',
        quantity: '1,5 fruit',
        abv: 0,
        notes: 'Dans le shaker',
      },
      {
        name: 'Liqueur de passion',
        quantity: '2 cl',
        volumeCl: 2,
        abv: ABV.liqueurPassion,
      },
      {
        name: 'Sirop de vanille',
        quantity: '1,5 cl',
        volumeCl: 1.5,
        abv: 0,
      },
      {
        name: 'Blanc d’œuf',
        quantity: '6 cl',
        volumeCl: 6,
        abv: 0,
      },
    ],

    garnishIngredients: [
      {
        name: 'Fruit de la passion',
        quantity: '1/2 passion',
        usage: 'Décoration sur le bord du verre',
      },
      {
        name: 'Champagne',
        quantity: '1 shot',
        usage: 'Servir à côté en accompagnement',
      },
    ],

    preparation: [
      'Verser tous les ingrédients du cocktail dans le shaker.',
      'Ajouter les glaçons.',
      'Shaker.',
      'Filtrer dans le verre.',
      'Ajouter la demi-passion sur le bord.',
      'Servir avec un shot de champagne à côté.',
    ],

    notes: 'Version réalisée avec de vrais fruits de la passion.',
  },
  {
    id: 18,
    slug: 'pornstar-martini-sans-fruit-frais',
    name: 'Pornstar Martini sans fruit frais',
    imageUrl: PLACEHOLDER_IMAGE,

    type: 'Variation',
    family: 'Martini fruité',
    mainAlcohol: 'Vodka',
    method: 'Shaker',

    glass: 'Verre Martini ou coupette',
    ice: 'Shaké avec glaçons',

    tags: [
      'variation',
      'vodka vanille',
      'passion',
      'citron vert',
      'blanc d’œuf',
      'champagne',
      'shaké',
    ],

    ingredients: [
      {
        name: 'Purée passion',
        quantity: '3 cl',
        volumeCl: 3,
        abv: 0,
      },
      {
        name: 'Liqueur de passion',
        quantity: '2 cl',
        volumeCl: 2,
        abv: ABV.liqueurPassion,
      },
      {
        name: 'Jus de passion',
        quantity: '6 cl',
        volumeCl: 6,
        abv: 0,
      },
      {
        name: 'Vodka vanille',
        quantity: '4,5 cl',
        volumeCl: 4.5,
        abv: ABV.vodka,
      },
      {
        name: 'Jus de citron vert',
        quantity: '1/2 lime',
        volumeCl: 1.5,
        abv: 0,
      },
      {
        name: 'Blanc d’œuf',
        quantity: '3 cl',
        volumeCl: 3,
        abv: 0,
      },
    ],

    garnishIngredients: [
      {
        name: 'Champagne',
        quantity: '1 shot',
        usage: 'Servir à côté en accompagnement',
      },
    ],

    preparation: [
      'Verser tous les ingrédients du cocktail dans le shaker.',
      'Ajouter les glaçons.',
      'Shaker.',
      'Filtrer dans le verre.',
      'Servir avec un shot de champagne à côté.',
    ],

    notes: 'Version de secours quand il n’y a pas de fruits de la passion frais.',
  },
  {
    id: 19,
    slug: 'espresso-martini-cerise',
    name: 'Espresso Martini cerise',
    imageUrl: PLACEHOLDER_IMAGE,

    type: 'Variation',
    family: 'Classique revisité',
    mainAlcohol: 'Vodka',
    method: 'Shaker',

    glass: 'Coupette ou verre Martini',
    ice: 'Shaké avec glaçons',

    tags: ['classique revisité', 'vodka', 'café', 'crème de café', 'cerise', 'shaké'],

    ingredients: [
      {
        name: 'Vodka',
        quantity: '6 cl',
        volumeCl: 6,
        abv: ABV.vodka,
      },
      {
        name: 'Café',
        quantity: '6 cl',
        volumeCl: 6,
        abv: 0,
      },
      {
        name: 'Crème de café',
        quantity: '2 cl',
        volumeCl: 2,
        abv: ABV.liqueurCafe,
      },
      {
        name: 'Sirop de cerise',
        quantity: '1,5 cl',
        volumeCl: 1.5,
        abv: 0,
      },
    ],

    garnishIngredients: [],

    preparation: [
      'Verser la vodka, le café, la crème de café et le sirop de cerise dans le shaker.',
      'Ajouter les glaçons.',
      'Shaker fort.',
      'Filtrer dans le verre.',
    ],

    notes: 'Variantes possibles : amaretto ou vanille.',
  },
  {
    id: 20,
    slug: 'sunset-lover',
    name: 'Sunset Lover',
    imageUrl: PLACEHOLDER_IMAGE,

    type: 'Création perso',
    family: 'Long drink fruité',
    mainAlcohol: 'Whisky',
    method: 'Build',

    glass: 'Highball ou grand verre',
    ice: 'Glaçons',

    tags: ['création perso', 'whisky', 'pêche', 'citron vert', 'eau pétillante', 'cerise', 'build'],

    ingredients: [
      {
        name: 'Paddy',
        quantity: '4 cl',
        volumeCl: 4,
        abv: ABV.whisky,
      },
      {
        name: 'Crème de pêche de vigne',
        quantity: '3 cl',
        volumeCl: 3,
        abv: ABV.cremePeche,
      },
      {
        name: 'Jus de citron vert',
        quantity: '1/2 lime',
        volumeCl: 1.5,
        abv: 0,
      },
      {
        name: 'Eau pétillante',
        quantity: 'Top',
        volumeCl: 8,
        abv: 0,
      },
      {
        name: 'Sirop de cerise',
        quantity: 'Top',
        volumeCl: 1,
        abv: 0,
      },
    ],

    garnishIngredients: [
      {
        name: 'Citron vert',
        quantity: '1 tranche',
        usage: 'Décoration sur le verre',
      },
    ],

    preparation: [
      'Remplir le verre de glaçons.',
      'Verser le Paddy.',
      'Ajouter la crème de pêche de vigne.',
      'Ajouter le jus de citron vert.',
      'Compléter avec l’eau pétillante.',
      'Ajouter le sirop de cerise pour créer l’effet coucher de soleil.',
      'Ajouter la décoration.',
    ],

    notes: 'Recette validée avec 4 cl de Paddy.',
  },
  {
    id: 21,
    slug: 'roses-sous-la-neige',
    name: 'Roses sous la neige',
    imageUrl: PLACEHOLDER_IMAGE,

    type: 'Variation',
    family: 'Sour floral',
    mainAlcohol: 'Gin',
    method: 'Shaker',

    glass: 'Coupette',
    ice: 'Shaké avec glaçons puis servi sans glace',

    tags: ['gin', 'passion', 'rose', 'blanc d’œuf', 'citron vert', 'floral', 'shaké'],

    ingredients: [
      {
        name: 'Gin',
        quantity: '4,5 cl',
        volumeCl: 4.5,
        abv: ABV.gin,
      },
      {
        name: 'Liqueur de passion',
        quantity: '2 cl',
        volumeCl: 2,
        abv: ABV.liqueurPassion,
      },
      {
        name: 'Liqueur de rose',
        quantity: '1 cl',
        volumeCl: 1,
        abv: ABV.liqueurRose,
      },
      {
        name: 'Blanc d’œuf',
        quantity: '3 cl',
        volumeCl: 3,
        abv: 0,
      },
      {
        name: 'Jus de citron vert',
        quantity: '3 cl',
        volumeCl: 3,
        abv: 0,
      },
    ],

    garnishIngredients: [],

    preparation: [
      'Verser tous les ingrédients dans le shaker.',
      'Ajouter les glaçons.',
      'Shaker.',
      'Filtrer dans le verre.',
    ],

    notes: 'Ce n’est pas une création perso.',
  },
  {
    id: 22,
    slug: 'derniere-part',
    name: 'Dernière Part',
    imageUrl: PLACEHOLDER_IMAGE,

    type: 'Création perso',
    family: 'Sour dessert',
    mainAlcohol: 'Vodka',
    method: 'Shaker',

    glass: 'Petite coupette bien froide',
    ice: 'Shaké avec glaçons puis double strain',

    tags: [
      'création perso',
      'vodka',
      'vanille',
      'pomme',
      'cannelle',
      'citron vert',
      'blanc d’œuf',
      'dessert',
      'shaké',
    ],

    ingredients: [
      {
        name: 'Vodka infusée à la vanille maison',
        quantity: '4 cl',
        volumeCl: 4,
        abv: ABV.vodka,
      },
      {
        name: 'Liqueur de pomme verte Vedrenne',
        quantity: '2 cl',
        volumeCl: 2,
        abv: ABV.liqueurPomme,
      },
      {
        name: 'Jus de pomme',
        quantity: '3 cl',
        volumeCl: 3,
        abv: 0,
      },
      {
        name: 'Sirop de cannelle',
        quantity: '1 cl',
        volumeCl: 1,
        abv: 0,
      },
      {
        name: 'Jus de citron vert',
        quantity: '1 cl',
        volumeCl: 1,
        abv: 0,
      },
      {
        name: 'Blanc d’œuf',
        quantity: '2 cl',
        volumeCl: 2,
        abv: 0,
        notes: 'Pour créer une mousse dense',
      },
    ],

    garnishIngredients: [
      {
        name: 'Poudre de cannelle',
        quantity: 'QS',
        usage: 'Saupoudrer légèrement sur la mousse',
      },
    ],

    preparation: [
      'Rafraîchir la petite coupette.',
      'Verser tous les ingrédients dans le shaker.',
      'Ajouter les glaçons.',
      'Shaker franchement.',
      'Double strain dans la coupette bien froide.',
      'Saupoudrer légèrement la mousse avec de la poudre de cannelle.',
    ],

    notes: 'Création perso pensée autour de la pomme, de la vanille et de la cannelle.',
  },
];
