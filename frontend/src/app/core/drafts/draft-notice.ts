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
        <button type="button" (click)="restore.emit()">Restaurer le brouillon</button>
        <button type="button" (click)="discard.emit()">Abandonner le brouillon</button>
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
        Une version serveur plus récente existe. Le brouillon est conservé, mais son envoi est
        bloqué. Recharge explicitement le classement pour le remplacer.
      </p>
    }
    @if (draft().uncertain() && !draft().pending()) {
      <aside role="alert">
        <p>
          Résultat de la dernière opération inconnu. Vérifie la bibliothèque ou recharge le
          classement avant tout nouvel envoi.
        </p>
        <a routerLink="/cocktails" target="_blank" rel="noopener"
          >Vérifier ma bibliothèque dans un autre onglet</a
        >
        <button type="button" (click)="draft().verifiedAbsent()">
          J’ai vérifié : autoriser un nouvel envoi
        </button>
      </aside>
    }
    @if (
      draft().dirty() && !draft().candidate() && !draft().pending() && !draft().store.memoryOnly()
    ) {
      <p role="status">
        Brouillon temporaire dans cet onglet, 24 heures maximum depuis la dernière saisie.
      </p>
      <button type="button" (click)="discard.emit()">Abandonner le brouillon</button>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      aside {
        padding: 1rem;
        border: 1px solid currentColor;
        margin-block: 1rem;
      }
      button,
      a {
        margin: 0.25rem;
      }
    `,
  ],
})
export class DraftNotice {
  readonly draft = input.required<FormDraft>();
  readonly restore = output<void>();
  readonly discard = output<void>();
}
