import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { IngredientSuggestion } from '../../ingredients/data-access/ingredient.models';
import { IngredientAutocomplete } from '../../ingredients/ui/ingredient-autocomplete';
import {
  CocktailType,
  CreateCocktailGarnishRequest,
  CreateCocktailIngredientRequest,
  CreateCocktailRequest,
  MeasurementUnit,
  RecipeMethod,
} from '../data-access/cocktail.models';
import { CocktailsService } from '../data-access/cocktails.service';

type IngredientInputUnit = MeasurementUnit | 'CL';

type GarnishInputUnit = '' | Exclude<IngredientInputUnit, 'TOP_UP'>;

interface UnitOption<T extends string> {
  value: T;
  label: string;
}

type IngredientFormGroup = FormGroup<{
  ingredientName: FormControl<string>;
  ingredientDefaultAbv: FormControl<number | null>;
  amount: FormControl<number | null>;
  unit: FormControl<IngredientInputUnit>;
  specification: FormControl<string>;
  notes: FormControl<string>;
}>;

type GarnishFormGroup = FormGroup<{
  ingredientName: FormControl<string>;
  amount: FormControl<number | null>;
  unit: FormControl<GarnishInputUnit>;
  specification: FormControl<string>;
  usage: FormControl<string>;
}>;

type StepFormControl = FormControl<string>;

function ingredientMeasurementValidator(control: AbstractControl): ValidationErrors | null {
  const unit = control.get('unit')?.value;

  const amount = control.get('amount')?.value;

  if (unit === 'TOP_UP') {
    return amount === null || amount === undefined
      ? null
      : {
          topUpAmount: true,
        };
  }

  return typeof amount === 'number' && amount > 0
    ? null
    : {
        amountRequired: true,
      };
}

function garnishMeasurementValidator(control: AbstractControl): ValidationErrors | null {
  const unit = control.get('unit')?.value;

  const amount = control.get('amount')?.value;

  const hasUnit = typeof unit === 'string' && unit.length > 0;

  const hasAmount = typeof amount === 'number';

  return hasUnit === hasAmount
    ? null
    : {
        amountUnitPair: true,
      };
}

@Component({
  selector: 'app-cocktail-create',
  imports: [ReactiveFormsModule, RouterLink, IngredientAutocomplete],
  templateUrl: './cocktail-create.html',
  styleUrl: './cocktail-create.css',
})
export class CocktailCreate {
  private readonly formBuilder = inject(FormBuilder);

  private readonly cocktailsService = inject(CocktailsService);

  private readonly router = inject(Router);

  private readonly selectedIngredients = new WeakMap<IngredientFormGroup, IngredientSuggestion>();

  readonly isSubmitting = signal(false);

  readonly errorMessage = signal<string | null>(null);

  readonly cocktailTypes: UnitOption<CocktailType>[] = [
    {
      value: 'CLASSIC',
      label: 'Classique',
    },
    {
      value: 'PERSONAL_CREATION',
      label: 'Création personnelle',
    },
    {
      value: 'VARIATION',
      label: 'Variation',
    },
  ];

  readonly recipeMethods: UnitOption<RecipeMethod>[] = [
    {
      value: 'SHAKER',
      label: 'Shaker',
    },
    {
      value: 'MIXING_GLASS',
      label: 'Verre à mélange',
    },
    {
      value: 'BUILD',
      label: 'Direct au verre',
    },
    {
      value: 'BLENDER',
      label: 'Blender',
    },
  ];

  readonly ingredientUnits: UnitOption<IngredientInputUnit>[] = [
    {
      value: 'CL',
      label: 'cL',
    },
    {
      value: 'ML',
      label: 'mL',
    },
    {
      value: 'G',
      label: 'g',
    },
    {
      value: 'PIECE',
      label: 'pièce',
    },
    {
      value: 'LEAF',
      label: 'feuille',
    },
    {
      value: 'SPRIG',
      label: 'brin',
    },
    {
      value: 'DASH',
      label: 'dash',
    },
    {
      value: 'DROP',
      label: 'goutte',
    },
    {
      value: 'BAR_SPOON',
      label: 'cuillère de bar',
    },
    {
      value: 'TEASPOON',
      label: 'cuillère à café',
    },
    {
      value: 'TABLESPOON',
      label: 'cuillère à soupe',
    },
    {
      value: 'SCOOP',
      label: 'boule',
    },
    {
      value: 'PINCH',
      label: 'pincée',
    },
    {
      value: 'TOP_UP',
      label: 'compléter',
    },
  ];

  readonly garnishUnits: UnitOption<GarnishInputUnit>[] = [
    {
      value: '',
      label: 'Selon besoin',
    },
    ...this.ingredientUnits.filter(
      (option): option is UnitOption<Exclude<IngredientInputUnit, 'TOP_UP'>> =>
        option.value !== 'TOP_UP',
    ),
  ];

  readonly form = this.formBuilder.group({
    name: this.formBuilder.nonNullable.control('', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(120),
    ]),

    type: this.formBuilder.nonNullable.control<CocktailType>('PERSONAL_CREATION', [
      Validators.required,
    ]),

    family: this.formBuilder.nonNullable.control('', [Validators.maxLength(80)]),

    method: this.formBuilder.nonNullable.control<RecipeMethod>('SHAKER', [Validators.required]),

    glass: this.formBuilder.nonNullable.control('', [
      Validators.required,
      Validators.maxLength(80),
    ]),

    ice: this.formBuilder.nonNullable.control('', [Validators.maxLength(80)]),

    mainAlcoholName: this.formBuilder.nonNullable.control(''),

    notes: this.formBuilder.nonNullable.control('', [Validators.maxLength(4000)]),

    ingredients: this.formBuilder.array<IngredientFormGroup>([this.createIngredientGroup()]),

    garnishes: this.formBuilder.array<GarnishFormGroup>([]),

    steps: this.formBuilder.array<StepFormControl>([this.createStepControl()]),
  });

  get ingredients() {
    return this.form.controls.ingredients;
  }

  get garnishes() {
    return this.form.controls.garnishes;
  }

  get steps() {
    return this.form.controls.steps;
  }

  addIngredient(): void {
    this.ingredients.push(this.createIngredientGroup());
  }

  removeIngredient(index: number): void {
    if (this.ingredients.length <= 1) {
      return;
    }

    this.ingredients.removeAt(index);
    this.syncMainAlcoholSelection();
  }

  onIngredientNameChanged(index: number, name: string): void {
    const group = this.ingredients.at(index);

    const selectedIngredient = this.selectedIngredients.get(group);

    if (selectedIngredient && selectedIngredient.name !== name.trim()) {
      this.selectedIngredients.delete(group);
    }

    this.syncMainAlcoholSelection();
  }

  onIngredientSelected(index: number, ingredient: IngredientSuggestion): void {
    const group = this.ingredients.at(index);

    this.selectedIngredients.set(group, ingredient);

    group.controls.ingredientName.setValue(ingredient.name);

    group.controls.ingredientDefaultAbv.setValue(ingredient.defaultAbv);

    this.syncMainAlcoholSelection();
  }

  onIngredientUnitChange(index: number): void {
    const ingredient = this.ingredients.at(index);

    if (ingredient.controls.unit.value === 'TOP_UP') {
      ingredient.controls.amount.setValue(null);
    }

    ingredient.updateValueAndValidity();
  }

  syncMainAlcoholSelection(): void {
    const currentSelection = this.form.controls.mainAlcoholName.value;

    if (!currentSelection) {
      return;
    }

    if (!this.alcoholicIngredientOptions().includes(currentSelection)) {
      this.form.controls.mainAlcoholName.setValue('');
    }
  }

  addGarnish(): void {
    this.garnishes.push(this.createGarnishGroup());
  }

  removeGarnish(index: number): void {
    this.garnishes.removeAt(index);
  }

  onGarnishUnitChange(index: number): void {
    const garnish = this.garnishes.at(index);

    if (garnish.controls.unit.value === '') {
      garnish.controls.amount.setValue(null);
    }

    garnish.updateValueAndValidity();
  }

  addStep(): void {
    this.steps.push(this.createStepControl());
  }

  removeStep(index: number): void {
    if (this.steps.length <= 1) {
      return;
    }

    this.steps.removeAt(index);
  }

  alcoholicIngredientOptions(): string[] {
    return [
      ...new Set(
        this.ingredients.controls
          .filter((ingredient) => {
            const abv = ingredient.controls.ingredientDefaultAbv.value;

            return typeof abv === 'number' && abv > 0;
          })
          .map((ingredient) => ingredient.controls.ingredientName.value.trim())
          .filter((name) => name.length > 0),
      ),
    ];
  }

  rowNumber(index: number): string {
    return (index + 1).toString().padStart(2, '0');
  }

  submit(): void {
    this.form.updateValueAndValidity();

    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const request = this.buildRequest();

    this.cocktailsService
      .createPersonalCocktail(request)
      .pipe(
        finalize(() => {
          this.isSubmitting.set(false);
        }),
      )
      .subscribe({
        next: (createdCocktail) => {
          void this.router.navigate(['/cocktails', createdCocktail.slug]);
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.resolveErrorMessage(error));
        },
      });
  }

  private createIngredientGroup(): IngredientFormGroup {
    return this.formBuilder.group(
      {
        ingredientName: this.formBuilder.nonNullable.control('', [
          Validators.required,
          Validators.maxLength(120),
        ]),

        ingredientDefaultAbv: this.formBuilder.control<number | null>(null, [
          Validators.min(0),
          Validators.max(100),
        ]),

        amount: this.formBuilder.control<number | null>(null, [Validators.min(0.001)]),

        unit: this.formBuilder.nonNullable.control<IngredientInputUnit>('CL'),

        specification: this.formBuilder.nonNullable.control('', [Validators.maxLength(160)]),

        notes: this.formBuilder.nonNullable.control('', [Validators.maxLength(500)]),
      },
      {
        validators: ingredientMeasurementValidator,
      },
    );
  }

  private createGarnishGroup(): GarnishFormGroup {
    return this.formBuilder.group(
      {
        ingredientName: this.formBuilder.nonNullable.control('', [
          Validators.required,
          Validators.maxLength(120),
        ]),

        amount: this.formBuilder.control<number | null>(null, [Validators.min(0.001)]),

        unit: this.formBuilder.nonNullable.control<GarnishInputUnit>(''),

        specification: this.formBuilder.nonNullable.control('', [Validators.maxLength(160)]),

        usage: this.formBuilder.nonNullable.control('', [
          Validators.required,
          Validators.maxLength(500),
        ]),
      },
      {
        validators: garnishMeasurementValidator,
      },
    );
  }

  private createStepControl(): StepFormControl {
    return this.formBuilder.nonNullable.control('', [
      Validators.required,
      Validators.maxLength(500),
    ]);
  }

  private buildRequest(): CreateCocktailRequest {
    const value = this.form.getRawValue();

    const requestedMainAlcohol = this.optionalText(value.mainAlcoholName);

    const validMainAlcohol =
      requestedMainAlcohol && this.alcoholicIngredientOptions().includes(requestedMainAlcohol)
        ? requestedMainAlcohol
        : undefined;

    return {
      name: value.name.trim(),

      type: value.type,

      family: this.optionalText(value.family),

      method: value.method,

      glass: value.glass.trim(),

      ice: this.optionalText(value.ice),

      mainAlcoholName: validMainAlcohol,

      notes: this.optionalText(value.notes),

      ingredients: value.ingredients.map((ingredient, index): CreateCocktailIngredientRequest => {
        const measurement = this.normalizeIngredientMeasurement(ingredient.amount, ingredient.unit);

        const group = this.ingredients.at(index);

        const selectedIngredient = this.selectedIngredients.get(group);

        const currentName = ingredient.ingredientName.trim();

        const currentAbv = ingredient.ingredientDefaultAbv;

        const stillUsesSelectedIngredient = selectedIngredient?.name === currentName;

        const abvOverride =
          stillUsesSelectedIngredient &&
          currentAbv !== null &&
          currentAbv !== selectedIngredient.defaultAbv
            ? currentAbv
            : undefined;

        const catalogueAbv = stillUsesSelectedIngredient
          ? selectedIngredient.defaultAbv
          : currentAbv;

        return {
          ingredientName: currentName,

          ingredientDefaultAbv: catalogueAbv,

          amount: measurement.amount,

          unit: measurement.unit,

          specification: this.optionalText(ingredient.specification),

          abvOverride,

          notes: this.optionalText(ingredient.notes),
        };
      }),

      garnishes: value.garnishes.map((garnish): CreateCocktailGarnishRequest => {
        const measurement = this.normalizeGarnishMeasurement(garnish.amount, garnish.unit);

        return {
          ingredientName: garnish.ingredientName.trim(),

          amount: measurement.amount,

          unit: measurement.unit,

          specification: this.optionalText(garnish.specification),

          usage: garnish.usage.trim(),
        };
      }),

      steps: value.steps.map((step) => step.trim()),
    };
  }

  private normalizeIngredientMeasurement(
    amount: number | null,
    unit: IngredientInputUnit,
  ): {
    amount: number | null;
    unit: MeasurementUnit;
  } {
    if (unit === 'TOP_UP') {
      return {
        amount: null,
        unit: 'TOP_UP',
      };
    }

    if (unit === 'CL') {
      return {
        amount: amount === null ? null : this.roundMillilitres(amount * 10),
        unit: 'ML',
      };
    }

    return {
      amount,
      unit,
    };
  }

  private normalizeGarnishMeasurement(
    amount: number | null,
    unit: GarnishInputUnit,
  ): {
    amount: number | null;
    unit: MeasurementUnit | null;
  } {
    if (unit === '') {
      return {
        amount: null,
        unit: null,
      };
    }

    if (unit === 'CL') {
      return {
        amount: amount === null ? null : this.roundMillilitres(amount * 10),
        unit: 'ML',
      };
    }

    return {
      amount,
      unit,
    };
  }

  private roundMillilitres(value: number): number {
    return Math.round(value * 1000) / 1000;
  }

  private optionalText(value: string): string | undefined {
    const trimmedValue = value.trim();

    return trimmedValue.length > 0 ? trimmedValue : undefined;
  }

  private resolveErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'Une erreur inattendue est survenue.';
    }

    if (error.status === 0) {
      return 'Impossible de joindre Barbook. Vérifie que le serveur est disponible.';
    }

    if (error.status === 400) {
      return 'Certaines informations de la recette ne sont pas valides.';
    }

    if (error.status === 401) {
      return 'Ta session n’est plus valide. Reconnecte-toi pour continuer.';
    }

    if (error.status === 409) {
      return 'Un cocktail portant ce nom existe déjà dans ton Barbook.';
    }

    return 'La création du cocktail a échoué. Réessaie dans quelques instants.';
  }
}
