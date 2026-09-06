import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { finalize, forkJoin } from 'rxjs';
import {
  CocktailOrganizationResult,
  CocktailSummaryFolder,
  CocktailSummaryTag,
} from '../../data-access/cocktail.models';
import { CocktailsService } from '../../data-access/cocktails.service';

const MAX_FOLDER_NAME_LENGTH = 80;
const MAX_TAG_NAME_LENGTH = 40;
const MAX_TAGS_PER_COCKTAIL = 20;

@Component({
  selector: 'app-cocktail-organization-editor',
  templateUrl: './cocktail-organization-editor.html',
  styleUrl: './cocktail-organization-editor.css',
})
export class CocktailOrganizationEditor implements OnInit {
  private readonly cocktailsService = inject(CocktailsService);

  readonly slug = input.required<string>();

  readonly folder = input<CocktailSummaryFolder | null>(null);

  readonly tags = input<readonly CocktailSummaryTag[]>([]);

  readonly organizationUpdated = output<CocktailOrganizationResult>();

  readonly availableFolders = signal<CocktailSummaryFolder[]>([]);

  readonly availableTags = signal<CocktailSummaryTag[]>([]);

  readonly selectedFolderId = signal<string | null>(null);

  readonly selectedTagNames = signal<string[]>([]);

  readonly newFolderName = signal('');

  readonly newTagName = signal('');

  readonly isLoadingCatalog = signal(true);

  readonly isCreatingFolder = signal(false);

  readonly isSaving = signal(false);

  readonly catalogErrorMessage = signal<string | null>(null);

  readonly actionErrorMessage = signal<string | null>(null);

  readonly successMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.resetSelectionFromInputs();
    this.loadCatalogs();
  }

  loadCatalogs(): void {
    this.isLoadingCatalog.set(true);
    this.catalogErrorMessage.set(null);

    forkJoin({
      folders: this.cocktailsService.getPersonalFolders(),
      tags: this.cocktailsService.getPersonalTags(),
    })
      .pipe(
        finalize(() => {
          this.isLoadingCatalog.set(false);
        }),
      )
      .subscribe({
        next: ({ folders, tags }) => {
          this.availableFolders.set(this.mergeFolders(folders, this.folder()));

          this.availableTags.set(this.mergeTags(tags, this.tags()));
        },
        error: (error: unknown) => {
          this.catalogErrorMessage.set(this.resolveError(error, 'load'));
        },
      });
  }

  onFolderChange(event: Event): void {
    const target = event.target;

    if (!(target instanceof HTMLSelectElement)) {
      return;
    }

    this.selectedFolderId.set(target.value || null);

    this.clearActionFeedback();
  }

  onNewFolderNameChange(event: Event): void {
    const target = event.target;

    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    this.newFolderName.set(target.value);
    this.clearActionFeedback();
  }

  createFolder(): void {
    const name = this.newFolderName().trim();

    this.clearActionFeedback();

    if (name.length === 0 || name.length > MAX_FOLDER_NAME_LENGTH) {
      this.actionErrorMessage.set('Le nom du dossier doit contenir entre 1 et 80 caractères.');

      return;
    }

    this.isCreatingFolder.set(true);

    this.cocktailsService
      .createPersonalFolder({
        name,
      })
      .pipe(
        finalize(() => {
          this.isCreatingFolder.set(false);
        }),
      )
      .subscribe({
        next: (folder) => {
          this.availableFolders.set(this.mergeFolders(this.availableFolders(), folder));

          this.selectedFolderId.set(folder.id);

          this.newFolderName.set('');

          this.successMessage.set(
            'Dossier créé et sélectionné. Enregistre l’organisation pour l’assigner au cocktail.',
          );
        },
        error: (error: unknown) => {
          this.actionErrorMessage.set(this.resolveError(error, 'folder'));
        },
      });
  }

  onNewTagNameChange(event: Event): void {
    const target = event.target;

    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    this.newTagName.set(target.value);
    this.clearActionFeedback();
  }

  addTag(): void {
    const name = this.newTagName().trim();

    this.clearActionFeedback();

    if (name.length === 0 || name.length > MAX_TAG_NAME_LENGTH) {
      this.actionErrorMessage.set('Le nom du tag doit contenir entre 1 et 40 caractères.');

      return;
    }

    if (this.isTagSelected(name)) {
      this.newTagName.set('');
      return;
    }

    if (this.selectedTagNames().length >= MAX_TAGS_PER_COCKTAIL) {
      this.actionErrorMessage.set('Un cocktail peut avoir au maximum 20 tags.');

      return;
    }

    this.selectedTagNames.update((tagNames) => [...tagNames, name]);

    this.newTagName.set('');
  }

  toggleTag(tagName: string, event: Event): void {
    const target = event.target;

    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    this.clearActionFeedback();

    if (target.checked) {
      if (this.isTagSelected(tagName)) {
        return;
      }

      if (this.selectedTagNames().length >= MAX_TAGS_PER_COCKTAIL) {
        target.checked = false;

        this.actionErrorMessage.set('Un cocktail peut avoir au maximum 20 tags.');

        return;
      }

      this.selectedTagNames.update((tagNames) => [...tagNames, tagName]);

      return;
    }

    this.removeTag(tagName);
  }

  removeTag(tagName: string): void {
    this.selectedTagNames.update((tagNames) =>
      tagNames.filter((selectedTagName) => !this.sameTagName(selectedTagName, tagName)),
    );

    this.clearActionFeedback();
  }

  isTagSelected(tagName: string): boolean {
    return this.selectedTagNames().some((selectedTagName) =>
      this.sameTagName(selectedTagName, tagName),
    );
  }

  saveOrganization(): void {
    this.clearActionFeedback();

    this.isSaving.set(true);

    this.cocktailsService
      .updatePersonalCocktailOrganization(this.slug(), {
        folderId: this.selectedFolderId(),
        tagNames: [...this.selectedTagNames()],
      })
      .pipe(
        finalize(() => {
          this.isSaving.set(false);
        }),
      )
      .subscribe({
        next: (organization) => {
          this.selectedFolderId.set(organization.folder?.id ?? null);

          this.selectedTagNames.set(organization.tags.map((tag) => tag.name));

          this.availableFolders.set(
            this.mergeFolders(this.availableFolders(), organization.folder),
          );

          this.availableTags.set(this.mergeTags(this.availableTags(), organization.tags));

          this.successMessage.set('Organisation enregistrée.');

          this.organizationUpdated.emit(organization);
        },
        error: (error: unknown) => {
          this.actionErrorMessage.set(this.resolveError(error, 'save'));
        },
      });
  }

  private resetSelectionFromInputs(): void {
    this.selectedFolderId.set(this.folder()?.id ?? null);

    this.selectedTagNames.set(this.tags().map((tag) => tag.name));
  }

  private mergeFolders(
    folders: readonly CocktailSummaryFolder[],
    additionalFolder: CocktailSummaryFolder | null,
  ): CocktailSummaryFolder[] {
    const foldersById = new Map<string, CocktailSummaryFolder>();

    for (const folder of folders) {
      foldersById.set(folder.id, folder);
    }

    if (additionalFolder) {
      foldersById.set(additionalFolder.id, additionalFolder);
    }

    return [...foldersById.values()].sort((left, right) => {
      const nameComparison = left.name.localeCompare(right.name, 'fr', {
        sensitivity: 'base',
      });

      return nameComparison !== 0 ? nameComparison : left.id.localeCompare(right.id);
    });
  }

  private mergeTags(
    tags: readonly CocktailSummaryTag[],
    additionalTags: readonly CocktailSummaryTag[] | CocktailSummaryTag,
  ): CocktailSummaryTag[] {
    const tagsById = new Map<string, CocktailSummaryTag>();

    for (const tag of tags) {
      tagsById.set(tag.id, tag);
    }

    const tagsToMerge = Array.isArray(additionalTags) ? additionalTags : [additionalTags];

    for (const tag of tagsToMerge) {
      tagsById.set(tag.id, tag);
    }

    return [...tagsById.values()].sort((left, right) => {
      const nameComparison = left.name.localeCompare(right.name, 'fr', {
        sensitivity: 'base',
      });

      return nameComparison !== 0 ? nameComparison : left.id.localeCompare(right.id);
    });
  }

  private sameTagName(left: string, right: string): boolean {
    return (
      left.localeCompare(right, 'fr', {
        sensitivity: 'base',
      }) === 0
    );
  }

  private clearActionFeedback(): void {
    this.actionErrorMessage.set(null);
    this.successMessage.set(null);
  }

  private resolveError(error: unknown, context: 'load' | 'folder' | 'save'): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'Une erreur inattendue est survenue.';
    }

    if (error.status === 0) {
      return 'Impossible de joindre Barbook.';
    }

    if (error.status === 401) {
      return 'Ta session n’est plus valide. Reconnecte-toi pour continuer.';
    }

    if (context === 'folder' && error.status === 409) {
      return 'Un dossier portant ce nom existe déjà.';
    }

    if (context === 'save' && error.status === 404) {
      return 'Ce cocktail n’est plus disponible.';
    }

    if (error.status === 400) {
      return 'Les informations d’organisation envoyées sont invalides.';
    }

    if (context === 'load') {
      return 'Impossible de charger les dossiers et les tags.';
    }

    if (context === 'folder') {
      return 'Impossible de créer ce dossier pour le moment.';
    }

    return 'Impossible d’enregistrer l’organisation pour le moment.';
  }
}
