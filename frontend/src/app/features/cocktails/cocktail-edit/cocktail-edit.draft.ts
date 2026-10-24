import {
  draftKeys,
  draftNumber,
  draftObject,
  draftString,
} from '../../../core/drafts/draft-values';
import {
  COCKTAIL_TYPE_OPTIONS,
  GARNISH_UNIT_OPTIONS,
  INGREDIENT_UNIT_OPTIONS,
  RECIPE_METHOD_OPTIONS,
} from '../cocktail-create/cocktail-create.options';
import { EditValue } from './cocktail-edit.form';

export interface EditDraft {
  schema: 1;
  form: EditValue;
}
/** Validate shape, not business validity: unfinished and invalid typed values remain recoverable. */
export function isEditDraft(value: unknown): value is EditDraft {
  if (
    !draftObject(value) ||
    !draftKeys(value, ['schema', 'form']) ||
    value['schema'] !== 1 ||
    !draftObject(value['form'])
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
      'notes',
      'mainAlcoholName',
      'ingredients',
      'garnishes',
      'steps',
    ]) &&
    ['name', 'family', 'glass', 'ice', 'notes', 'mainAlcoholName'].every((k) =>
      draftString(f[k]),
    ) &&
    COCKTAIL_TYPE_OPTIONS.some((o) => o.value === f['type']) &&
    RECIPE_METHOD_OPTIONS.some((o) => o.value === f['method']) &&
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
          'abvMode',
          'abvOverride',
          'notes',
        ]) &&
        ['ingredientName', 'specification', 'notes'].every((k) => draftString(i[k])) &&
        draftNumber(i['amount']) &&
        draftNumber(i['ingredientDefaultAbv']) &&
        draftNumber(i['abvOverride']) &&
        ['INHERIT', 'OVERRIDE', 'UNKNOWN'].includes(String(i['abvMode'])) &&
        INGREDIENT_UNIT_OPTIONS.some((o) => o.value === i['unit']),
    ) &&
    Array.isArray(f['garnishes']) &&
    f['garnishes'].length <= 20 &&
    f['garnishes'].every(
      (g) =>
        draftObject(g) &&
        draftKeys(g, ['ingredientName', 'amount', 'unit', 'specification', 'usage']) &&
        ['ingredientName', 'specification', 'usage'].every((k) => draftString(g[k])) &&
        draftNumber(g['amount']) &&
        GARNISH_UNIT_OPTIONS.some((o) => o.value === g['unit']),
    ) &&
    Array.isArray(f['steps']) &&
    f['steps'].length >= 1 &&
    f['steps'].length <= 30 &&
    f['steps'].every(draftString)
  );
}
