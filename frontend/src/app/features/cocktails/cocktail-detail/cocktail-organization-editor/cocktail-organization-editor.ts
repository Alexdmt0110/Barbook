import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  HostListener,
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
import { finalize, forkJoin, Subscription } from 'rxjs';
import {
  CocktailOrganizationResult,
  CocktailSummaryFolder,
  CocktailSummaryTag,
} from '../../data-access/cocktail.models';
import { CocktailsService } from '../../data-access/cocktails.service';
import { DraftStore } from '../../../../core/drafts/draft-store.service';
import { FormDraft } from '../../../../core/drafts/form-draft';
import { DraftNotice } from '../../../../core/drafts/draft-notice';
import { isOrganizationDraft } from './organization.draft';
import { FoldersService } from '../../../folders/data-access/folders.service';

@Component({
  selector: 'app-cocktail-organization-editor',
  imports: [DraftNotice],
  templateUrl: './cocktail-organization-editor.html',
  styleUrl: './cocktail-organization-editor.css',
})
export class CocktailOrganizationEditor implements OnInit, OnChanges {
  private readonly draftStore = inject(DraftStore);
  draft!: FormDraft;
  readonly cocktailId = input.required<string>();
  private readonly cocktailsService = inject(CocktailsService);
  private readonly foldersService = inject(FoldersService);
  private readonly destroyRef = inject(DestroyRef);
  private catalogRequest?: Subscription;
  private appliedFolderSearch = '';
  private readonly version = signal(0);
  private readonly knownFolders = signal<CocktailSummaryFolder[]>([]);
  readonly slug = input.required<string>();
  readonly folders = input<readonly CocktailSummaryFolder[]>([]);
  readonly organizationVersion = input.required<number>();
  readonly tags = input<readonly CocktailSummaryTag[]>([]);
  readonly organizationUpdated = output<CocktailOrganizationResult>();
  readonly availableFolders = signal<CocktailSummaryFolder[]>([]);
  readonly availableTags = signal<CocktailSummaryTag[]>([]);
  readonly selectedFolderIds = signal<string[]>([]);
  readonly selectedTagNames = signal<string[]>([]);
  readonly selectedFolders = computed(() =>
    this.knownFolders().filter((folder) => this.selectedFolderIds().includes(folder.id)),
  );
  readonly newFolderName = signal('');
  readonly newTagName = signal('');
  readonly folderSearch = signal('');
  readonly folderPage = signal(1);
  readonly folderTotalPages = signal(0);
  readonly isLoadingCatalog = signal(true);
  readonly isCreatingFolder = signal(false);
  readonly isSaving = signal(false);
  readonly isReloading = signal(false);
  readonly hasConflict = signal(false);
  readonly busy = computed(() => this.isCreatingFolder() || this.isSaving() || this.isReloading());
  readonly catalogErrorMessage = signal<string | null>(null);
  readonly actionErrorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cocktailId']) {
      this.draft = new FormDraft(
        this.draftStore,
        'organization:' + this.cocktailId(),
        this.organizationVersion(),
        isOrganizationDraft,
      );
    }
    if (changes['slug'] || changes['organizationVersion']) {
      if (this.draft?.dirty()) {
        this.hasConflict.set(true);
        this.draft.conflict.set(true);
        return;
      }
      this.version.set(this.organizationVersion());
      this.selectedFolderIds.set(this.folders().map((folder) => folder.id));
      this.knownFolders.set(this.mergeFolders(this.knownFolders(), this.folders()));
      this.selectedTagNames.set(this.tags().map((tag) => tag.name));
    }
  }
  ngOnInit(): void {
    this.loadCatalogs();
  }

  private draftValue() {
    return {
      folderIds: [...this.selectedFolderIds()],
      folders: this.selectedFolders(),
      tagNames: [...this.selectedTagNames()],
      newFolderName: this.newFolderName(),
      newTagName: this.newTagName(),
    };
  }
  private captureDraft(): void {
    this.draft.capture(this.draftValue());
  }
  restoreDraft(): void {
    const value = this.draft.restore();
    if (!isOrganizationDraft(value)) return;
    this.selectedFolderIds.set(value.folderIds);
    this.knownFolders.set(this.mergeFolders(this.knownFolders(), value.folders));
    this.selectedTagNames.set(value.tagNames);
    this.newFolderName.set(value.newFolderName);
    this.newTagName.set(value.newTagName);
    this.hasConflict.set(this.draft.conflict());
  }
  discardDraft(): void {
    this.draft.succeeded(this.organizationVersion());
    this.version.set(this.organizationVersion());
    this.selectedFolderIds.set(this.folders().map((folder) => folder.id));
    this.selectedTagNames.set(this.tags().map((tag) => tag.name));
    this.newFolderName.set('');
    this.newTagName.set('');
    this.hasConflict.set(false);
  }
  canLeave(): boolean {
    return this.draft?.canLeave() ?? true;
  }
  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    this.draft?.beforeUnload(event);
  }

  loadCatalogs(page = this.folderPage()): void {
    this.catalogRequest?.unsubscribe();
    if (page === 1) this.appliedFolderSearch = this.folderSearch().trim();
    this.folderPage.set(page);
    this.isLoadingCatalog.set(true);
    this.catalogErrorMessage.set(null);
    this.catalogRequest = forkJoin({
      folders: this.foldersService.browse({ page, search: this.appliedFolderSearch, pageSize: 25 }),
      tags: this.cocktailsService.getPersonalTags(),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoadingCatalog.set(false)),
      )
      .subscribe({
        next: ({ folders, tags }) => {
          this.availableFolders.set(folders.items);
          this.knownFolders.set(this.mergeFolders(this.knownFolders(), folders.items));
          this.folderTotalPages.set(folders.totalPages);
          this.availableTags.set(this.mergeTags(tags, this.tags()));
        },
        error: (error: unknown) => this.catalogErrorMessage.set(this.resolveError(error, 'load')),
      });
  }

  toggleFolder(id: string, event: Event): void {
    if (!(event.target instanceof HTMLInputElement)) return;
    if (event.target.checked && this.selectedFolderIds().length >= 1000) {
      event.target.checked = false;
      this.actionErrorMessage.set('La sauvegarde complète accepte au plus 1000 dossiers.');
      return;
    }
    this.selectedFolderIds.update((ids) =>
      event.target instanceof HTMLInputElement && event.target.checked
        ? [...new Set([...ids, id])]
        : ids.filter((value) => value !== id),
    );
    this.clearFeedback();
    this.captureDraft();
  }
  removeFolder(id: string): void {
    this.selectedFolderIds.update((ids) => ids.filter((value) => value !== id));
    this.clearFeedback();
    this.captureDraft();
  }
  onNewFolderNameChange(event: Event): void {
    if (event.target instanceof HTMLInputElement) this.newFolderName.set(event.target.value);
    this.clearFeedback();
    this.captureDraft();
  }
  createFolder(): void {
    if (this.busy()) return;
    this.clearFeedback();
    const name = this.newFolderName().trim();
    if (!name || name.length > 80) {
      this.actionErrorMessage.set('Le nom du dossier doit contenir entre 1 et 80 caractères.');
      return;
    }
    if (this.selectedFolderIds().length >= 1000) {
      this.actionErrorMessage.set('La sauvegarde complète accepte au plus 1000 dossiers.');
      return;
    }
    if (!this.draft.begin(this.draftValue())) return;
    this.isCreatingFolder.set(true);
    this.foldersService
      .create(name)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isCreatingFolder.set(false)),
      )
      .subscribe({
        next: (folder) => {
          this.availableFolders.set(this.mergeFolders(this.availableFolders(), [folder]));
          this.knownFolders.set(this.mergeFolders(this.knownFolders(), [folder]));
          this.selectedFolderIds.update((ids) => [...ids, folder.id]);
          this.newFolderName.set('');
          this.draft.folderSucceeded();
          this.captureDraft();
          this.successMessage.set(
            'Dossier créé et sélectionné. Enregistre l’organisation pour l’assigner au cocktail.',
          );
        },
        error: (error: unknown) => {
          this.draft.rejected(error);
          this.actionErrorMessage.set(this.resolveError(error, 'folder'));
        },
      });
  }
  onNewTagNameChange(event: Event): void {
    if (event.target instanceof HTMLInputElement) this.newTagName.set(event.target.value);
    this.clearFeedback();
    this.captureDraft();
  }
  addTag(): void {
    this.clearFeedback();
    const name = this.newTagName().trim();
    if (!name || name.length > 40) {
      this.actionErrorMessage.set('Le nom du tag doit contenir entre 1 et 40 caractères.');
      return;
    }
    if (this.isTagSelected(name)) {
      this.newTagName.set('');
      this.captureDraft();
      return;
    }
    if (this.selectedTagNames().length >= 20) {
      this.actionErrorMessage.set('Un cocktail peut avoir au maximum 20 tags.');
      return;
    }
    this.selectedTagNames.update((names) => [...names, name]);
    this.newTagName.set('');
    this.captureDraft();
  }
  toggleTag(name: string, event: Event): void {
    if (!(event.target instanceof HTMLInputElement)) return;
    if (!event.target.checked) {
      this.removeTag(name);
      return;
    }
    this.clearFeedback();
    if (!this.isTagSelected(name) && this.selectedTagNames().length < 20)
      this.selectedTagNames.update((names) => [...names, name]);
    else if (!this.isTagSelected(name))
      this.actionErrorMessage.set('Un cocktail peut avoir au maximum 20 tags.');
    event.target.checked = this.isTagSelected(name);
    this.captureDraft();
  }
  removeTag(name: string): void {
    this.selectedTagNames.update((names) =>
      names.filter((value) => !this.sameTagName(value, name)),
    );
    this.clearFeedback();
    this.captureDraft();
  }
  isTagSelected(name: string): boolean {
    return this.selectedTagNames().some((value) => this.sameTagName(value, name));
  }

  saveOrganization(): void {
    if (this.busy() || this.hasConflict()) return;
    this.clearFeedback();
    if (this.selectedFolderIds().length > 1000) {
      this.actionErrorMessage.set(
        'La sauvegarde complète accepte au plus 1000 dossiers. Gère les liens depuis leurs pages.',
      );
      return;
    }
    if (!this.draft.begin(this.draftValue())) return;
    this.isSaving.set(true);
    this.cocktailsService
      .updatePersonalCocktailOrganization(this.slug(), {
        folderIds: [...this.selectedFolderIds()],
        tagNames: [...this.selectedTagNames()],
        expectedVersion: this.version(),
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSaving.set(false)),
      )
      .subscribe({
        next: (result) => {
          this.draft.succeeded(result.organizationVersion);
          this.applyOrganization(result);
          this.successMessage.set('Organisation enregistrée.');
        },
        error: (error: unknown) => {
          this.draft.rejected(error);
          this.hasConflict.set(error instanceof HttpErrorResponse && error.status === 409);
          this.actionErrorMessage.set(this.resolveError(error, 'save'));
        },
      });
  }
  reloadOrganization(): void {
    if (this.busy()) return;
    this.isReloading.set(true);
    this.cocktailsService
      .getPersonalCocktail(this.slug())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isReloading.set(false)),
      )
      .subscribe({
        next: (result) => {
          if (result.id !== this.cocktailId()) {
            this.actionErrorMessage.set('La recette a changé. Recharge la page.');
            return;
          }
          this.draft.succeeded(result.organizationVersion);
          this.applyOrganization(result);
          this.newFolderName.set('');
          this.newTagName.set('');
          this.clearFeedback();
          this.successMessage.set('Classement rechargé. Tu peux modifier cette version.');
        },
        error: (error: unknown) => this.actionErrorMessage.set(this.resolveError(error, 'save')),
      });
  }
  private applyOrganization(result: CocktailOrganizationResult): void {
    this.selectedFolderIds.set(result.folders.map((folder) => folder.id));
    this.selectedTagNames.set(result.tags.map((tag) => tag.name));
    this.version.set(result.organizationVersion);
    this.knownFolders.set(this.mergeFolders(this.knownFolders(), result.folders));
    this.availableTags.set(this.mergeTags(this.availableTags(), result.tags));
    this.hasConflict.set(false);
    this.organizationUpdated.emit(result);
  }
  private mergeFolders(
    folders: readonly CocktailSummaryFolder[],
    extra: readonly CocktailSummaryFolder[],
  ): CocktailSummaryFolder[] {
    return [...new Map([...folders, ...extra].map((folder) => [folder.id, folder])).values()].sort(
      (a, b) => a.name.localeCompare(b.name, 'fr') || a.id.localeCompare(b.id),
    );
  }
  private mergeTags(
    tags: readonly CocktailSummaryTag[],
    extra: readonly CocktailSummaryTag[],
  ): CocktailSummaryTag[] {
    return [...new Map([...tags, ...extra].map((tag) => [tag.id, tag])).values()].sort(
      (a, b) => a.name.localeCompare(b.name, 'fr') || a.id.localeCompare(b.id),
    );
  }
  private sameTagName(left: string, right: string): boolean {
    return left.localeCompare(right, 'fr', { sensitivity: 'base' }) === 0;
  }
  private clearFeedback(): void {
    this.actionErrorMessage.set(null);
    this.successMessage.set(null);
  }
  private resolveError(error: unknown, context: 'load' | 'folder' | 'save'): string {
    if (!(error instanceof HttpErrorResponse)) return 'Une erreur inattendue est survenue.';
    if (error.status === 0) return 'Impossible de joindre Barbook.';
    if (error.status === 401) return 'Ta session n’est plus valide. Reconnecte-toi pour continuer.';
    if (context === 'folder' && error.status === 409)
      return 'Un dossier portant ce nom existe déjà.';
    if (context === 'save' && error.status === 409)
      return 'Le classement a été modifié ailleurs. Ton brouillon est conservé.';
    if (error.status === 404) return 'Ce cocktail n’est plus disponible.';
    if (error.status === 400) return 'Les informations d’organisation envoyées sont invalides.';
    if (context === 'load') return 'Impossible de charger les dossiers et les tags.';
    return context === 'folder'
      ? 'Impossible de créer ce dossier pour le moment.'
      : 'Impossible d’enregistrer l’organisation pour le moment.';
  }
}
