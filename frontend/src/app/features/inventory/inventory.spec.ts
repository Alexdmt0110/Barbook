import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, Subject } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { WorkspaceContext } from '../../core/workspaces/workspace-context';
import { InventoryApi, StockPage } from './inventory-api';
import { Inventory } from './inventory';
const product = {
  id: 'p',
  name: 'Produit privé ancien',
  packaging: 'Bouteille700mL',
  quantity: 6,
  version: 3,
  threshold: 2,
  target: 8,
};
const session = {
  user: { id: 'user-a', displayName: 'QA', email: 'qa@example.test' },
  workspaceId: 'personal',
  csrfToken: 'csrf',
};
const initial = {
  id: 'bar-a',
  userId: 'user-a',
  name: 'Bar A',
  kind: 'SHARED',
  role: 'OWNER',
  accessVersion: 7,
};
describe('Inventory account/workspace isolation', () => {
  it('clears old products/form immediately and discards old catalogue results on account/workspace change', () => {
    const auth = signal(session);
    const context = signal(initial);
    const reads: Subject<StockPage>[] = [];
    TestBed.configureTestingModule({
      imports: [Inventory],
      providers: [
        { provide: AuthService, useValue: { snapshot: auth } },
        { provide: WorkspaceContext, useValue: { current: context, error: signal(null) } },
        {
          provide: InventoryApi,
          useValue: {
            list: () => {
              const s = new Subject<StockPage>();
              reads.push(s);
              return s;
            },
          },
        },
      ],
    });
    const f: ComponentFixture<Inventory> = TestBed.createComponent(Inventory);
    f.detectChanges();
    reads[0].next({ items: [product], total: 1, page: 1, pageSize: 25, accessVersion: 7 });
    reads[0].complete();
    reads[1].next({ items: [], total: 0, page: 1, pageSize: 25, accessVersion: 7 });
    reads[1].complete();
    f.detectChanges();
    f.componentInstance.begin('move', product);
    f.detectChanges();
    expect((f.nativeElement as HTMLElement).textContent).toContain(product.name);
    f.componentInstance.refresh();
    auth.set({ ...session, user: { ...session.user, id: 'user-b' } });
    context.set({ ...initial, id: 'bar-b', userId: 'user-b' });
    f.detectChanges();
    expect(f.componentInstance.form()).toBe(null);
    expect(f.componentInstance.products()).toEqual([]);
    reads[2].next({ items: [product], total: 1, page: 1, pageSize: 25, accessVersion: 7 });
    reads[2].complete();
    reads[3].error(new Error('old account'));
    f.detectChanges();
    expect((f.nativeElement as HTMLElement).textContent).not.toContain(product.name);
    expect(f.componentInstance.error()).toBe(null);
    reads[4].next({ items: [], total: 0, page: 1, pageSize: 25, accessVersion: 7 });
    reads[4].complete();
    reads[5].next({ items: [], total: 0, page: 1, pageSize: 25, accessVersion: 7 });
    reads[5].complete();
  });
  it('refuses to concatenate history pages from a changed product snapshot', () => {
    const auth = signal(session),
      context = signal(initial);
    const histories: Subject<unknown>[] = [];
    TestBed.configureTestingModule({
      imports: [Inventory],
      providers: [
        { provide: AuthService, useValue: { snapshot: auth } },
        { provide: WorkspaceContext, useValue: { current: context, error: signal(null) } },
        {
          provide: InventoryApi,
          useValue: {
            list: () => of({ items: [], total: 0, page: 1, pageSize: 25, accessVersion: 7 }),
            history: () => {
              const s = new Subject<unknown>();
              histories.push(s);
              return s;
            },
          },
        },
      ],
    });
    const f = TestBed.createComponent(Inventory);
    f.detectChanges();
    const c = f.componentInstance;
    const entry = {
      id: 'old',
      kind: 'ADD',
      beforeQuantity: 5,
      afterQuantity: 6,
      delta: 1,
      reason: 'Réception',
      productVersion: 3,
      createdAt: '2026-10-29T07:00:00Z',
      actor: { id: 'u', displayName: 'QA' },
    };
    c.showHistory(product);
    histories[0].next({ snapshotVersion: 3, items: [entry], total: 3, page: 1, pageSize: 1 });
    histories[0].complete();
    c.showHistory(product, true);
    histories[1].next({
      snapshotVersion: 4,
      items: [{ ...entry, id: 'mixed' }],
      total: 4,
      page: 2,
      pageSize: 1,
    });
    histories[1].complete();
    expect(c.history()?.items.map((x) => x.id)).toEqual(['old']);
    expect(c.historyError()).toContain('changé pendant la lecture');
  });
  it('serializes repeated rights checks and disables new stock actions until the check ends', () => {
    const auth = signal(session),
      context = signal(initial),
      check = new Subject<void>();
    const verify = vi.fn(() => check);
    TestBed.configureTestingModule({
      imports: [Inventory],
      providers: [
        { provide: AuthService, useValue: { snapshot: auth } },
        {
          provide: WorkspaceContext,
          useValue: { current: context, error: signal(null), verifyCurrentAccess: verify },
        },
        {
          provide: InventoryApi,
          useValue: {
            list: () => of({ items: [], total: 0, page: 1, pageSize: 25, accessVersion: 7 }),
          },
        },
      ],
    });
    const f = TestBed.createComponent(Inventory);
    f.detectChanges();
    const c = f.componentInstance;
    expect(c.canAct()).toBe(true);
    c.verifyRights();
    c.verifyRights();
    expect(verify).toHaveBeenCalledOnce();
    expect(c.canAct()).toBe(false);
    check.next();
    check.complete();
    expect(c.canAct()).toBe(true);
  });
});
