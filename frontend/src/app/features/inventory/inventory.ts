import { DatePipe } from '@angular/common';
import { Component, DestroyRef, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, timeout } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { WorkspaceContext } from '../../core/workspaces/workspace-context';
import { InventoryApi, StockHistory, StockProduct } from './inventory-api';
import { InventoryCommand, StockForm } from './inventory-command';
@Component({
  selector: 'app-inventory',
  imports: [InventoryCommand, DatePipe],
  templateUrl: './inventory.html',
  styleUrl: './inventory.css',
})
export class Inventory {
  readonly workspace = inject(WorkspaceContext);
  private readonly auth = inject(AuthService);
  private readonly api = inject(InventoryApi);
  private readonly destroy = inject(DestroyRef);
  readonly products = signal<StockProduct[]>([]);
  readonly recommendations = signal<StockProduct[]>([]);
  readonly total = signal(0);
  readonly reorderTotal = signal(0);
  readonly loading = signal(false);
  readonly reorderLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly reorderError = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly form = signal<StockForm | null>(null);
  readonly access = signal<number | null>(null);
  readonly history = signal<StockHistory | null>(null);
  readonly historyProduct = signal<StockProduct | null>(null);
  readonly historyError = signal<string | null>(null);
  readonly historyLoading = signal(false);
  private generation = 0;
  private scope = '';
  private listSequence = 0;
  private reorderSequence = 0;
  private historySequence = 0;
  private page = 0;
  private reorderPage = 0;
  constructor() {
    effect(() => {
      const user = this.auth.snapshot();
      const context = this.workspace.current();
      if (!user) {
        untracked(() => this.clear());
        this.scope = '';
        return;
      }
      if (!context) return;
      const key = `${user.user.id}:${context.id}`;
      if (key !== this.scope) {
        this.scope = key;
        untracked(() => {
          this.clear();
          if (context.kind === 'SHARED') this.refresh();
        });
      }
    });
  }
  private clear(): void {
    this.generation++;
    this.products.set([]);
    this.recommendations.set([]);
    this.total.set(0);
    this.reorderTotal.set(0);
    this.form.set(null);
    this.history.set(null);
    this.historyProduct.set(null);
    this.error.set(null);
    this.reorderError.set(null);
    this.notice.set(null);
    this.access.set(null);
    this.loading.set(false);
    this.reorderLoading.set(false);
    this.historyLoading.set(false);
    this.historyError.set(null);
    this.page = 0;
    this.reorderPage = 0;
  }
  refresh(): void {
    this.load(true);
    this.load(true, true);
  }
  load(reset: boolean, reorder = false): void {
    const context = this.workspace.current();
    if (context?.kind !== 'SHARED') return;
    const generation = this.generation;
    const sequence = reorder ? ++this.reorderSequence : ++this.listSequence;
    const page = reset ? 1 : (reorder ? this.reorderPage : this.page) + 1;
    (reorder ? this.reorderLoading : this.loading).set(true);
    (reorder ? this.reorderError : this.error).set(null);
    this.api
      .list(page, reorder)
      .pipe(
        timeout(15000),
        takeUntilDestroyed(this.destroy),
        finalize(() => {
          if (
            generation === this.generation &&
            sequence === (reorder ? this.reorderSequence : this.listSequence)
          )
            (reorder ? this.reorderLoading : this.loading).set(false);
        }),
      )
      .subscribe({
        next: (result) => {
          if (
            generation !== this.generation ||
            context !== this.workspace.current() ||
            sequence !== (reorder ? this.reorderSequence : this.listSequence)
          )
            return;
          if (!reorder && !reset && this.access() !== result.accessVersion) {
            this.error.set(
              'Les droits ont changé pendant la pagination. Vérifie à nouveau le contexte.',
            );
            this.access.set(null);
            return;
          }
          const items = reset
            ? result.items
            : [...(reorder ? this.recommendations() : this.products()), ...result.items];
          (reorder ? this.recommendations : this.products).set([
            ...new Map(items.map((p) => [p.id, p])).values(),
          ]);
          if (reorder) {
            this.reorderPage = page;
            this.reorderTotal.set(result.total);
          } else {
            this.page = page;
            this.total.set(result.total);
            this.access.set(result.accessVersion);
          }
        },
        error: () => {
          if (
            generation === this.generation &&
            sequence === (reorder ? this.reorderSequence : this.listSequence)
          )
            (reorder ? this.reorderError : this.error).set(
              'Données non confirmées. Actualise explicitement ; aucune liste vide n’est supposée.',
            );
        },
      });
  }
  canAct(): boolean {
    return (
      !this.workspace.error() &&
      !this.form() &&
      !this.loading() &&
      !this.error() &&
      this.access() !== null &&
      this.access() === this.workspace.current()?.accessVersion &&
      this.workspace.current()?.kind === 'SHARED'
    );
  }
  begin(mode: StockForm['mode'], product: StockProduct | null = null): void {
    if (mode !== 'move' && this.workspace.current()?.role !== 'OWNER') return;
    if (this.canAct()) {
      this.notice.set(null);
      this.form.set({ mode, product, accessVersion: this.access()! });
    }
  }
  confirmed(message: string): void {
    this.form.set(null);
    this.notice.set(message);
    this.refresh();
    const product = this.historyProduct();
    if (product) this.showHistory(product);
  }
  close(): void {
    this.form.set(null);
    this.refresh();
  }
  verifyRights(): void {
    if (this.form() || this.loading()) return;
    const key = this.scope;
    this.workspace
      .verifyCurrentAccess()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => {
          if (key === this.scope) this.refresh();
        },
        error: () => this.error.set('Les droits ne sont pas confirmés.'),
      });
  }
  showHistory(product: StockProduct, more = false): void {
    const context = this.workspace.current();
    const generation = this.generation;
    const sequence = ++this.historySequence;
    const previous = this.history();
    const page = more ? (previous?.page ?? 0) + 1 : 1;
    if (!more) this.history.set(null);
    this.historyProduct.set(product);
    this.historyError.set(null);
    this.historyLoading.set(true);
    this.api
      .history(product.id, page)
      .pipe(
        timeout(15000),
        takeUntilDestroyed(this.destroy),
        finalize(() => {
          if (generation === this.generation && sequence === this.historySequence)
            this.historyLoading.set(false);
        }),
      )
      .subscribe({
        next: (result) => {
          if (
            generation !== this.generation ||
            context !== this.workspace.current() ||
            sequence !== this.historySequence
          )
            return;
          if (more && previous?.snapshotVersion !== result.snapshotVersion) {
            this.historyError.set(
              'L’historique a changé pendant la lecture. Actualise cet historique avant de continuer.',
            );
            return;
          }
          this.history.set({
            ...result,
            items: more ? [...(previous?.items ?? []), ...result.items] : result.items,
          });
        },
        error: () => {
          if (generation === this.generation && sequence === this.historySequence)
            this.historyError.set('Historique non confirmé. Réessaie explicitement.');
        },
      });
  }
}
