import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, Subject, Subscription, takeUntil } from 'rxjs';
import { CocktailListResult } from '../../cocktails/data-access/cocktail.models';
import { CocktailsService } from '../../cocktails/data-access/cocktails.service';
import { FolderDetail as FolderDetailModel } from '../data-access/folder.models';
import { FoldersService } from '../data-access/folders.service';
import { FolderCocktailPicker } from '../folder-cocktail-picker/folder-cocktail-picker';
import { folderError } from '../folder-errors';

@Component({
  selector: 'app-folder-detail',
  imports: [RouterLink, FolderCocktailPicker],
  templateUrl: './folder-detail.html',
  styleUrl: '../folders.css',
})
export class FolderDetail implements OnInit {
  private readonly folders = inject(FoldersService);
  private readonly cocktails = inject(CocktailsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly routeReset = new Subject<void>();
  private membersRequest?: Subscription;
  private metadataRequest?: Subscription;
  private id = '';
  private appliedSearch = '';
  readonly folder = signal<FolderDetailModel | null>(null);
  readonly members = signal<CocktailListResult | null>(null);
  readonly renameName = signal('');
  readonly searchTerm = signal('');
  readonly page = signal(1);
  readonly isLoading = signal(true);
  readonly metadataLoading = signal(false);
  readonly membersLoading = signal(false);
  readonly isMutating = signal(false);
  readonly isAdding = signal(false);
  readonly showPicker = signal(false);
  readonly pickerOpened = signal(false);
  readonly pickerRefresh = signal(0);
  readonly busy = computed(() => this.metadataLoading() || this.isMutating() || this.isAdding());
  readonly notFound = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly membersError = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.routeReset.next();
      this.id = params.get('id') ?? '';
      this.folder.set(null);
      this.members.set(null);
      this.renameName.set('');
      this.searchTerm.set('');
      this.appliedSearch = '';
      this.page.set(1);
      this.showPicker.set(false);
      this.pickerOpened.set(false);
      this.isAdding.set(false);
      this.actionError.set(null);
      this.success.set(null);
      this.reload();
    });
  }
  reload(): void {
    if (this.isMutating() || this.isAdding()) return;
    this.metadataRequest?.unsubscribe();
    this.metadataLoading.set(true);
    this.isLoading.set(this.folder() === null);
    this.loadError.set(null);
    this.notFound.set(false);
    this.metadataRequest = this.folders
      .get(this.id)
      .pipe(
        takeUntil(this.routeReset),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.metadataLoading.set(false);
          this.isLoading.set(false);
        }),
      )
      .subscribe({
        next: (folder) => {
          this.folder.set(folder);
          this.renameName.set(folder.name);
          this.actionError.set(null);
          this.loadMembers();
        },
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 404) {
            this.notFound.set(true);
            this.folder.set(null);
          } else if (this.folder()) this.actionError.set(folderError(error));
          else this.loadError.set(folderError(error));
        },
      });
  }
  search(): void {
    this.appliedSearch = this.searchTerm().trim();
    this.loadMembers(1);
  }
  loadMembers(page = this.page()): void {
    this.membersRequest?.unsubscribe();
    this.page.set(page);
    this.membersLoading.set(true);
    this.membersError.set(null);
    this.membersRequest = this.cocktails
      .getPersonalCocktails({ folderId: this.id, page, pageSize: 24, search: this.appliedSearch })
      .pipe(
        takeUntil(this.routeReset),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.membersLoading.set(false)),
      )
      .subscribe({
        next: (result) => {
          this.members.set(result);
          if (!this.appliedSearch)
            this.folder.update((folder) =>
              folder ? { ...folder, cocktailCount: result.total } : null,
            );
          if (page > Math.max(result.totalPages, 1))
            this.loadMembers(Math.max(result.totalPages, 1));
        },
        error: (error: unknown) => this.membersError.set(folderError(error)),
      });
  }
  rename(): void {
    const folder = this.folder();
    if (!folder || this.busy()) return;
    const name = this.renameName().trim();
    this.actionError.set(null);
    this.success.set(null);
    if (!name || name.length > 80) {
      this.actionError.set('Le nom du dossier doit contenir entre 1 et 80 caractères.');
      return;
    }
    this.isMutating.set(true);
    this.folders
      .rename(folder.id, name, folder.version)
      .pipe(
        takeUntil(this.routeReset),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isMutating.set(false)),
      )
      .subscribe({
        next: (renamed) => {
          this.folder.set(renamed);
          this.renameName.set(renamed.name);
          this.success.set('Dossier renommé.');
        },
        error: (error: unknown) => this.actionError.set(folderError(error)),
      });
  }
  remove(): void {
    const folder = this.folder();
    if (!folder || this.busy()) return;
    this.actionError.set(null);
    this.metadataLoading.set(true);
    this.folders
      .deletionPreview(folder.id)
      .pipe(
        takeUntil(this.routeReset),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.metadataLoading.set(false)),
      )
      .subscribe({
        next: (preview) => this.confirmRemoval(preview),
        error: (error: unknown) => this.actionError.set(folderError(error)),
      });
  }
  private confirmRemoval(
    folder: import('../data-access/folder.models').FolderDeletionPreview,
  ): void {
    if (
      !window.confirm(
        `Supprimer le dossier « ${folder.name} » ? Les cocktails, leurs tags et leurs autres dossiers seront conservés.`,
      )
    )
      return;
    this.actionError.set(null);
    this.isMutating.set(true);
    this.folders
      .remove(folder.id, folder.version, folder.expectedMembershipToken)
      .pipe(
        takeUntil(this.routeReset),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isMutating.set(false)),
      )
      .subscribe({
        next: () => {
          void this.router.navigate(['/folders']);
        },
        error: (error: unknown) => this.actionError.set(folderError(error)),
      });
  }
  removeCocktail(id: string): void {
    const folder = this.folder();
    const recipe = this.members()?.items.find((item) => item.id === id);
    if (!folder || !recipe || this.busy() || this.membersLoading()) return;
    this.isMutating.set(true);
    this.actionError.set(null);
    this.success.set(null);
    this.folders
      .removeCocktail(folder.id, id, recipe.organizationVersion)
      .pipe(
        takeUntil(this.routeReset),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isMutating.set(false)),
      )
      .subscribe({
        next: (result) => {
          this.folder.update((value) =>
            value
              ? { ...value, cocktailCount: Math.max(0, value.cocktailCount - result.removed) }
              : null,
          );
          this.success.set(
            'Cocktail retiré de ce dossier. Sa recette et ses autres classements sont conservés.',
          );
          this.loadMembers();
          this.pickerRefresh.update((value) => value + 1);
        },
        error: (error: unknown) => this.actionError.set(folderError(error)),
      });
  }
  togglePicker(): void {
    if (this.busy()) return;
    this.pickerOpened.set(true);
    this.showPicker.update((value) => !value);
  }
  onAdded(result: { added: number }): void {
    this.folder.update((value) =>
      value ? { ...value, cocktailCount: value.cocktailCount + result.added } : null,
    );
    this.loadMembers();
    this.pickerRefresh.update((value) => value + 1);
  }
}
