import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, map, of, Subject, switchMap } from 'rxjs';
import {
  CocktailListQuery,
  CocktailListResult,
  CocktailSummary,
  CocktailType,
  RecipeMethod,
} from './data-access/cocktail.models';
import { CocktailsService } from './data-access/cocktails.service';

const DEFAULT_PAGE_SIZE = 24;
const SEARCH_DEBOUNCE_MS = 300;

interface CocktailLoadState {
  result: CocktailListResult | null;
  error: unknown | null;
}

@Component({
  selector: 'app-cocktails',
  imports: [RouterLink],
  templateUrl: './cocktails.html',
  styleUrl: './cocktails.css',
})
export class Cocktails implements OnInit {
  private readonly cocktailsService = inject(CocktailsService);

  private readonly destroyRef = inject(DestroyRef);

  private readonly searchChanges = new Subject<string>();

  private readonly loadRequests = new Subject<CocktailListQuery>();

  readonly cocktails = signal<CocktailSummary[]>([]);

  readonly isLoading = signal(true);

  readonly errorMessage = signal<string | null>(null);

  readonly searchTerm = signal('');

  readonly selectedType = signal<CocktailType | ''>('');

  readonly selectedMethod = signal<RecipeMethod | ''>('');

  readonly currentPage = signal(1);

  readonly pageSize = signal(DEFAULT_PAGE_SIZE);

  readonly total = signal(0);

  readonly totalPages = signal(0);

  readonly hasCocktailLibrary = signal(false);

  private readonly appliedSearchTerm = signal('');

  readonly loadingPlaceholders = [0, 1, 2];

  readonly typeOptions: readonly {
    value: CocktailType;
    label: string;
  }[] = [
    {
      value: 'CLASSIC',
      label: 'Classique',
    },
    {
      value: 'PERSONAL_CREATION',
      label: 'Création',
    },
    {
      value: 'VARIATION',
      label: 'Variation',
    },
  ];

  readonly methodOptions: readonly {
    value: RecipeMethod;
    label: string;
  }[] = [
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

  readonly hasActiveFilters = computed(
    () =>
      this.appliedSearchTerm().length > 0 ||
      this.selectedType() !== '' ||
      this.selectedMethod() !== '',
  );

  readonly showLibraryTools = computed(() => this.hasCocktailLibrary() || this.hasActiveFilters());

  readonly canGoPrevious = computed(() => this.currentPage() > 1);

  readonly canGoNext = computed(
    () => this.totalPages() > 0 && this.currentPage() < this.totalPages(),
  );

  ngOnInit(): void {
    this.observeLoadRequests();
    this.observeSearchChanges();

    this.loadCocktails();
  }

  loadCocktails(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.loadRequests.next(this.buildListQuery());
  }

  onSearchInput(value: string): void {
    this.searchTerm.set(value);
    this.searchChanges.next(value);
  }

  onTypeChange(value: string): void {
    const type = this.typeOptions.find((option) => option.value === value)?.value ?? '';

    if (type === this.selectedType()) {
      return;
    }

    this.selectedType.set(type);
    this.currentPage.set(1);

    this.loadCocktails();
  }

  onMethodChange(value: string): void {
    const method = this.methodOptions.find((option) => option.value === value)?.value ?? '';

    if (method === this.selectedMethod()) {
      return;
    }

    this.selectedMethod.set(method);
    this.currentPage.set(1);

    this.loadCocktails();
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.appliedSearchTerm.set('');
    this.selectedType.set('');
    this.selectedMethod.set('');
    this.currentPage.set(1);

    this.searchChanges.next('');

    this.loadCocktails();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.currentPage()) {
      return;
    }

    this.currentPage.set(page);

    this.loadCocktails();
  }

  typeLabel(type: CocktailType): string {
    return this.typeOptions.find((option) => option.value === type)?.label ?? type;
  }

  methodLabel(method: RecipeMethod): string {
    return this.methodOptions.find((option) => option.value === method)?.label ?? method;
  }

  cocktailCountLabel(): string {
    const count = this.total();

    return `${count} cocktail${count > 1 ? 's' : ''}`;
  }

  private observeSearchChanges(): void {
    this.searchChanges
      .pipe(
        map((value) => value.trim()),
        debounceTime(SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((normalizedSearch) => {
        if (normalizedSearch === this.appliedSearchTerm()) {
          return;
        }

        this.appliedSearchTerm.set(normalizedSearch);

        this.currentPage.set(1);

        this.loadCocktails();
      });
  }

  private observeLoadRequests(): void {
    this.loadRequests
      .pipe(
        switchMap((query) =>
          this.cocktailsService.getPersonalCocktails(query).pipe(
            map((result): CocktailLoadState => ({
              result,
              error: null,
            })),
            catchError((error: unknown) =>
              of<CocktailLoadState>({
                result: null,
                error,
              }),
            ),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((state) => {
        this.isLoading.set(false);

        if (state.error !== null) {
          this.errorMessage.set(this.resolveErrorMessage(state.error));

          return;
        }

        if (!state.result) {
          return;
        }

        this.applyListResult(state.result);
      });
  }

  private buildListQuery(): CocktailListQuery {
    return {
      search: this.appliedSearchTerm() || undefined,
      type: this.selectedType() || undefined,
      method: this.selectedMethod() || undefined,
      page: this.currentPage(),
      pageSize: this.pageSize(),
    };
  }

  private applyListResult(result: CocktailListResult): void {
    this.cocktails.set(result.items);
    this.currentPage.set(result.page);
    this.pageSize.set(result.pageSize);
    this.total.set(result.total);
    this.totalPages.set(result.totalPages);

    if (result.total > 0) {
      this.hasCocktailLibrary.set(true);
    }
  }

  private resolveErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'Une erreur inattendue est survenue.';
    }

    if (error.status === 0) {
      return 'Impossible de joindre Barbook. Vérifie que le serveur est disponible.';
    }

    if (error.status === 401) {
      return 'Ta session n’est plus valide. Reconnecte-toi pour continuer.';
    }

    return 'Impossible de charger tes cocktails pour le moment.';
  }
}
