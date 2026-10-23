import { FormBuilder } from '@angular/forms';
import { completeContent } from './cocktail-edit.test-fixture';
import { createEditForm, editContent, fillEditDraft, fillEditForm } from './cocktail-edit.form';
import { isEditDraft } from './cocktail-edit.draft';

describe('Editing adapter: lossless raw content and untrusted drafts', () => {
  const fb = new FormBuilder();
  it('round trips all fields, decimal amounts, nulls, order and every ABV source without inference', () => {
    const form = createEditForm(fb);
    fillEditForm(form, fb, completeContent());
    expect(form.valid).toBe(true);
    expect(form.pristine).toBe(true);
    expect(editContent(form.getRawValue())).toEqual(completeContent());
  });
  it('preserves absent optional values and decimal ML without converting them to CL', () => {
    const content = {
      ...completeContent(),
      family: null,
      ice: null,
      notes: null,
      mainAlcoholName: null,
    };
    const form = createEditForm(fb);
    fillEditForm(form, fb, content);
    expect(form.controls.ingredients.at(0).controls.unit.value).toBe('ML');
    expect(editContent(form.getRawValue())).toEqual(content);
  });
  it('converts an intentional CL entry, keeps TOP_UP null and excludes immutable fields', () => {
    const form = createEditForm(fb);
    fillEditForm(form, fb, completeContent());
    form.controls.ingredients.at(0).patchValue({ amount: 1.234, unit: 'CL' });
    const content = editContent(form.getRawValue());
    expect(content.ingredients[0].amount).toBe(12.34);
    expect(content.ingredients[3].amount).toBeNull();
    expect(Object.keys(content).sort()).toEqual(Object.keys(completeContent()).sort());
  });
  it('validates explicit zero and equal overrides but rejects missing override, duplicate identity and invalid main alcohol', () => {
    const form = createEditForm(fb);
    fillEditForm(form, fb, completeContent());
    form.controls.ingredients.at(1).controls.abvOverride.setValue(null);
    expect(form.invalid).toBe(true);
    form.controls.ingredients.at(1).controls.abvOverride.setValue(0);
    expect(form.valid).toBe(true);
    form.controls.mainAlcoholName.setValue('Inconnu');
    expect(form.hasError('mainAlcohol')).toBe(true);
    form.controls.mainAlcoholName.setValue('Gin');
    form.controls.ingredients.at(1).controls.ingredientName.setValue(' GIN ');
    expect(form.controls.ingredients.hasError('duplicateCanonicalIngredient')).toBe(true);
  });
  it('keeps invalid unfinished raw values in the same draft schema and restores them without normalizing', () => {
    const form = createEditForm(fb);
    fillEditForm(form, fb, completeContent());
    form.controls.ingredients.at(0).patchValue({ amount: -2, unit: 'CL' });
    const draft = { schema: 1, form: form.getRawValue() };
    expect(isEditDraft(draft)).toBe(true);
    const restored = createEditForm(fb);
    fillEditDraft(restored, fb, draft.form);
    expect(restored.getRawValue()).toEqual(draft.form);
    expect(restored.invalid).toBe(true);
  });
  it.each(['schema', 'field', 'mode', 'unit', 'number', 'bound'])(
    'rejects corrupt/incompatible draft %s',
    (kind) => {
      const form = createEditForm(fb);
      fillEditForm(form, fb, completeContent());
      const draft: Record<string, unknown> = { schema: 1, form: form.getRawValue() };
      const value = draft['form'] as Record<string, unknown>;
      const lines = value['ingredients'] as Record<string, unknown>[];
      if (kind === 'schema') draft['schema'] = 2;
      if (kind === 'field') value['workspaceId'] = 'foreign';
      if (kind === 'mode') lines[0]['abvMode'] = 'EFFECTIVE';
      if (kind === 'unit') lines[0]['unit'] = 'L';
      if (kind === 'number') lines[0]['amount'] = NaN;
      if (kind === 'bound') value['steps'] = Array(31).fill('x');
      expect(isEditDraft(draft)).toBe(false);
    },
  );
});
