import {
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnChanges,
  OnInit,
  output,
  signal,
  SimpleChanges,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, Subscription } from 'rxjs';
import { CocktailListResult, CocktailSummary } from '../../cocktails/data-access/cocktail.models';
import { CocktailsService } from '../../cocktails/data-access/cocktails.service';
import { FoldersService } from '../data-access/folders.service';
import { folderError } from '../folder-errors';

@Component({
  selector: 'app-folder-cocktail-picker',
  templateUrl: './folder-cocktail-picker.html',
  styleUrl: '../folders.css',
})
export class FolderCocktailPicker implements OnInit, OnChanges {
  private readonly cocktails = inject(CocktailsService);
  private readonly folders = inject(FoldersService);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;
  private appliedSearch = '';
  readonly folderId = input.required<string>();
  readonly disabled = input(false);
  readonly refreshKey = input(0);
  readonly added = output<{ added: number }>();
  readonly busyChanged = output<boolean>();
  readonly result = signal<CocktailListResult | null>(null);
  readonly selected = signal<{ id: string; name: string }[]>([]);
  readonly searchTerm = signal('');
  readonly page = signal(1);
  readonly isLoading = signal(true);
  readonly isAdding = signal(false);
  readonly busy = computed(() => this.disabled() || this.isAdding());
  readonly loadError = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  ngOnInit(): void {
    this.load();
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['refreshKey'] && !changes['refreshKey'].firstChange) this.load();
  }
  search(): void {
    this.appliedSearch = this.searchTerm().trim();
    this.load(1);
  }
  load(page = this.page()): void {
    this.request?.unsubscribe();
    this.page.set(page);
    this.isLoading.set(true);
    this.loadError.set(null);
    this.request = this.cocktails
      .getPersonalCocktails({ page, pageSize: 12, search: this.appliedSearch })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (result) => {
          this.result.set(result);
          if (page > Math.max(result.totalPages, 1)) {
            this.load(Math.max(result.totalPages, 1));
            return;
          }
          const assigned = new Set(
            result.items.filter((item) => this.isAssigned(item)).map((item) => item.id),
          );
          this.selected.update((items) => items.filter((item) => !assigned.has(item.id)));
        },
        error: (error: unknown) => this.loadError.set(folderError(error)),
      });
  }
  isAssigned(item: CocktailSummary): boolean {
    return item.folders.some((folder) => folder.id === this.folderId());
  }
  isSelected(id: string): boolean {
    return this.selected().some((item) => item.id === id);
  }
  toggle(item: CocktailSummary, event: Event): void {
    if (!(event.target instanceof HTMLInputElement)) return;
    this.actionError.set(null);
    if (!event.target.checked) {
      this.unselect(item.id);
      return;
    }
    if (this.selected().length >= 100) {
      event.target.checked = false;
      this.actionError.set('Sélectionne au plus 100 cocktails par ajout.');
      return;
    }
    if (!this.isSelected(item.id))
      this.selected.update((items) => [...items, { id: item.id, name: item.name }]);
  }
  unselect(id: string): void {
    this.selected.update((items) => items.filter((item) => item.id !== id));
  }
  add(): void {
    if (this.busy() || this.selected().length === 0) return;
    this.actionError.set(null);
    this.success.set(null);
    this.isAdding.set(true);
    this.busyChanged.emit(true);
    this.folders
      .addCocktails(
        this.folderId(),
        this.selected().map((item) => item.id),
      )
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isAdding.set(false);
          this.busyChanged.emit(false);
        }),
      )
      .subscribe({
        next: (result) => {
          this.selected.set([]);
          this.success.set(`${result.added} cocktail(s) ajouté(s).`);
          this.added.emit(result);
        },
        error: (error: unknown) => this.actionError.set(folderError(error)),
      });
  }
}
