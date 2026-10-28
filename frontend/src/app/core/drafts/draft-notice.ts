import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormDraft } from './form-draft';

@Component({
  selector: 'app-draft-notice',
  imports: [RouterLink],
  template: `
    @if (draft().candidate()) {
      <aside role="status" aria-label="Brouillon disponible">
        <p>
          Un brouillon de moins de 24 heures est disponible pour ce compte et cet espace. Il ne sera
          envoyé qu’après ton action explicite.
        </p>
        <button class="bb-button bb-button--primary" type="button" (click)="restore.emit()">
          Restaurer le brouillon
        </button>
        <button class="bb-button bb-button--danger" type="button" (click)="discard.emit()">
          Abandonner le brouillon
        </button>
      </aside>
    }
    @if (draft().invalid()) {
      <p role="status">Brouillon expiré ou incompatible : restauration impossible.</p>
    }
    @if (draft().store.memoryOnly()) {
      <p role="alert">
        Stockage navigateur indisponible ou saturé. La saisie reste en mémoire dans cet onglet ; une
        actualisation ou sa fermeture peut la perdre. La conservation pendant 24 heures n’est pas
        assurée.
      </p>
    }
    @if (draft().submissionBlocked()) {
      <p role="alert">
        Envoi bloqué : le navigateur empêche de protéger cette saisie en cas de réponse perdue.
        Autorise le stockage ou efface les données du site puis reconnecte-toi. Ta saisie reste en
        mémoire dans cet onglet.
      </p>
    }
    @if (draft().conflict()) {
      <p role="alert">
        {{
          controlledResolution()
            ? 'Un conflit a été détecté.'
            : 'Une version serveur plus récente existe.'
        }}
        Le brouillon est conservé, mais son envoi est bloqué.
        {{
          controlledResolution()
            ? 'Compare explicitement la recette serveur avant de repartir de cette version.'
            : conflictAdvice() || 'Recharge explicitement le classement pour le remplacer.'
        }}
      </p>
    }
    @if (draft().uncertain() && !draft().pending()) {
      <aside role="alert">
        <p>
          Résultat de la dernière opération inconnu.
          {{
            controlledResolution()
              ? 'Compare la recette serveur ; aucun renvoi de cette saisie ne sera automatique.'
              : 'Vérifie la bibliothèque ou recharge le classement avant tout nouvel envoi.'
          }}
        </p>
        <a
          class="bb-button bb-button--ghost"
          routerLink="/cocktails"
          [target]="libraryInSameTab() ? undefined : '_blank'"
          rel="noopener"
          >{{
            libraryInSameTab()
              ? 'Vérifier la bibliothèque de cet espace'
              : 'Vérifier ma bibliothèque dans un autre onglet'
          }}</a
        >
        @if (!controlledResolution()) {
          <button class="bb-button" type="button" (click)="draft().verifiedAbsent()">
            J’ai vérifié : autoriser un nouvel envoi
          </button>
        }
      </aside>
    }
    @if (draft().dirty() && !draft().candidate() && !draft().pending()) {
      @if (!draft().store.memoryOnly()) {
        <p role="status">
          Brouillon temporaire dans cet onglet, 24 heures maximum depuis la dernière saisie.
        </p>
      }
      @if (!controlledResolution() || (!draft().conflict() && !draft().uncertain())) {
        <button class="bb-button bb-button--danger" type="button" (click)="discard.emit()">
          Abandonner le brouillon
        </button>
      }
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      aside {
        padding: var(--space-4);
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-field);
        background: var(--color-surface);
        margin-block: var(--space-4);
      }
      p {
        max-width: 70ch;
        line-height: 1.65;
      }
      button,
      a {
        margin: var(--space-1);
        max-width: calc(100% - 0.5rem);
      }
    `,
  ],
})
export class DraftNotice {
  readonly controlledResolution = input(false);
  readonly conflictAdvice = input<string | null>(null);
  readonly libraryInSameTab = input(false);
  readonly draft = input.required<FormDraft>();
  readonly restore = output<void>();
  readonly discard = output<void>();
}
