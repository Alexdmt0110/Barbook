import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  HostListener,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Observable, finalize, switchMap, timeout } from 'rxjs';
import { WorkspaceContext } from '../../core/workspaces/workspace-context';
import { CocktailsService } from '../cocktails/data-access/cocktails.service';
import { CocktailContentSnapshot } from '../cocktails/data-access/cocktail-content.models';
import { CocktailSummary, MeasurementUnit } from '../cocktails/data-access/cocktail.models';
import {
  BatchApi,
  BatchCreate,
  BatchParameters,
  BatchPlan,
  BatchPreview,
  BatchSummary,
  BatchUpdate,
} from './batch-api';
import { BatchResult } from './batch-result';
type Intent =
  { kind: 'create'; body: BatchCreate } | { kind: 'update'; id: string; body: BatchUpdate };
@Component({
  selector: 'app-batch-plans',
  imports: [FormsModule, BatchResult],
  templateUrl: './batch-plans.html',
  styleUrl: './batch-plans.css',
})
export class BatchPlans {
  readonly workspace = inject(WorkspaceContext);
  private readonly api = inject(BatchApi);
  private readonly recipes = inject(CocktailsService);
  private readonly destroy = inject(DestroyRef);
  readonly plans = signal<BatchSummary[]>([]);
  readonly total = signal(0);
  readonly recipeOptions = signal<CocktailSummary[]>([]);
  readonly recipeTotal = signal(0);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly active = signal<BatchPlan | null>(null);
  readonly source = signal<CocktailContentSnapshot | null>(null);
  readonly preview = signal<BatchPreview | null>(null);
  readonly editing = signal(false);
  readonly blocked = signal(false);
  readonly uncertain = signal(false);
  readonly inspected = signal<BatchPlan | null>(null);
  readonly missingReceipt = signal(false);
  name = '';
  mode: BatchParameters['mode'] = 'VOLUME_ML';
  target: number | null = 1000;
  included: boolean[] = [];
  rounding: Partial<Record<Exclude<MeasurementUnit, 'TOP_UP'>, number | null>> = {};
  private scope = '';
  private generation = 0;
  private page = 0;
  private recipePage = 0;
  private access = 0;
  private dirty = false;
  private intent: Intent | null = null;
  private previewSignature = '';
  constructor() {
    const remove = this.workspace.registerExitGuard(() => this.canLeave());
    this.destroy.onDestroy(remove);
    effect(() => {
      const context = this.workspace.current();
      const key = context ? `${context.userId}:${context.id}` : '';
      if (key !== this.scope) {
        this.scope = key;
        untracked(() => {
          this.clear();
          if (context?.kind === 'SHARED') this.load();
        });
      }
    });
  }
  private clear() {
    this.generation++;
    this.plans.set([]);
    this.total.set(0);
    this.recipeOptions.set([]);
    this.recipeTotal.set(0);
    this.active.set(null);
    this.source.set(null);
    this.preview.set(null);
    this.editing.set(false);
    this.busy.set(false);
    this.blocked.set(false);
    this.uncertain.set(false);
    this.inspected.set(null);
    this.error.set(null);
    this.message.set(null);
    this.intent = null;
    this.dirty = false;
    this.page = 0;
    this.recipePage = 0;
  }
  private run<T>(
    request: Observable<T>,
    success: (value: T) => void,
    onError?: (error: unknown) => void,
    verifiedSameScope = false,
  ) {
    if (this.busy()) return;
    const context = this.workspace.current(),
      generation = this.generation,
      scope = this.scope;
    const stillCurrent = () =>
      generation === this.generation &&
      (context === this.workspace.current() || (verifiedSameScope && scope === this.scope));
    this.busy.set(true);
    this.error.set(null);
    request
      .pipe(
        timeout(15000),
        takeUntilDestroyed(this.destroy),
        finalize(() => {
          if (generation === this.generation) this.busy.set(false);
        }),
      )
      .subscribe({
        next: (value) => {
          if (stillCurrent()) success(value);
        },
        error: (error) => {
          if (!stillCurrent()) return;
          if (onError) onError(error);
          else
            this.error.set(
              'Données non confirmées. Réessaie explicitement sans modifier les versions chargées.',
            );
        },
      });
  }
  load(more = false) {
    const page = more ? this.page + 1 : 1;
    this.run(this.api.list(page), (r) => {
      this.plans.set(more ? [...this.plans(), ...r.items] : r.items);
      this.page = page;
      this.total.set(r.total);
      this.access = r.accessVersion;
    });
  }
  begin() {
    if (this.busy() || !this.canLeave()) return;
    this.active.set(null);
    this.source.set(null);
    this.preview.set(null);
    this.editing.set(true);
    this.intent = null;
    this.blocked.set(false);
    this.uncertain.set(false);
    this.inspected.set(null);
    this.dirty = false;
    this.name = '';
    this.loadRecipes();
  }
  loadRecipes(more = false) {
    const page = more ? this.recipePage + 1 : 1;
    this.run(this.recipes.getPersonalCocktails({ page, pageSize: 25 }), (r) => {
      this.recipeOptions.set(more ? [...this.recipeOptions(), ...r.items] : r.items);
      this.recipePage = page;
      this.recipeTotal.set(r.total);
    });
  }
  choose(id: string) {
    if (this.busy() || !this.canLeave()) return;
    this.run(this.recipes.getPersonalCocktailContent(id), (r) => {
      this.source.set(r);
      this.access = r.accessVersion!;
      this.name = `Prébatch ${r.content.name}`.slice(0, 120);
      this.included = r.content.ingredients.map(() => false);
      this.rounding = {};
      this.preview.set(null);
      this.dirty = false;
    });
  }
  open(id: string) {
    if (!this.canLeave()) return;
    this.run(this.api.detail(id), (p) => {
      this.adopt(p);
      this.editing.set(false);
    });
  }
  private adopt(p: BatchPlan) {
    this.active.set(p);
    this.source.set(p.snapshot.recipe);
    this.access = p.accessVersion;
    this.name = p.name;
    this.mode = p.parameters.mode;
    this.target = p.parameters.target;
    this.included = p.snapshot.recipe.content.ingredients.map((_, i) =>
      p.parameters.includedPositions.includes(i),
    );
    this.rounding = Object.fromEntries(p.parameters.rounding.map((r) => [r.unit, r.step]));
    this.preview.set(p);
    this.intent = null;
    this.blocked.set(false);
    this.uncertain.set(false);
    this.inspected.set(null);
    this.missingReceipt.set(false);
    this.dirty = false;
    this.previewSignature = '';
  }
  edit() {
    this.editing.set(true);
    this.preview.set(null);
    this.previewSignature = '';
    this.message.set(null);
  }
  changed() {
    this.dirty = true;
    this.preview.set(null);
    this.previewSignature = '';
    this.message.set(null);
  }
  units(): Exclude<MeasurementUnit, 'TOP_UP'>[] {
    const s = this.source();
    return s
      ? [
          ...new Set(
            [...s.content.ingredients, ...s.content.garnishes]
              .map((l) => l.unit)
              .filter((u): u is Exclude<MeasurementUnit, 'TOP_UP'> => u !== null && u !== 'TOP_UP'),
          ),
        ]
      : [];
  }
  private body(): BatchCreate | BatchUpdate | null {
    const source = this.source(),
      context = this.workspace.current();
    if (
      !source ||
      context?.kind !== 'SHARED' ||
      this.target === null ||
      !Number.isFinite(this.target) ||
      this.target <= 0 ||
      !this.name.trim() ||
      this.name.trim().length > 120
    )
      return null;
    const input: BatchParameters = {
      mode: this.mode,
      target: this.target,
      includedPositions: this.included.flatMap((v, i) => (v ? [i] : [])),
      rounding: this.units()
        .filter((u) => this.rounding[u] != null)
        .map((unit) => ({ unit, step: this.rounding[unit]! })),
    };
    if (!input.includedPositions.length) return null;
    const common = { ...input, name: this.name.trim(), expectedAccessVersion: this.access };
    return this.active()
      ? { ...common, expectedPlanVersion: this.active()!.version }
      : {
          ...common,
          sourceCocktailId: source.id,
          expectedContentVersion: source.contentVersion,
          requestId: '',
        };
  }
  ready() {
    return !this.busy() && !this.blocked() && !!this.body();
  }
  calculate() {
    const body = this.body();
    if (!body || !this.ready()) return;
    const signature = JSON.stringify(body);
    this.run(
      this.api.preview(body, this.active()?.id),
      (r) => {
        this.preview.set(r);
        this.previewSignature = signature;
      },
      (error) => {
        this.error.set(this.errorText(error));
      },
    );
  }
  canSave() {
    return (
      this.ready() && !!this.preview() && this.previewSignature === JSON.stringify(this.body())
    );
  }
  save() {
    if (!this.canSave()) return;
    const body = this.body()!;
    try {
      this.intent = this.active()
        ? { kind: 'update', id: this.active()!.id, body: body as BatchUpdate }
        : { kind: 'create', body: { ...body, requestId: crypto.randomUUID() } as BatchCreate };
    } catch {
      this.error.set('Impossible de créer une intention sécurisée. Aucun envoi.');
      return;
    }
    this.send();
  }
  private send() {
    const intent = this.intent;
    if (!intent || this.busy()) return;
    this.run(
      intent.kind === 'create'
        ? this.api.create(intent.body)
        : this.api.update(intent.id, intent.body),
      (p) => {
        this.adopt(p);
        this.editing.set(false);
        this.message.set('Plan enregistré. Aucune fabrication ni consommation de stock déclarée.');
      },
      (error) => {
        this.blocked.set(true);
        const known =
          error instanceof HttpErrorResponse && [400, 401, 403, 404, 409].includes(error.status);
        this.uncertain.set(!known);
        this.error.set(
          known
            ? 'Enregistrement refusé. Ta saisie est conservée. Vérifie explicitement l’état avant toute nouvelle intention.'
            : 'Résultat inconnu : le plan peut avoir été enregistré. Aucun renvoi automatique.',
        );
      },
    );
  }
  receipt() {
    const intent = this.intent;
    if (intent?.kind !== 'create' || this.busy()) return;
    this.run(
      this.api.receipt(intent.body.requestId),
      (p) => {
        this.adopt(p);
        this.editing.set(false);
        this.message.set(
          'Reçu de création retrouvé. Le plan affiché inclut ses éventuelles révisions ultérieures.',
        );
      },
      (error) => {
        this.missingReceipt.set(error instanceof HttpErrorResponse && error.status === 404);
        this.error.set(
          'Reçu non confirmé. Introuvable ne prouve pas qu’une requête encore en cours a échoué.',
        );
      },
    );
  }
  retrySame() {
    if (this.uncertain() && this.missingReceipt() && this.intent?.kind === 'create') this.send();
  }
  inspect() {
    const intent = this.intent;
    if (intent?.kind !== 'update' || this.busy()) return;
    const request = this.workspace
      .verifyCurrentAccess()
      .pipe(switchMap(() => this.api.detail(intent.id)));
    this.run(
      request,
      (value) => {
        this.inspected.set(value);
        this.message.set(
          'État et droits revérifiés. La saisie et les versions de l’intention initiale restent inchangées.',
        );
      },
      undefined,
      true,
    );
  }
  resolve() {
    const fresh = this.inspected();
    if (!fresh || this.busy() || this.uncertain()) return;
    if (
      !window.confirm(
        'Remplacer la saisie par le plan actuellement enregistré ? Rien ne sera envoyé.',
      )
    )
      return;
    this.adopt(fresh);
    this.editing.set(false);
    this.message.set(
      'Version actuelle chargée explicitement. Ouvre Modifier pour préparer une autre intention.',
    );
  }
  close() {
    if (this.busy() || !this.canLeave()) return;
    this.active.set(null);
    this.source.set(null);
    this.preview.set(null);
    this.editing.set(false);
    this.intent = null;
    this.blocked.set(false);
    this.uncertain.set(false);
    this.dirty = false;
    this.load();
  }
  canLeave() {
    const current = this.workspace.current();
    // Selection already asked before installing a different context.
    if (!current || this.scope !== `${current.userId}:${current.id}`) return true;
    return (
      !this.busy() &&
      (!this.dirty ||
        window.confirm(
          this.uncertain()
            ? 'Quitter cette saisie mémoire ? Une écriture envoyée peut déjà être enregistrée. Vérifie le plan ou son historique avant toute nouvelle action.'
            : 'Quitter et perdre cette saisie de plan conservée seulement en mémoire ?',
        ))
    );
  }
  @HostListener('window:beforeunload', ['$event']) beforeUnload(event: BeforeUnloadEvent) {
    if (this.dirty) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
  private errorText(error: unknown) {
    const detail =
      error instanceof HttpErrorResponse ? (error.error as { message?: unknown }) : null;
    return typeof detail?.message === 'string'
      ? detail.message
      : 'Calcul non confirmé. Vérifie les unités, quantités et versions chargées ; rien n’a été enregistré.';
  }
}
