import {
  draftKeys,
  draftNumber,
  draftObject,
  draftString,
} from '../../../core/drafts/draft-values';
import { IngredientSuggestion } from '../../ingredients/data-access/ingredient.models';
import { CocktailCreateFormValue } from './cocktail-create.form';
import {
  COCKTAIL_TYPE_OPTIONS,
  GARNISH_UNIT_OPTIONS,
  INGREDIENT_UNIT_OPTIONS,
  RECIPE_METHOD_OPTIONS,
} from './cocktail-create.options';
export interface CreationDraft {
  form: CocktailCreateFormValue;
  selected: (IngredientSuggestion | null)[];
}
export function isCreationDraft(value: unknown): value is CreationDraft {
  if (
    !draftObject(value) ||
    !draftKeys(value, ['form', 'selected']) ||
    !draftObject(value['form']) ||
    !Array.isArray(value['selected'])
  )
    return false;
  const f = value['form'];
  return (
    draftKeys(f, [
      'name',
      'type',
      'family',
      'method',
      'glass',
      'ice',
      'mainAlcoholName',
      'notes',
      'ingredients',
      'garnishes',
      'steps',
    ]) &&
    ['name', 'family', 'glass', 'ice', 'mainAlcoholName', 'notes'].every((key) =>
      draftString(f[key]),
    ) &&
    COCKTAIL_TYPE_OPTIONS.some((option) => option.value === f['type']) &&
    RECIPE_METHOD_OPTIONS.some((option) => option.value === f['method']) &&
    Array.isArray(f['ingredients']) &&
    f['ingredients'].length >= 1 &&
    f['ingredients'].length <= 50 &&
    f['ingredients'].every(
      (i) =>
        draftObject(i) &&
        draftKeys(i, [
          'ingredientName',
          'ingredientDefaultAbv',
          'amount',
          'unit',
          'specification',
          'notes',
        ]) &&
        ['ingredientName', 'specification', 'notes'].every((k) => draftString(i[k])) &&
        draftNumber(i['amount']) &&
        draftNumber(i['ingredientDefaultAbv']) &&
        INGREDIENT_UNIT_OPTIONS.some((option) => option.value === i['unit']),
    ) &&
    Array.isArray(f['garnishes']) &&
    f['garnishes'].length <= 20 &&
    f['garnishes'].every(
      (g) =>
        draftObject(g) &&
        draftKeys(g, ['ingredientName', 'amount', 'unit', 'specification', 'usage']) &&
        ['ingredientName', 'specification', 'usage'].every((k) => draftString(g[k])) &&
        draftNumber(g['amount']) &&
        GARNISH_UNIT_OPTIONS.some((option) => option.value === g['unit']),
    ) &&
    Array.isArray(f['steps']) &&
    f['steps'].length >= 1 &&
    f['steps'].length <= 30 &&
    f['steps'].every(draftString) &&
    value['selected'].length === f['ingredients'].length &&
    value['selected'].every(
      (s) =>
        s === null ||
        (draftObject(s) &&
          draftKeys(s, ['id', 'slug', 'name', 'defaultAbv']) &&
          ['id', 'slug', 'name'].every((k) => draftString(s[k])) &&
          draftNumber(s['defaultAbv'])),
    )
  );
}
