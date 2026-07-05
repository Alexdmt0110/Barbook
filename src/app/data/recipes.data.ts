import { Recipe } from '../models/recipe.model';

const PLACEHOLDER_IMAGE = '/placeholder-cocktail.svg';

export const RECIPES: Recipe[] = [
  {
    id: 1,
    slug: 'derniere-part',
    name: 'Dernière part',
    imageUrl: PLACEHOLDER_IMAGE,

    type: 'Création perso',
    family: 'Sour dessert',
    mainAlcohol: 'Vodka',
    method: 'Shaker',

    glass: 'Coupette ou old fashioned',
    ice: 'Shaké avec glaçons puis sans glaçons, servi sans glace',

    tags: [
      'création perso',
      'vodka',
      'pomme',
      'cannelle',
      'citron vert',
      'blanc d’œuf',
      'dessert',
      'shaké',
      'mousse',
    ],

    ingredients: [
      {
        name: 'Vodka vanillée',
        quantity: '4 cl',
        volumeCl: 4,
        abv: 40,
      },
      {
        name: 'Liqueur de pomme',
        quantity: '2 cl',
        volumeCl: 2,
        abv: 18,
      },
      {
        name: 'Sirop de cannelle',
        quantity: '1 cl',
        volumeCl: 1,
        abv: 0,
      },
      {
        name: 'Citron vert',
        quantity: '1,5 cl',
        volumeCl: 1.5,
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
      'Verser tous les ingrédients du cocktail dans le shaker.',
      'Ajouter les glaçons.',
      'Shaker franchement pour refroidir et diluer.',
      'Retirer les glaçons ou filtrer le cocktail dans la petite timbale.',
      'Shaker une deuxième fois sans glaçons pour monter la mousse du blanc d’œuf.',
      'Filtrer dans le verre.',
      'Saupoudrer légèrement la mousse avec de la poudre de cannelle.',
    ],

    notes:
      'Version avec blanc d’œuf pour renforcer le côté gâteau et obtenir une mousse décorée à la cannelle.',
  },
  {
    id: 2,
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
        abv: 40,
      },
      {
        name: 'Citron vert',
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

    garnishIngredients: [
      {
        name: 'Zeste ou roue de citron vert',
        quantity: '1',
        usage: 'Décoration simple, optionnelle',
      },
    ],

    preparation: [
      'Rafraîchir la coupette si possible.',
      'Verser le rhum blanc, le citron vert et le sirop de sucre dans le shaker.',
      'Ajouter les glaçons.',
      'Shaker.',
      'Filtrer finement dans la coupette.',
      'Ajouter la décoration si souhaité.',
    ],

    notes: 'Classique simple : équilibre alcool, acidité, sucre.',
  },
];
