import { FormArray, FormBuilder, ValidatorFn, Validators } from '@angular/forms';
import {
  CocktailContent,
  ContentGarnish,
  ContentIngredient,
  RecipeAbvMode,
} from '../data-access/cocktail-content.models';
import { CocktailType, RecipeMethod } from '../data-access/cocktail.models';
import {
  GarnishInputUnit,
  IngredientInputUnit,
  MAX_STORED_AMOUNT,
  garnishMeasurementValidator,
  ingredientMeasurementValidator,
  trimmedRequiredValidator,
  uniqueCanonicalIngredientsValidator,
} from '../cocktail-create/cocktail-create.form';
import { toSlug } from '../../../shared/utils/slug';

const decimal =
  (places: number): ValidatorFn =>
  (control) => {
    const n: unknown = control.value;
    return n == null ||
      (typeof n === 'number' &&
        Number.isFinite(n) &&
        Math.abs(n * 10 ** places - Math.round(n * 10 ** places)) < 0.00001)
      ? null
      : { decimal: true };
  };
const degree = [Validators.min(0), Validators.max(100), decimal(2)];
const amount = [Validators.min(0.001), Validators.max(MAX_STORED_AMOUNT), decimal(3)];
const text = (fb: FormBuilder, value: string, max: number, required = false) =>
  fb.nonNullable.control(
    value,
    required
      ? [trimmedRequiredValidator(), Validators.maxLength(max)]
      : [Validators.maxLength(max)],
  );

export function editIngredient(fb: FormBuilder, value?: ContentIngredient) {
  return fb.group(
    {
      ingredientName: text(fb, value?.ingredientName ?? '', 120, true),
      ingredientDefaultAbv: fb.control<number | null>(value?.ingredientDefaultAbv ?? null, degree),
      amount: fb.control<number | null>(value?.amount ?? null, amount),
      unit: fb.nonNullable.control<IngredientInputUnit>(value?.unit ?? 'CL'),
      specification: text(fb, value?.specification ?? '', 160),
      abvMode: fb.nonNullable.control<RecipeAbvMode>(value?.abvMode ?? 'INHERIT'),
      abvOverride: fb.control<number | null>(value?.abvOverride ?? null, degree),
      notes: text(fb, value?.notes ?? '', 500),
    },
    {
      validators: [
        ingredientMeasurementValidator,
        (group) =>
          group.get('abvMode')?.value === 'OVERRIDE' && group.get('abvOverride')?.value == null
            ? { overrideRequired: true }
            : null,
      ],
    },
  );
}
export function editGarnish(fb: FormBuilder, value?: ContentGarnish) {
  return fb.group(
    {
      ingredientName: text(fb, value?.ingredientName ?? '', 120, true),
      amount: fb.control<number | null>(value?.amount ?? null, amount),
      unit: fb.nonNullable.control<GarnishInputUnit>((value?.unit as GarnishInputUnit) ?? ''),
      specification: text(fb, value?.specification ?? '', 160),
      usage: text(fb, value?.usage ?? '', 500, true),
    },
    { validators: garnishMeasurementValidator },
  );
}
export function editStep(fb: FormBuilder, value = '') {
  return text(fb, value, 500, true);
}
export function createEditForm(fb: FormBuilder) {
  return fb.group(
    {
      name: fb.nonNullable.control('', [trimmedRequiredValidator(2), Validators.maxLength(120)]),
      type: fb.nonNullable.control<CocktailType>('PERSONAL_CREATION', Validators.required),
      family: text(fb, '', 80),
      method: fb.nonNullable.control<RecipeMethod>('SHAKER', Validators.required),
      glass: text(fb, '', 80, true),
      ice: text(fb, '', 80),
      notes: text(fb, '', 4000),
      mainAlcoholName: text(fb, '', 120),
      ingredients: new FormArray(
        [editIngredient(fb)],
        [uniqueCanonicalIngredientsValidator, Validators.minLength(1), Validators.maxLength(50)],
      ),
      garnishes: new FormArray<ReturnType<typeof editGarnish>>([], Validators.maxLength(20)),
      steps: new FormArray([editStep(fb)], [Validators.minLength(1), Validators.maxLength(30)]),
    },
    {
      validators: (group) => {
        const name = group.get('mainAlcoholName')?.value as string;
        const ingredients = group.get('ingredients')?.value as AlcoholSource[];
        return !name ||
          alcoholicEditIngredients(ingredients).some((n) => toSlug(n) === toSlug(name))
          ? null
          : { mainAlcohol: true };
      },
    },
  );
}
export type EditForm = ReturnType<typeof createEditForm>;
export type EditValue = ReturnType<EditForm['getRawValue']>;

export function fillEditForm(form: EditForm, fb: FormBuilder, content: CocktailContent): void {
  // Never pass this through the creation mapper: it infers overrides from effective values.
  form.controls.ingredients.clear({ emitEvent: false });
  content.ingredients.forEach((i) =>
    form.controls.ingredients.push(editIngredient(fb, i), { emitEvent: false }),
  );
  form.controls.garnishes.clear({ emitEvent: false });
  content.garnishes.forEach((g) =>
    form.controls.garnishes.push(editGarnish(fb, g), { emitEvent: false }),
  );
  form.controls.steps.clear({ emitEvent: false });
  content.steps.forEach((s) => form.controls.steps.push(editStep(fb, s), { emitEvent: false }));
  form.patchValue(
    {
      name: content.name,
      type: content.type,
      method: content.method,
      glass: content.glass,
      family: content.family ?? '',
      ice: content.ice ?? '',
      notes: content.notes ?? '',
      mainAlcoholName: content.mainAlcoholName ?? '',
    },
    { emitEvent: false },
  );
  form.markAsPristine();
  form.markAsUntouched();
}
export function fillEditDraft(form: EditForm, fb: FormBuilder, value: EditValue): void {
  form.controls.ingredients.clear({ emitEvent: false });
  value.ingredients.forEach(() =>
    form.controls.ingredients.push(editIngredient(fb), { emitEvent: false }),
  );
  form.controls.garnishes.clear({ emitEvent: false });
  value.garnishes.forEach(() =>
    form.controls.garnishes.push(editGarnish(fb), { emitEvent: false }),
  );
  form.controls.steps.clear({ emitEvent: false });
  value.steps.forEach(() => form.controls.steps.push(editStep(fb), { emitEvent: false }));
  form.setValue(value, { emitEvent: false });
  form.markAsDirty();
}
const optional = (value: string): string | null => value.trim() || null;
const measure = (amount: number | null, unit: IngredientInputUnit | '') => ({
  amount:
    unit === 'TOP_UP' || unit === ''
      ? null
      : unit === 'CL' && amount !== null
        ? Math.round(amount * 10_000) / 1000
        : amount,
  unit: unit === 'CL' ? ('ML' as const) : unit || null,
});
export function editContent(value: EditValue): CocktailContent {
  return {
    name: value.name.trim(),
    type: value.type,
    family: optional(value.family),
    method: value.method,
    glass: value.glass.trim(),
    ice: optional(value.ice),
    notes: optional(value.notes),
    mainAlcoholName: optional(value.mainAlcoholName),
    ingredients: value.ingredients.map((i) => ({
      ingredientName: i.ingredientName.trim(),
      ingredientDefaultAbv: i.ingredientDefaultAbv,
      amount: measure(i.amount, i.unit).amount,
      unit: i.unit === 'CL' ? 'ML' : i.unit,
      specification: optional(i.specification),
      abvMode: i.abvMode,
      abvOverride: i.abvMode === 'OVERRIDE' ? i.abvOverride : null,
      notes: optional(i.notes),
    })),
    garnishes: value.garnishes.map((g) => ({
      ingredientName: g.ingredientName.trim(),
      ...measure(g.amount, g.unit),
      specification: optional(g.specification),
      usage: g.usage.trim(),
    })),
    steps: value.steps.map((s) => s.trim()),
  };
}
type AlcoholSource = Pick<
  ContentIngredient,
  'ingredientName' | 'abvMode' | 'abvOverride' | 'ingredientDefaultAbv'
>;
export function alcoholicEditIngredients(ingredients: AlcoholSource[]): string[] {
  return ingredients
    .filter(
      (i) =>
        i.abvMode !== 'UNKNOWN' &&
        (i.abvMode === 'OVERRIDE' ? (i.abvOverride ?? 0) : (i.ingredientDefaultAbv ?? 0)) > 0,
    )
    .map((i) => i.ingredientName);
}
