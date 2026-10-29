import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { lastValueFrom } from 'rxjs';
import { WorkspaceContext } from '../../core/workspaces/workspace-context';
import { BatchPlans } from './batch-plans';
const bar = '10000000-0000-4000-8000-000000000001';
const root = `/api/workspaces/${bar}/batch-plans`;
const context = { id: bar, name: 'Bar', role: 'MEMBER', accessVersion: 0 };
const auth = {
  user: { id: 'user', displayName: 'QA', email: 'qa@example.test' },
  workspaceId: 'personal',
  csrfToken: 'csrf',
};
const source = {
  id: 'recipe',
  slug: 'base',
  contentVersion: 3,
  organizationVersion: 2,
  accessVersion: 0,
  content: {
    name: 'Base',
    type: 'CLASSIC',
    family: null,
    method: 'BUILD',
    glass: 'Coupe',
    ice: null,
    notes: null,
    mainAlcoholName: null,
    ingredients: [
      {
        ingredientName: 'Gin',
        amount: 45,
        unit: 'ML',
        ingredientDefaultAbv: 40,
        abvMode: 'INHERIT',
        abvOverride: null,
        specification: null,
        notes: null,
      },
    ],
    garnishes: [],
    steps: ['Verser'],
  },
};
const q = (n: string) => ({ numerator: n, denominator: '1' });
const plan = {
  id: 'plan',
  name: 'Plan initial',
  version: 4,
  sourceCocktailId: 'recipe',
  sourceContentVersion: 3,
  sourceChanged: false,
  creatorId: 'user',
  createdAt: '2026-10-29T10:00:00Z',
  updatedAt: '2026-10-29T10:00:00Z',
  accessVersion: 0,
  snapshot: { schemaVersion: 1, recipe: source },
  parameters: { mode: 'VOLUME_ML', target: 1000, includedPositions: [0], rounding: [] },
  calculation: {
    factor: q('20'),
    completePortions: '20',
    basePerPortionMl: q('45'),
    baseVolumeMl: q('900'),
    targetVolumeMl: q('900'),
    volumeDifferenceMl: q('0'),
    remainingMl: q('0'),
    ingredients: [],
    garnishes: [],
  },
};
describe('Batch UI intentions and scoped memory', () => {
  let http: HttpTestingController, workspace: WorkspaceContext;
  beforeEach(async () => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [BatchPlans],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    workspace = TestBed.inject(WorkspaceContext);
    await lastValueFrom(workspace.confirmSession(auth));
    const opening = lastValueFrom(workspace.select(bar, async () => true));
    http.expectOne(`/api/workspaces/${bar}`).flush(context);
    await opening;
  });
  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });
  function setup() {
    const f = TestBed.createComponent(BatchPlans);
    f.detectChanges();
    http.expectOne((r) => r.url === root).flush({ items: [], total: 0, page: 1, accessVersion: 0 });
    return f;
  }
  function newForm() {
    const f = setup(),
      c = f.componentInstance;
    c.begin();
    http.expectOne((r) => r.url.endsWith('/cocktails')).flush({ items: [], total: 0 });
    c.choose('recipe');
    http.expectOne(`/api/workspaces/${bar}/cocktails/id/recipe/content`).flush(source);
    c.included = [true];
    c.changed();
    return f;
  }
  it('requires an explicit preview, sends loaded versions and blocks a double save', () => {
    const f = newForm(),
      c = f.componentInstance;
    c.save();
    http.expectNone(root);
    c.calculate();
    const preview = http.expectOne(`${root}/preview`);
    expect(preview.request.body).toMatchObject({
      sourceCocktailId: 'recipe',
      expectedContentVersion: 3,
      expectedAccessVersion: 0,
      includedPositions: [0],
    });
    expect(preview.request.body.requestId).toBeUndefined();
    expect(preview.request.body.name).toBeUndefined();
    preview.flush(plan);
    c.save();
    c.save();
    const create = http.expectOne(root);
    expect(create.request.body.expectedContentVersion).toBe(3);
    expect(create.request.body.requestId).toMatch(/^[a-f0-9-]{36}$/);
    create.flush({ ...plan, version: 0 });
    expect(c.editing()).toBe(false);
    expect(c.active()?.version).toBe(0);
  });
  it('resolves a committed lost creation by receipt without repeating POST', () => {
    const f = newForm(),
      c = f.componentInstance;
    c.calculate();
    http.expectOne(`${root}/preview`).flush(plan);
    c.save();
    const create = http.expectOne(root),
      key = create.request.body.requestId;
    create.error(new ProgressEvent('error'));
    expect(c.uncertain()).toBe(true);
    c.save();
    http.expectNone(root);
    c.receipt();
    http.expectOne(`/api/workspaces/${bar}/batch-plan-receipts/${key}`).flush(plan);
    expect(c.active()?.id).toBe('plan');
    expect(c.editing()).toBe(false);
    http.expectNone(root);
  });
  it('keeps conflict input across rights verification and replaces it only after explicit confirmation', () => {
    const f = setup(),
      c = f.componentInstance;
    c.open('plan');
    http.expectOne(`${root}/plan`).flush(plan);
    c.edit();
    c.name = 'My preserved input';
    c.changed();
    c.calculate();
    http.expectOne(`${root}/plan/preview`).flush(plan);
    c.save();
    http.expectOne(`${root}/plan`).flush({}, { status: 409, statusText: 'Conflict' });
    expect(c.name).toBe('My preserved input');
    c.inspect();
    http.expectOne(`/api/workspaces/${bar}`).flush(context);
    http.expectOne(`${root}/plan`).flush({ ...plan, name: 'New server state', version: 5 });
    expect(c.inspected()?.version).toBe(5);
    expect(c.name).toBe('My preserved input');
    c.save();
    http.expectNone(`${root}/plan`);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    c.resolve();
    expect(c.name).toBe('My preserved input');
    confirm.mockReturnValue(true);
    c.resolve();
    expect(c.name).toBe('New server state');
    expect(c.active()?.version).toBe(5);
    http.expectNone(`${root}/plan`);
    confirm.mockRestore();
  });
  it('drops late data and memory on identity suspension and protects ordinary navigation', () => {
    const f = newForm(),
      c = f.componentInstance;
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    expect(c.canLeave()).toBe(false);
    c.calculate();
    const pending = http.expectOne(`${root}/preview`);
    workspace.suspend(true);
    f.detectChanges();
    pending.flush(plan);
    expect(c.source()).toBeNull();
    expect(c.preview()).toBeNull();
    confirm.mockRestore();
  });
});
