import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { IngredientSuggestion } from '../../ingredients/data-access/ingredient.models';
import { IngredientAutocomplete } from '../../ingredients/ui/ingredient-autocomplete';
import { CocktailType, RecipeMethod } from '../data-access/cocktail.models';
import { CocktailsService } from '../data-access/cocktails.service';
import {
  GarnishFormGroup,
  GarnishInputUnit,
  garnishMeasurementValidator,
  IngredientFormGroup,
  IngredientInputUnit,
  ingredientMeasurementValidator,
  MAX_GARNISHES,
  MAX_PREPARATION_STEPS,
  MAX_RECIPE_INGREDIENTS,
  MAX_STORED_AMOUNT,
  StepFormControl,
  trimmedRequiredValidator,
} from './cocktail-create.form';
import {
  buildCreateCocktailRequest,
  getAlcoholicIngredientOptions,
  hasAlcoholicIngredient,
} from './cocktail-create.mapper';
import {
  COCKTAIL_TYPE_OPTIONS,
  GARNISH_UNIT_OPTIONS,
  INGREDIENT_UNIT_OPTIONS,
  RECIPE_METHOD_OPTIONS,
} from './cocktail-create.options';
import { toSlug } from '../../../shared/utils/slug';

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

  readonly maxRecipeIngredients = MAX_RECIPE_INGREDIENTS;

  readonly maxGarnishes = MAX_GARNISHES;

  readonly maxPreparationSteps = MAX_PREPARATION_STEPS;

  readonly cocktailTypes = COCKTAIL_TYPE_OPTIONS;

  readonly recipeMethods = RECIPE_METHOD_OPTIONS;

  readonly ingredientUnits = INGREDIENT_UNIT_OPTIONS;

  readonly garnishUnits = GARNISH_UNIT_OPTIONS;

  readonly form = this.formBuilder.group({
    name: this.formBuilder.nonNullable.control('', [
      trimmedRequiredValidator(2),
      Validators.maxLength(120),
    ]),

    type: this.formBuilder.nonNullable.control<CocktailType>('PERSONAL_CREATION', [
      Validators.required,
    ]),

    family: this.formBuilder.nonNullable.control('', [Validators.maxLength(80)]),

    method: this.formBuilder.nonNullable.control<RecipeMethod>('SHAKER', [Validators.required]),

    glass: this.formBuilder.nonNullable.control('', [
      trimmedRequiredValidator(),
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
    if (this.ingredients.length >= MAX_RECIPE_INGREDIENTS) {
      return;
    }

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

    if (selectedIngredient && toSlug(name) !== selectedIngredient.slug) {
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

    if (!hasAlcoholicIngredient(this.ingredients.getRawValue(), currentSelection)) {
      this.form.controls.mainAlcoholName.setValue('');
    }
  }

  addGarnish(): void {
    if (this.garnishes.length >= MAX_GARNISHES) {
      return;
    }

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
    if (this.steps.length >= MAX_PREPARATION_STEPS) {
      return;
    }

    this.steps.push(this.createStepControl());
  }

  removeStep(index: number): void {
    if (this.steps.length <= 1) {
      return;
    }

    this.steps.removeAt(index);
  }

  alcoholicIngredientOptions(): string[] {
    return getAlcoholicIngredientOptions(this.ingredients.getRawValue());
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

    const selectedIngredients = this.ingredients.controls.map((group) =>
      this.selectedIngredients.get(group),
    );

    const request = buildCreateCocktailRequest(this.form.getRawValue(), selectedIngredients);

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
          trimmedRequiredValidator(),
          Validators.maxLength(120),
        ]),

        ingredientDefaultAbv: this.formBuilder.control<number | null>(null, [
          Validators.min(0),
          Validators.max(100),
        ]),

        amount: this.formBuilder.control<number | null>(null, [
          Validators.min(0.001),
          Validators.max(MAX_STORED_AMOUNT),
        ]),

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
          trimmedRequiredValidator(),
          Validators.maxLength(120),
        ]),

        amount: this.formBuilder.control<number | null>(null, [
          Validators.min(0.001),
          Validators.max(MAX_STORED_AMOUNT),
        ]),

        unit: this.formBuilder.nonNullable.control<GarnishInputUnit>(''),

        specification: this.formBuilder.nonNullable.control('', [Validators.maxLength(160)]),

        usage: this.formBuilder.nonNullable.control('', [
          trimmedRequiredValidator(),
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
      trimmedRequiredValidator(),
      Validators.maxLength(500),
    ]);
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
