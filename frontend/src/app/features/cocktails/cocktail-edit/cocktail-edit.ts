import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, HostListener, OnInit, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, finalize, takeUntil } from 'rxjs';
import { DraftLease, DraftStore } from '../../../core/drafts/draft-store.service';
import { FormDraft } from '../../../core/drafts/form-draft';
import { DraftNotice } from '../../../core/drafts/draft-notice';
import { IngredientAutocomplete } from '../../ingredients/ui/ingredient-autocomplete';
import { IngredientSuggestion } from '../../ingredients/data-access/ingredient.models';
import { toSlug } from '../../../shared/utils/slug';
import { CocktailContentSnapshot } from '../data-access/cocktail-content.models';
import { CocktailsService } from '../data-access/cocktails.service';
import {
  COCKTAIL_TYPE_OPTIONS,
  GARNISH_UNIT_OPTIONS,
  INGREDIENT_UNIT_OPTIONS,
  RECIPE_METHOD_OPTIONS,
} from '../cocktail-create/cocktail-create.options';
import {
  alcoholicEditIngredients,
  createEditForm,
  editContent,
  editGarnish,
  editIngredient,
  editStep,
  fillEditDraft,
  fillEditForm,
} from './cocktail-edit.form';
import { isEditDraft } from './cocktail-edit.draft';
import { CocktailContentPreview } from './cocktail-content-preview';

@Component({
  selector: 'app-cocktail-edit',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    IngredientAutocomplete,
    DraftNotice,
    CocktailContentPreview,
  ],
  templateUrl: './cocktail-edit.html',
  styleUrls: ['../cocktail-create/cocktail-create.css', './cocktail-edit.css'],
})
export class CocktailEdit implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(DraftStore);
  private readonly api = inject(CocktailsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly routeReset = new Subject<void>();
  private lease: DraftLease | null = null;
  private version = 0;
  private applying = false;
  private readonly catalog = new Map<string, number | null>();
  readonly form = createEditForm(this.fb);
  readonly loaded = signal<CocktailContentSnapshot | null>(null);
  readonly comparison = signal<CocktailContentSnapshot | null>(null);
  readonly draft = signal<FormDraft | null>(null);
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly comparing = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly types = COCKTAIL_TYPE_OPTIONS;
  readonly methods = RECIPE_METHOD_OPTIONS;
  readonly units = INGREDIENT_UNIT_OPTIONS;
  readonly garnishUnits = GARNISH_UNIT_OPTIONS;
  readonly abvModes = [
    { value: 'INHERIT', label: 'Hériter du catalogue' },
    { value: 'OVERRIDE', label: 'Remplacer pour cette recette' },
    { value: 'UNKNOWN', label: 'Degré explicitement inconnu' },
  ];

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      if (!this.applying) {
        this.draft()?.capture(this.draftValue());
        this.success.set(null);
      }
    });
  }
  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.routeReset.next();
      this.loaded.set(null);
      this.catalog.clear();
      this.comparison.set(null);
      this.draft.set(null);
      this.lease = this.store.lease();
      this.loadInitial(params.get('id') ?? '');
    });
  }
  private current(): boolean {
    return this.store.valid(this.lease);
  }
  private draftValue() {
    return { schema: 1 as const, form: this.form.getRawValue() };
  }
  private apply(snapshot: CocktailContentSnapshot): void {
    this.applying = true;
    snapshot.content.ingredients.forEach((i) =>
      this.catalog.set(toSlug(i.ingredientName), i.ingredientDefaultAbv),
    );
    fillEditForm(this.form, this.fb, snapshot.content);
    this.version = snapshot.contentVersion;
    this.loaded.set(snapshot);
    this.applying = false;
  }
  private loadInitial(id: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .getPersonalCocktailContent(id)
      .pipe(
        takeUntil(this.routeReset),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (snapshot) => {
          if (!this.current() || snapshot.id.toLowerCase() !== id.toLowerCase()) return;
          this.apply(snapshot);
          this.draft.set(
            new FormDraft(this.store, `edit:${snapshot.id}`, snapshot.contentVersion, (value) =>
              isEditDraft(value),
            ),
          );
        },
        error: (error) => {
          if (this.current()) this.error.set(this.message(error));
        },
      });
  }
  retryLoad(): void {
    if (!this.loaded()) this.loadInitial(this.route.snapshot.paramMap.get('id') ?? '');
  }
  restoreDraft(): void {
    const draft = this.draft();
    const version = draft?.candidate()?.version;
    if (!this.current() || !draft || version === undefined) return;
    const value = draft.restore();
    if (!isEditDraft(value)) return;
    this.applying = true;
    fillEditDraft(this.form, this.fb, value.form);
    this.version = version;
    this.applying = false;
  }
  discardDraft(): void {
    const loaded = this.loaded();
    const draft = this.draft();
    if (!this.current() || !loaded || !draft || this.submitting()) return;
    if (!window.confirm('Abandonner ce brouillon et sa saisie ?')) return;
    // A conflicted/uncertain command must first be inspected against a real fresh GET.
    if (draft.conflict() || draft.uncertain()) {
      this.compareServer();
      return;
    }
    draft.succeeded(loaded.contentVersion);
    this.apply(loaded);
    this.error.set(null);
  }
  compareServer(): void {
    const loaded = this.loaded();
    if (!this.current() || !loaded || this.submitting() || this.comparing()) return;
    this.comparing.set(true);
    this.comparison.set(null);
    this.api
      .getPersonalCocktailContent(loaded.id)
      .pipe(
        takeUntil(this.routeReset),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.comparing.set(false)),
      )
      .subscribe({
        next: (snapshot) => {
          if (this.current() && snapshot.id === loaded.id) this.comparison.set(snapshot);
        },
        error: (error) => {
          if (this.current()) this.error.set(this.message(error));
        },
      });
  }
  useServer(): void {
    const fresh = this.comparison();
    if (
      !this.current() ||
      !fresh ||
      this.submitting() ||
      !window.confirm(
        'Abandonner toute la saisie affichée et repartir de la version serveur vérifiée ?',
      )
    )
      return;
    this.draft()?.succeeded(fresh.contentVersion);
    this.apply(fresh);
    this.comparison.set(null);
    this.error.set(null);
    this.success.set(
      'Version serveur chargée. Tu peux maintenant saisir une nouvelle modification.',
    );
  }
  blocked(): boolean {
    const draft = this.draft();
    return (
      !this.current() ||
      !draft ||
      this.loading() ||
      this.submitting() ||
      !!draft.candidate() ||
      draft.conflict() ||
      draft.uncertain()
    );
  }
  submit(): void {
    const loaded = this.loaded();
    const draft = this.draft();
    if (!loaded || !draft || this.blocked()) return;
    this.form.updateValueAndValidity();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set(
        'Vérifie les champs indiqués : informations requises, mesures, doublons et alcool principal.',
      );
      document
        .querySelector<HTMLElement>(
          this.form.hasError('mainAlcohol')
            ? '.cocktail-form select[formControlName="mainAlcoholName"]'
            : '.cocktail-form input.ng-invalid, .cocktail-form textarea.ng-invalid, .cocktail-form select.ng-invalid, .cocktail-form app-ingredient-autocomplete.ng-invalid input',
        )
        ?.focus();
      return;
    }
    if (!draft.begin(this.draftValue())) return;
    this.submitting.set(true);
    this.error.set(null);
    this.success.set(null);
    this.api
      .replacePersonalCocktailContent(loaded.id, {
        ...editContent(this.form.getRawValue()),
        expectedContentVersion: this.version,
      })
      .pipe(
        takeUntil(this.routeReset),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: (saved) => {
          if (!this.current() || saved.id !== loaded.id) return;
          draft.succeeded(saved.contentVersion);
          this.apply(saved);
          this.comparison.set(null);
          this.success.set(
            saved.contentVersion === loaded.contentVersion
              ? 'Aucune modification : la recette est inchangée.'
              : 'Recette enregistrée.',
          );
        },
        error: (error) => {
          if (!this.current()) return;
          draft.rejected(error);
          if (error instanceof HttpErrorResponse && error.status === 409) draft.conflict.set(true);
          this.error.set(this.message(error));
        },
      });
  }
  cancel(): void {
    if (!this.submitting())
      void this.router.navigate(
        this.loaded() ? ['/cocktails', this.loaded()!.slug] : ['/cocktails'],
      );
  }
  canLeave(): boolean {
    return this.draft()?.canLeave() ?? true;
  }
  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    this.draft()?.beforeUnload(event);
  }
  ingredientSelected(index: number, value: IngredientSuggestion): void {
    this.catalog.set(value.slug, value.defaultAbv);
    const line = this.form.controls.ingredients.at(index);
    line.patchValue({ ingredientName: value.name, ingredientDefaultAbv: value.defaultAbv });
  }
  ingredientRenamed(index: number, name: string): void {
    this.form.controls.ingredients
      .at(index)
      .controls.ingredientDefaultAbv.setValue(this.catalog.get(toSlug(name)) ?? null);
  }
  knownIngredient(name: string): boolean {
    return this.catalog.has(toSlug(name));
  }
  modeChanged(index: number): void {
    const line = this.form.controls.ingredients.at(index);
    if (line.controls.abvMode.value !== 'OVERRIDE') line.controls.abvOverride.setValue(null);
    line.updateValueAndValidity();
  }
  unitChanged(index: number): void {
    const line = this.form.controls.ingredients.at(index);
    if (line.controls.unit.value === 'TOP_UP') line.controls.amount.setValue(null);
  }
  garnishUnitChanged(index: number): void {
    const line = this.form.controls.garnishes.at(index);
    if (!line.controls.unit.value) line.controls.amount.setValue(null);
  }
  alcoholOptions(): string[] {
    return alcoholicEditIngredients(this.form.getRawValue().ingredients);
  }
  addIngredient(): void {
    if (this.form.controls.ingredients.length < 50)
      this.form.controls.ingredients.push(editIngredient(this.fb));
  }
  addGarnish(): void {
    if (this.form.controls.garnishes.length < 20)
      this.form.controls.garnishes.push(editGarnish(this.fb));
  }
  addStep(): void {
    if (this.form.controls.steps.length < 30) this.form.controls.steps.push(editStep(this.fb));
  }
  remove(kind: 'ingredients' | 'garnishes' | 'steps', index: number): void {
    const rows = this.form.controls[kind];
    if (rows.length > (kind === 'garnishes' ? 0 : 1)) rows.removeAt(index);
  }
  move(kind: 'ingredients' | 'garnishes' | 'steps', index: number, delta: number): void {
    const rows: FormArray = this.form.controls[kind];
    if (index + delta < 0 || index + delta >= rows.length) return;
    const row = rows.at(index);
    rows.removeAt(index, { emitEvent: false });
    rows.insert(index + delta, row);
    // Controls retain their identity; focus remains on the moving row's button.
  }
  private message(error: unknown): string {
    if (!(error instanceof HttpErrorResponse))
      return 'Réponse abandonnée ou indisponible. Vérifie ta session avant de poursuivre.';
    if (error.status === 409)
      return 'La recette ou le catalogue a changé. Ta saisie est conservée ; compare la version serveur avant toute nouvelle intention.';
    if (error.status === 404)
      return 'Cette recette n’est plus disponible dans ton carnet personnel.';
    if (error.status === 401 || error.status === 403)
      return 'La session ou son autorisation n’est plus valide. Reconnecte-toi avant de poursuivre.';
    if (error.status === 400)
      return 'Certaines informations sont invalides. Vérifie les mesures, les degrés et l’alcool principal.';
    return 'Résultat indisponible. Ta saisie est conservée ; vérifie le serveur avant toute nouvelle action.';
  }
}
