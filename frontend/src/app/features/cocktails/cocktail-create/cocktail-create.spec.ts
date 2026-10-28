import { provideHttpClient } from '@angular/common/http';
import { BrowserStorageService } from '../../../core/storage/browser-storage.service';
import { DraftStore } from '../../../core/drafts/draft-store.service';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { IngredientSuggestion } from '../../ingredients/data-access/ingredient.models';
import { IngredientsService } from '../../ingredients/data-access/ingredients.service';
import { CreateCocktailRequest } from '../data-access/cocktail.models';
import { CocktailsService } from '../data-access/cocktails.service';
import { CocktailCreate } from './cocktail-create';

class CocktailsServiceStub {
  readonly requests: CreateCocktailRequest[] = [];

  response: Observable<{
    id: string;
    slug: string;
  }> = of({
    id: 'cocktail-new',
    slug: 'tom-collins',
  });

  createPersonalCocktail(request: CreateCocktailRequest): Observable<{
    id: string;
    slug: string;
  }> {
    this.requests.push(request);

    return this.response;
  }
}

class IngredientsServiceStub {
  searchPersonalIngredients() {
    return of([]);
  }
}

describe('CocktailCreate', () => {
  let cocktailsService: CocktailsServiceStub;

  let router: Router;

  let navigateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [CocktailCreate],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        {
          provide: CocktailsService,
          useClass: CocktailsServiceStub,
        },
        {
          provide: IngredientsService,
          useClass: IngredientsServiceStub,
        },
      ],
    }).compileComponents();

    cocktailsService = TestBed.inject(CocktailsService) as unknown as CocktailsServiceStub;

    router = TestBed.inject(Router);

    navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    navigateSpy.mockRestore();
  });

  function createComponent(): CocktailCreate {
    TestBed.inject(DraftStore).confirmIdentity({
      userId: 'test-user',
      workspaceId: 'test-workspace',
    });
    const fixture = TestBed.createComponent(CocktailCreate);

    return fixture.componentInstance;
  }

  function fillRequiredFields(component: CocktailCreate): void {
    component.form.controls.name.setValue('Tom Collins');

    component.form.controls.glass.setValue('Highball');

    component.steps.at(0).setValue('Shaker puis filtrer.');
  }

  it('converts centilitres to millilitres and persists TOP_UP without an amount', () => {
    const component = createComponent();

    fillRequiredFields(component);

    const gin = component.ingredients.at(0);

    gin.controls.ingredientName.setValue('Gin');

    gin.controls.ingredientDefaultAbv.setValue(40);

    gin.controls.amount.setValue(5);

    gin.controls.unit.setValue('CL');

    component.addIngredient();

    const tonic = component.ingredients.at(1);

    tonic.controls.ingredientName.setValue('Tonic');

    tonic.controls.ingredientDefaultAbv.setValue(0);

    tonic.controls.unit.setValue('TOP_UP');

    component.onIngredientUnitChange(1);

    component.form.controls.mainAlcoholName.setValue('Gin');

    component.submit();

    expect(cocktailsService.requests).toHaveLength(1);

    const request = cocktailsService.requests[0];

    expect(request?.ingredients[0]).toMatchObject({
      ingredientName: 'Gin',
      ingredientDefaultAbv: 40,
      amount: 50,
      unit: 'ML',
    });

    expect(request?.ingredients[1]).toMatchObject({
      ingredientName: 'Tonic',
      ingredientDefaultAbv: 0,
      amount: null,
      unit: 'TOP_UP',
    });

    expect(request?.mainAlcoholName).toBe('Gin');
  });

  it('uses an ABV override when an existing catalogue ingredient is changed for the recipe', () => {
    const component = createComponent();

    fillRequiredFields(component);

    const gin: IngredientSuggestion = {
      id: 'gin',
      name: 'Gin',
      slug: 'gin',
      defaultAbv: 40,
    };

    component.onIngredientSelected(0, gin);

    const ingredient = component.ingredients.at(0);

    ingredient.controls.amount.setValue(5);

    ingredient.controls.ingredientDefaultAbv.setValue(47);

    component.submit();

    expect(cocktailsService.requests).toHaveLength(1);

    expect(cocktailsService.requests[0]?.ingredients[0]).toMatchObject({
      ingredientName: 'Gin',
      ingredientDefaultAbv: 40,
      abvOverride: 47,
      amount: 50,
      unit: 'ML',
    });
  });

  it('keeps the catalogue identity and ABV override when only the canonical ingredient spelling changes', () => {
    const component = createComponent();

    fillRequiredFields(component);

    const gin: IngredientSuggestion = {
      id: 'gin',
      name: 'Gin',
      slug: 'gin',
      defaultAbv: 40,
    };

    component.onIngredientSelected(0, gin);

    const ingredient = component.ingredients.at(0);

    ingredient.controls.amount.setValue(5);

    component.form.controls.mainAlcoholName.setValue('Gin');

    ingredient.controls.ingredientName.setValue('GIN');

    component.onIngredientNameChanged(0, 'GIN');

    ingredient.controls.ingredientDefaultAbv.setValue(47);

    component.submit();

    expect(cocktailsService.requests).toHaveLength(1);

    expect(cocktailsService.requests[0]?.ingredients[0]).toMatchObject({
      ingredientName: 'GIN',
      ingredientDefaultAbv: 40,
      abvOverride: 47,
      amount: 50,
      unit: 'ML',
    });

    expect(cocktailsService.requests[0]?.mainAlcoholName).toBe('Gin');
  });

  it('drops the catalogue identity when the ingredient actually changes', () => {
    const component = createComponent();

    fillRequiredFields(component);

    const gin: IngredientSuggestion = {
      id: 'gin',
      name: 'Gin',
      slug: 'gin',
      defaultAbv: 40,
    };

    component.onIngredientSelected(0, gin);

    const ingredient = component.ingredients.at(0);

    ingredient.controls.ingredientName.setValue('Vodka');

    component.onIngredientNameChanged(0, 'Vodka');

    ingredient.controls.ingredientDefaultAbv.setValue(37.5);

    ingredient.controls.amount.setValue(5);

    component.submit();

    expect(cocktailsService.requests[0]?.ingredients[0]).toMatchObject({
      ingredientName: 'Vodka',
      ingredientDefaultAbv: 37.5,
      amount: 50,
      unit: 'ML',
    });

    expect(cocktailsService.requests[0]?.ingredients[0]?.abvOverride).toBeUndefined();
  });

  it('uses the entered ABV as the catalogue value for a new ingredient', () => {
    const component = createComponent();

    fillRequiredFields(component);

    const ingredient = component.ingredients.at(0);

    ingredient.controls.ingredientName.setValue('Liqueur maison');

    ingredient.controls.ingredientDefaultAbv.setValue(18);

    ingredient.controls.amount.setValue(2);

    ingredient.controls.unit.setValue('CL');

    component.submit();

    expect(cocktailsService.requests[0]?.ingredients[0]).toMatchObject({
      ingredientName: 'Liqueur maison',
      ingredientDefaultAbv: 18,
      amount: 20,
      unit: 'ML',
    });

    expect(cocktailsService.requests[0]?.ingredients[0]?.abvOverride).toBeUndefined();
  });

  it('clears an invalid main alcohol when the ingredient stops being alcoholic', () => {
    const component = createComponent();

    const ingredient = component.ingredients.at(0);

    ingredient.controls.ingredientName.setValue('Gin');

    ingredient.controls.ingredientDefaultAbv.setValue(40);

    component.form.controls.mainAlcoholName.setValue('Gin');

    ingredient.controls.ingredientDefaultAbv.setValue(0);

    component.syncMainAlcoholSelection();

    expect(component.form.controls.mainAlcoholName.value).toBe('');
  });

  it('does not submit whitespace-only required fields', () => {
    const component = createComponent();

    component.form.controls.name.setValue('   ');

    component.form.controls.glass.setValue('   ');

    const ingredient = component.ingredients.at(0);

    ingredient.controls.ingredientName.setValue('   ');

    ingredient.controls.amount.setValue(5);

    component.steps.at(0).setValue('   ');

    component.submit();

    expect(cocktailsService.requests).toHaveLength(0);
  });

  it('does not submit duplicate canonical recipe ingredients', () => {
    const component = createComponent();

    fillRequiredFields(component);

    const firstIngredient = component.ingredients.at(0);

    firstIngredient.controls.ingredientName.setValue('Gin');

    firstIngredient.controls.ingredientDefaultAbv.setValue(40);

    firstIngredient.controls.amount.setValue(3);

    component.addIngredient();

    const secondIngredient = component.ingredients.at(1);

    secondIngredient.controls.ingredientName.setValue(' GIN ');

    secondIngredient.controls.ingredientDefaultAbv.setValue(40);

    secondIngredient.controls.amount.setValue(2);

    component.submit();

    expect(cocktailsService.requests).toHaveLength(0);

    expect(component.ingredients.hasError('duplicateCanonicalIngredient')).toBe(true);
  });

  it('does not add more recipe rows than the API accepts', () => {
    const component = createComponent();

    while (component.ingredients.length < component.maxRecipeIngredients) {
      component.addIngredient();
    }

    component.addIngredient();

    expect(component.ingredients.length).toBe(component.maxRecipeIngredients);

    while (component.garnishes.length < component.maxGarnishes) {
      component.addGarnish();
    }

    component.addGarnish();

    expect(component.garnishes.length).toBe(component.maxGarnishes);

    while (component.steps.length < component.maxPreparationSteps) {
      component.addStep();
    }

    component.addStep();

    expect(component.steps.length).toBe(component.maxPreparationSteps);
  });

  it.each(['tom-collins', 'new-cocktail'])('navigates to the returned detail slug %s', (slug) => {
    cocktailsService.response = of({ id: 'cocktail-created', slug });

    const component = createComponent();

    fillRequiredFields(component);

    const ingredient = component.ingredients.at(0);

    ingredient.controls.ingredientName.setValue('Gin');

    ingredient.controls.ingredientDefaultAbv.setValue(40);

    ingredient.controls.amount.setValue(5);

    component.submit();

    expect(navigateSpy).toHaveBeenCalledWith(['/cocktails', slug]);
  });

  it('shows a useful conflict message for an existing cocktail name', () => {
    cocktailsService.response = throwError(
      () =>
        new HttpErrorResponse({
          status: 409,
          statusText: 'Conflict',
        }),
    );

    const component = createComponent();

    fillRequiredFields(component);

    const ingredient = component.ingredients.at(0);

    ingredient.controls.ingredientName.setValue('Gin');

    ingredient.controls.ingredientDefaultAbv.setValue(40);

    ingredient.controls.amount.setValue(5);

    component.submit();

    expect(component.errorMessage()).toBe(
      'Un cocktail portant ce nom existe déjà dans ton Barbook.',
    );

    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('does not submit an invalid form', () => {
    const component = createComponent();

    component.submit();

    expect(cocktailsService.requests).toEqual([]);

    expect(navigateSpy).not.toHaveBeenCalled();
  });
  it('restores invalid raw fields and ingredient metadata only after explicit choice, without sending', () => {
    const first = createComponent();
    first.form.controls.name.setValue('unfinished');
    first.onIngredientSelected(0, { id: 'gin', slug: 'gin', name: 'Gin', defaultAbv: 40 });
    first.ingredients.at(0).controls.amount.setValue(-5);
    first.ingredients.at(0).controls.unit.setValue('CL');
    first.form.controls.notes.setValue('notes privées');
    const restored = createComponent();
    expect(restored.draft.candidate()).not.toBeNull();
    expect(restored.form.controls.name.value).toBe('');
    restored.submit();
    expect(cocktailsService.requests).toHaveLength(0);
    restored.restoreDraft();
    expect(restored.ingredients.at(0).getRawValue()).toMatchObject({
      ingredientName: 'Gin',
      amount: -5,
      unit: 'CL',
      ingredientDefaultAbv: 40,
    });
    expect(restored.form.controls.notes.value).toBe('notes privées');
    expect(restored.form.invalid).toBe(true);
    expect(cocktailsService.requests).toHaveLength(0);
  });
  it('restores selected ingredient ABV semantics and clears the draft after successful explicit submission', () => {
    const first = createComponent();
    fillRequiredFields(first);
    first.onIngredientSelected(0, { id: 'gin', slug: 'gin', name: 'Gin', defaultAbv: 40 });
    first.ingredients.at(0).controls.ingredientDefaultAbv.setValue(42);
    first.ingredients.at(0).controls.amount.setValue(5);
    const restored = createComponent();
    restored.restoreDraft();
    restored.submit();
    expect(cocktailsService.requests[0].ingredients[0]).toMatchObject({ abvOverride: 42 });
    expect(restored.draft.dirty()).toBe(false);
    expect(createComponent().draft.candidate()).toBeNull();
  });
  it('keeps an unknown outcome across reload and never retries until explicit verification', () => {
    const first = createComponent();
    fillRequiredFields(first);
    first.ingredients.at(0).controls.ingredientName.setValue('Gin');
    first.ingredients.at(0).controls.amount.setValue(5);
    cocktailsService.response = throwError(() => new HttpErrorResponse({ status: 0 }));
    first.submit();
    expect(first.draft.uncertain()).toBe(true);
    first.submit();
    expect(cocktailsService.requests).toHaveLength(1);
    const restored = createComponent();
    restored.restoreDraft();
    restored.submit();
    expect(cocktailsService.requests).toHaveLength(1);
    restored.draft.verifiedAbsent();
    restored.submit();
    expect(cocktailsService.requests).toHaveLength(2);
  });
  it('abandons both persisted and visible values without a POST and cannot submit after context changes', () => {
    const component = createComponent();
    fillRequiredFields(component);
    component.discardDraft();
    expect(component.form.controls.name.value).toBe('');
    expect(component.draft.dirty()).toBe(false);
    fillRequiredFields(component);
    TestBed.inject(DraftStore).confirmIdentity({ userId: 'other', workspaceId: 'other' });
    component.submit();
    expect(cocktailsService.requests).toHaveLength(0);
  });
  it('rejects extra form controls and incompatible form versions before applying untrusted storage', () => {
    const first = createComponent();
    first.form.controls.name.setValue('private');
    const store = TestBed.inject(DraftStore);
    const candidate = store.find(store.lease(), 'create:new')!;
    const value = candidate.value as { form: Record<string, unknown> };
    value.form['unknownControl'] = 'hostile';
    store.save(store.lease(), 'create:new', 1, value);
    const restored = createComponent();
    expect(restored.draft.invalid()).toBe(true);
    expect(() => restored.restoreDraft()).not.toThrow();
    delete value.form['unknownControl'];
    store.save(store.lease(), 'create:new', 0, value);
    expect(createComponent().draft.invalid()).toBe(true);
  });
  it('keeps the explicit abandon action available when persistence is refused', () => {
    TestBed.inject(DraftStore).confirmIdentity({
      userId: 'test-user',
      workspaceId: 'test-workspace',
    });
    vi.spyOn(TestBed.inject(BrowserStorageService), 'write').mockReturnValue(false);
    const fixture = TestBed.createComponent(CocktailCreate);
    fixture.componentInstance.form.controls.name.setValue('memory only');
    fixture.detectChanges();
    const notice = fixture.nativeElement.querySelector('app-draft-notice') as HTMLElement;
    expect(notice.textContent).toContain('Stockage navigateur indisponible ou saturé.');
    expect(notice.textContent).not.toContain(
      'Brouillon temporaire dans cet onglet, 24 heures maximum',
    );
    const abandon = [...notice.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Abandonner'),
    );
    expect(abandon).toBeDefined();
    abandon!.click();
    expect(fixture.componentInstance.form.controls.name.value).toBe('');
  });
  it('does not leave an orphaned pending command after navigation destroys the creation form', () => {
    const store = TestBed.inject(DraftStore);
    store.confirmIdentity({ userId: 'test-user', workspaceId: 'test-workspace' });
    const pending = new Subject<{ id: string; slug: string }>();
    cocktailsService.response = pending;
    const f = TestBed.createComponent(CocktailCreate);
    const c = f.componentInstance;
    fillRequiredFields(c);
    c.ingredients.at(0).controls.ingredientName.setValue('Gin');
    c.ingredients.at(0).controls.ingredientDefaultAbv.setValue(40);
    c.ingredients.at(0).controls.amount.setValue(5);
    c.submit();
    expect(cocktailsService.requests).toHaveLength(1);
    expect(store.hasPendingMutation()).toBe(true);
    f.destroy();
    expect(pending.observed).toBe(false);
    expect(store.hasPendingMutation()).toBe(false);
    expect(store.find(store.lease(), 'create:new')?.uncertain).toBe(true);
    c.submit();
    expect(cocktailsService.requests).toHaveLength(1);
  });

});
