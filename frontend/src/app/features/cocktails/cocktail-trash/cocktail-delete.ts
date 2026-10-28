import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LifecycleAction } from './lifecycle-action';

@Component({
  selector: 'app-cocktail-delete',
  imports: [RouterLink, LifecycleAction],
  styleUrl: '../../folders/folders.css',
  template: `<section class="folders-page">
    <a routerLink="/cocktails">Retour à mes cocktails</a>
    <h1>Mettre en corbeille</h1>
    <p>
      La recette quittera les listes et les dossiers actifs. Sa récupération reste possible pendant
      30 jours.
    </p>
    @if (id()) {
      <app-lifecycle-action [recipeId]="id()" [autoPrepare]="true" />
    }
  </section>`,
})
export class CocktailDelete implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly id = signal('');
  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => this.id.set(params.get('id') ?? ''));
  }
}
