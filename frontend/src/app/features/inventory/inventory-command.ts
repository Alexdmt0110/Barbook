import { HttpErrorResponse } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Observable, finalize, map, of, switchMap, timeout } from 'rxjs';
import { WorkspaceContext } from '../../core/workspaces/workspace-context';
import {
  CreateProduct,
  InventoryApi,
  StockChange,
  StockProduct,
  StockReceipt,
  StockSettings,
} from './inventory-api';
export interface StockForm {
  mode: 'create' | 'move' | 'settings';
  product: StockProduct | null;
  accessVersion: number;
}
type Intent =
  | { kind: 'create'; body: CreateProduct }
  | { kind: 'move'; productId: string; body: StockChange }
  | { kind: 'settings'; productId: string; body: StockSettings };
@Component({
  selector: 'app-inventory-command',
  imports: [FormsModule],
  templateUrl: './inventory-command.html',
  styleUrl: './inventory.css',
})
export class InventoryCommand implements OnInit, AfterViewInit {
  readonly form = input.required<StockForm>();
  readonly saved = output<string>();
  readonly cancelled = output<void>();
  readonly refreshCatalog = output<void>();
  readonly workspace = inject(WorkspaceContext);
  private readonly api = inject(InventoryApi);
  private readonly destroy = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly busy = signal(false);
  readonly blocked = signal(false);
  readonly uncertain = signal(false);
  readonly missing = signal(false);
  readonly message = signal<string | null>(null);
  readonly reviewed = signal<StockProduct | null>(null);
  readonly inspected = signal(false);
  private intent: Intent | null = null;
  private reviewedAccess: number | null = null;
  name = '';
  packaging = '';
  initialQuantity: number | null = 0;
  threshold: number | null = 2;
  target: number | null = 8;
  operation: 'ADD' | 'REMOVE' | 'SET' = 'REMOVE';
  amount: number | null = 1;
  reason = '';
  private source: StockProduct | null = null;
  private access = 0;
  ngOnInit(): void {
    this.source = this.form().product;
    this.access = this.form().accessVersion;
    if (this.source) {
      this.threshold = this.source.threshold;
      this.target = this.source.target;
    }
  }
  ngAfterViewInit(): void {
    this.host.nativeElement.querySelector<HTMLElement>('input, select, textarea')?.focus();
  }
  valid(value: number | null): value is number {
    return value !== null && Number.isInteger(value) && value >= 0 && value <= 2147483647;
  }
  ready(): boolean {
    if (this.busy() || this.blocked() || !this.workspace.current()) return false;
    if (this.form().mode === 'move')
      return (
        this.valid(this.amount) &&
        !!this.reason.trim() &&
        this.reason.trim().length <= 240 &&
        (this.operation === 'SET' || this.amount > 0) &&
        (this.operation !== 'REMOVE' || this.amount <= (this.source?.quantity ?? 0)) &&
        (this.operation !== 'SET' || this.amount !== this.source?.quantity) &&
        (this.operation !== 'ADD' || this.amount + (this.source?.quantity ?? 0) <= 2147483647)
      );
    if (!this.valid(this.threshold) || !this.valid(this.target)) return false;
    return (
      this.form().mode === 'settings' ||
      (!!this.name.trim() &&
        this.name.trim().length <= 80 &&
        !!this.packaging.trim() &&
        this.packaging.trim().length <= 120 &&
        this.valid(this.initialQuantity))
    );
  }
  submit(): void {
    if (!this.ready()) return;
    if (!this.intent) {
      try {
        if (this.form().mode === 'create')
          this.intent = {
            kind: 'create',
            body: {
              name: this.name.trim(),
              packaging: this.packaging.trim(),
              initialQuantity: this.initialQuantity!,
              threshold: this.threshold!,
              target: this.target!,
              requestId: crypto.randomUUID(),
              expectedAccessVersion: this.access,
            },
          };
        else if (this.form().mode === 'move' && this.source)
          this.intent = {
            kind: 'move',
            productId: this.source.id,
            body: {
              kind: this.operation,
              amount: this.amount!,
              reason: this.reason.trim(),
              requestId: crypto.randomUUID(),
              expectedProductVersion: this.source.version,
              expectedAccessVersion: this.access,
            },
          };
        else if (this.form().mode === 'settings' && this.source)
          this.intent = {
            kind: 'settings',
            productId: this.source.id,
            body: {
              threshold: this.threshold!,
              target: this.target!,
              expectedProductVersion: this.source.version,
              expectedAccessVersion: this.access,
            },
          };
      } catch {
        this.message.set(
          'La création d’une intention sécurisée est indisponible. Aucun envoi effectué.',
        );
        return;
      }
    }
    this.send();
  }
  private send(): void {
    const intent = this.intent;
    if (!intent || this.busy()) return;
    const scope = this.workspace.current();
    this.busy.set(true);
    this.message.set(null);
    this.inspected.set(false);
    this.missing.set(false);
    const request: Observable<{ product: StockProduct; receipt: StockReceipt | null }> =
      intent.kind === 'create'
        ? this.api.create(intent.body)
        : intent.kind === 'move'
          ? this.api.move(intent.productId, intent.body)
          : this.api
              .settings(intent.productId, intent.body)
              .pipe(map((product) => ({ product, receipt: null })));
    request
      .pipe(
        timeout(15000),
        takeUntilDestroyed(this.destroy),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (result) => {
          if (scope !== this.workspace.current()) return;
          this.saved.emit(
            result.receipt
              ? `Action confirmée : ${result.receipt.beforeQuantity} → ${result.receipt.afterQuantity} unité(s).`
              : 'Seuil et cible confirmés.',
          );
        },
        error: (error) => {
          if (scope !== this.workspace.current()) return;
          this.blocked.set(true);
          const known =
            error instanceof HttpErrorResponse && [400, 401, 403, 404, 409].includes(error.status);
          this.uncertain.set(!known);
          this.message.set(
            known
              ? 'Action refusée. La saisie est conservée ; vérifie l’état actuel avant de préparer une nouvelle intention.'
              : 'Résultat inconnu : le serveur peut avoir enregistré l’action. Aucun renvoi automatique.',
          );
        },
      });
  }
  inspectReceipt(): void {
    const intent = this.intent;
    if (!intent || intent.kind === 'settings' || this.busy()) return;
    const scope = this.workspace.current();
    this.busy.set(true);
    this.missing.set(false);
    this.api
      .receipt(intent.body.requestId)
      .pipe(
        timeout(15000),
        takeUntilDestroyed(this.destroy),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (result) => {
          if (scope === this.workspace.current())
            this.saved.emit(
              `Reçu retrouvé : ${result.receipt.beforeQuantity} → ${result.receipt.afterQuantity} unité(s), version ${result.receipt.productVersion}. Consulte le stock actuel pour les mouvements ultérieurs.`,
            );
        },
        error: (error) => {
          if (scope !== this.workspace.current()) return;
          this.missing.set(error instanceof HttpErrorResponse && error.status === 404);
          this.message.set(
            'Reçu non confirmé. Un résultat introuvable ne prouve pas qu’une requête encore en cours a échoué.',
          );
        },
      });
  }
  retrySame(): void {
    if (this.uncertain() && this.missing() && !this.busy()) this.send();
  }
  inspectState(): void {
    if (this.busy() || !this.intent) return;
    // Explicitly re-confirm rights; retain the original body/version until the user starts a NEW intention.
    const key = this.ownerKey();
    this.busy.set(true);
    this.inspected.set(false);
    this.workspace
      .verifyCurrentAccess()
      .pipe(
        switchMap(() => (this.source ? this.api.detail(this.source.id) : of(null))),
        timeout(15000),
        takeUntilDestroyed(this.destroy),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (product) => {
          if (!key || key !== this.ownerKey()) return;
          this.reviewed.set(product);
          this.reviewedAccess = this.workspace.current()!.accessVersion;
          this.inspected.set(true);
          this.refreshCatalog.emit();
        },
        error: () => {
          if (key === this.ownerKey())
            this.message.set(
              'Les données et droits ne sont pas confirmés. Aucune nouvelle intention ne sera envoyée.',
            );
        },
      });
  }
  newIntention(): void {
    if (!this.inspected() || this.uncertain() || this.reviewedAccess === null || this.busy())
      return;
    this.source = this.reviewed();
    this.access = this.reviewedAccess;
    this.intent = null;
    this.blocked.set(false);
    this.message.set(
      'État vérifié adopté explicitement. Relis ta saisie puis confirme une nouvelle action.',
    );
    this.inspected.set(false);
  }
  close(): void {
    if (
      this.busy() ||
      (this.uncertain() && !(this.intent?.kind === 'settings' && this.inspected()))
    )
      return;
    this.cancelled.emit();
  }
  private ownerKey(): string | null {
    const c = this.workspace.current();
    return c ? `${c.userId}:${c.id}` : null;
  }
  isSettings(): boolean {
    return this.intent?.kind === 'settings';
  }
  currentSource(): StockProduct | null {
    return this.source;
  }
}
