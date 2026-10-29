import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { lastValueFrom } from 'rxjs';
import { WorkspaceContext } from '../../core/workspaces/workspace-context';
import { InventoryCommand } from './inventory-command';
const bar = '10000000-0000-4000-8000-000000000001';
const product = {
  id: '20000000-0000-4000-8000-000000000001',
  name: 'Paddy',
  packaging: 'Bouteille700mL',
  quantity: 6,
  version: 3,
  threshold: 2,
  target: 8,
};
const auth = {
  user: { id: 'user', displayName: 'QA', email: 'qa@example.test' },
  workspaceId: 'personal',
  csrfToken: 'csrf',
};
const context = { id: bar, name: 'Bar', role: 'MEMBER', accessVersion: 7 };
const base = `/api/workspaces/${bar}/inventory`;
describe('Inventory intention and explicit recovery', () => {
  let http: HttpTestingController;
  let workspace: WorkspaceContext;
  beforeEach(async () => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [InventoryCommand],
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
    const f = TestBed.createComponent(InventoryCommand);
    f.componentRef.setInput('form', { mode: 'move', product, accessVersion: 7 });
    f.detectChanges();
    f.componentInstance.reason = 'Perte constatée';
    f.componentInstance.amount = 2;
    return f;
  }
  function success(requestId: string) {
    return {
      product: { ...product, quantity: 4, version: 4 },
      receipt: {
        id: 'receipt',
        requestId,
        productId: product.id,
        kind: 'REMOVE',
        beforeQuantity: 6,
        afterQuantity: 4,
        productVersion: 4,
        reason: 'Perte constatée',
        createdAt: '2026-10-29T07:00:00Z',
      },
    };
  }
  it('captures loaded versions and ignores double submit while pending', () => {
    const f = setup();
    const c = f.componentInstance;
    c.submit();
    c.submit();
    const r = http.expectOne(`${base}/products/${product.id}/movements`);
    expect(r.request.body).toMatchObject({
      expectedProductVersion: 3,
      expectedAccessVersion: 7,
      kind: 'REMOVE',
      amount: 2,
      reason: 'Perte constatée',
    });
    const saved = vi.fn();
    c.saved.subscribe(saved);
    r.flush(success(r.request.body.requestId));
    expect(saved).toHaveBeenCalledOnce();
    expect(workspace.pendingCommands()).toBe(0);
  });
  it('retains an uncertain command, freezes its payload and explicitly retries only the same key after receipt inspection', () => {
    const f = setup();
    const c = f.componentInstance;
    c.submit();
    const r = http.expectOne(`${base}/products/${product.id}/movements`);
    const body = r.request.body;
    r.error(new ProgressEvent('error'));
    expect(c.uncertain()).toBe(true);
    c.amount = 99;
    c.submit();
    c.close();
    http.expectNone(`${base}/products/${product.id}/movements`);
    c.inspectReceipt();
    http
      .expectOne(`${base}/receipts/${body.requestId}`)
      .flush({}, { status: 404, statusText: 'Not found' });
    // WorkspaceContext rechecks membership on any scoped404 without replaying the command.
    http.expectOne(`/api/workspaces/${bar}`).flush(context);
    expect(c.missing()).toBe(true);
    http.expectNone(`${base}/products/${product.id}/movements`);
    c.retrySame();
    const retry = http.expectOne(`${base}/products/${product.id}/movements`);
    expect(retry.request.body).toEqual(body);
    retry.flush(success(body.requestId));
  });
  it('recovers an actually recorded result by GET without another POST', () => {
    const f = setup();
    const c = f.componentInstance;
    c.submit();
    const r = http.expectOne(`${base}/products/${product.id}/movements`);
    const key = r.request.body.requestId;
    r.error(new ProgressEvent('error'));
    const saved = vi.fn();
    c.saved.subscribe(saved);
    c.inspectReceipt();
    http.expectOne(`${base}/receipts/${key}`).flush(success(key));
    expect(saved).toHaveBeenCalledWith(expect.stringContaining('6 → 4'));
    http.expectNone(`${base}/products/${product.id}/movements`);
  });
  it('preserves conflict input and adopts new product/access versions only after the explicit new-intention action', () => {
    const f = setup();
    const c = f.componentInstance;
    c.submit();
    const r = http.expectOne(`${base}/products/${product.id}/movements`);
    const oldKey = r.request.body.requestId;
    r.flush({}, { status: 409, statusText: 'Conflict' });
    expect(c.reason).toBe('Perte constatée');
    expect(c.amount).toBe(2);
    expect(c.blocked()).toBe(true);
    c.inspectState();
    http.expectOne(`/api/workspaces/${bar}`).flush({ ...context, accessVersion: 8 });
    http
      .expectOne(`${base}/products/${product.id}`)
      .flush({ ...product, quantity: 5, version: 4, accessVersion: 8 });
    c.submit();
    http.expectNone(`${base}/products/${product.id}/movements`);
    expect(c.reviewed()?.version).toBe(4);
    c.newIntention();
    c.submit();
    const next = http.expectOne(`${base}/products/${product.id}/movements`);
    expect(next.request.body).toMatchObject({
      expectedProductVersion: 4,
      expectedAccessVersion: 8,
      amount: 2,
      reason: 'Perte constatée',
    });
    expect(next.request.body.requestId).not.toBe(oldKey);
    next.flush(success(next.request.body.requestId));
  });
  it('does not expose a late result after identity/context suspension', () => {
    const f = setup();
    const c = f.componentInstance;
    const saved = vi.fn();
    c.saved.subscribe(saved);
    c.submit();
    const r = http.expectOne(`${base}/products/${product.id}/movements`);
    workspace.suspend(true);
    r.flush(success(r.request.body.requestId));
    expect(saved).not.toHaveBeenCalled();
    expect(workspace.pendingCommands()).toBe(0);
    http.expectNone(`${base}/products/${product.id}/movements`);
  });
  it('does not dispatch settings with a target below the alert threshold', async () => {
    const f = TestBed.createComponent(InventoryCommand);
    f.componentRef.setInput('form', { mode: 'settings', product, accessVersion: 7 });
    f.detectChanges();
    await f.whenStable();
    const host = f.nativeElement as HTMLElement;
    const threshold = host.querySelector<HTMLInputElement>('input[name=threshold]')!;
    const target = host.querySelector<HTMLInputElement>('input[name=target]')!;
    threshold.value = '4';
    threshold.dispatchEvent(new Event('input'));
    await f.whenStable();
    target.value = '3';
    target.dispatchEvent(new Event('input'));
    await f.whenStable();
    f.componentInstance.submit();
    http.expectNone(`${base}/products/${product.id}`);
    expect(host.querySelector<HTMLButtonElement>('button[type=submit]')?.disabled).toBe(true);
  });

});
