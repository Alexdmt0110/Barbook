import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { finalize, Subscription } from 'rxjs';
import { FolderPage } from '../data-access/folder.models';
import { FoldersService } from '../data-access/folders.service';
import { folderError } from '../folder-errors';

@Component({
  selector: 'app-folder-index',
  imports: [RouterLink],
  templateUrl: './folder-index.html',
  styleUrl: '../folders.css',
})
export class FolderIndex implements OnInit {
  private readonly folders = inject(FoldersService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;
  private appliedSearch = '';
  readonly result = signal<FolderPage | null>(null);
  readonly page = signal(1);
  readonly searchTerm = signal('');
  readonly newName = signal('');
  readonly isLoading = signal(true);
  readonly isCreating = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  ngOnInit(): void {
    this.load();
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
    this.request = this.folders
      .browse({ page, search: this.appliedSearch })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (result) => {
          this.result.set(result);
          if (page > Math.max(result.totalPages, 1)) this.load(Math.max(result.totalPages, 1));
        },
        error: (error: unknown) => this.loadError.set(folderError(error)),
      });
  }
  create(): void {
    if (this.isCreating()) return;
    const name = this.newName().trim();
    this.actionError.set(null);
    if (!name || name.length > 80) {
      this.actionError.set('Le nom du dossier doit contenir entre 1 et 80 caractères.');
      return;
    }
    this.isCreating.set(true);
    this.folders
      .create(name)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isCreating.set(false)),
      )
      .subscribe({
        next: (folder) => {
          void this.router.navigate(['/folders', folder.id]);
        },
        error: (error: unknown) => this.actionError.set(folderError(error)),
      });
  }
}
