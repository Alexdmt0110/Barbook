import {
  Component,
  computed,
  DestroyRef,
  forwardRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { catchError, of, Subject, switchMap, timer } from 'rxjs';
import { UiAutocomplete, UiAutocompleteOption } from '../../../shared/ui/autocomplete/autocomplete';
import { IngredientSuggestion } from '../data-access/ingredient.models';
import { IngredientsService } from '../data-access/ingredients.service';

@Component({
  selector: 'app-ingredient-autocomplete',
  imports: [UiAutocomplete],
  templateUrl: './ingredient-autocomplete.html',
  styleUrl: './ingredient-autocomplete.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => IngredientAutocomplete),
      multi: true,
    },
  ],
})
export class IngredientAutocomplete implements ControlValueAccessor {
  private readonly ingredientsService = inject(IngredientsService);

  private readonly destroyRef = inject(DestroyRef);

  private readonly searchTerms = new Subject<string>();

  private readonly numberFormat = new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 2,
  });

  private onChange: (value: string) => void = () => undefined;

  private onTouched: () => void = () => undefined;

  readonly placeholder = input('Commence à écrire un ingrédient…');

  readonly inputId = input<string | null>(null);

  readonly ariaLabel = input<string | null>('Ingrédient');

  readonly ariaLabelledBy = input<string | null>(null);

  readonly ingredientSelected = output<IngredientSuggestion>();

  readonly ingredientNameChanged = output<string>();

  readonly value = signal('');

  readonly disabled = signal(false);

  readonly isLoading = signal(false);

  readonly suggestions = signal<IngredientSuggestion[]>([]);

  readonly options = computed<UiAutocompleteOption[]>(() =>
    this.suggestions().map((ingredient) => ({
      id: ingredient.id,
      label: ingredient.name,
      description: this.abvDescription(ingredient.defaultAbv),
    })),
  );

  constructor() {
    this.searchTerms
      .pipe(
        switchMap((query) => {
          if (query.length < 3) {
            this.isLoading.set(false);

            return of<IngredientSuggestion[]>([]);
          }

          this.isLoading.set(true);

          return timer(250).pipe(
            switchMap(() =>
              this.ingredientsService
                .searchPersonalIngredients(query)
                .pipe(catchError(() => of<IngredientSuggestion[]>([]))),
            ),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((suggestions) => {
        this.isLoading.set(false);

        this.suggestions.set(suggestions);
      });
  }

  writeValue(value: unknown): void {
    this.value.set(typeof value === 'string' ? value : '');
  }

  registerOnChange(onChange: (value: string) => void): void {
    this.onChange = onChange;
  }

  registerOnTouched(onTouched: () => void): void {
    this.onTouched = onTouched;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  handleValueChange(value: string): void {
    this.value.set(value);

    this.onChange(value);

    this.ingredientNameChanged.emit(value);
  }

  handleQueryChange(query: string): void {
    const normalizedQuery = query.trim();

    if (normalizedQuery.length < 3) {
      this.suggestions.set([]);
    }

    this.searchTerms.next(normalizedQuery);
  }

  handleOptionSelected(option: UiAutocompleteOption): void {
    const ingredient = this.suggestions().find((candidate) => candidate.id === option.id);

    if (!ingredient) {
      return;
    }

    this.suggestions.set([]);

    this.ingredientSelected.emit(ingredient);
  }

  handleBlur(): void {
    this.onTouched();
  }

  private abvDescription(abv: number | null): string {
    if (abv === null) {
      return 'Degré inconnu';
    }

    if (abv === 0) {
      return 'Sans alcool';
    }

    return `${this.numberFormat.format(abv)} % vol.`;
  }
}
