import { Component, input } from '@angular/core';
import { CocktailContentSnapshot } from '../data-access/cocktail-content.models';
import {
  COCKTAIL_TYPE_OPTIONS,
  INGREDIENT_UNIT_OPTIONS,
  RECIPE_METHOD_OPTIONS,
} from '../cocktail-create/cocktail-create.options';

@Component({
  selector: 'app-cocktail-content-preview',
  template: `
    <section aria-label="Version serveur en lecture seule">
      <h2>Version serveur vérifiée</h2>
      <p>
        Ta saisie reste dans le formulaire. Cette lecture ne l'envoie pas et ne la remplace pas.
      </p>
      @let c = snapshot().content;
      <dl>
        <dt>Nom</dt>
        <dd>{{ c.name }}</dd>
        <dt>Type</dt>
        <dd>{{ label(types, c.type) }}</dd>
        <dt>Famille</dt>
        <dd>{{ c.family || 'Non renseignée' }}</dd>
        <dt>Méthode</dt>
        <dd>{{ label(methods, c.method) }}</dd>
        <dt>Verre</dt>
        <dd>{{ c.glass }}</dd>
        <dt>Glace</dt>
        <dd>{{ c.ice || 'Non renseignée' }}</dd>
        <dt>Alcool principal</dt>
        <dd>{{ c.mainAlcoholName || 'Aucun' }}</dd>
        <dt>Notes</dt>
        <dd>{{ c.notes || 'Aucune' }}</dd>
      </dl>
      <h3>Ingrédients, dans l'ordre</h3>
      <ol>
        @for (i of c.ingredients; track $index) {
          <li>
            {{ i.ingredientName }} — {{ i.amount ?? 'Selon besoin' }} {{ label(units, i.unit) }}
            <p>{{ i.specification }} {{ i.notes }}</p>
            <p>
              {{
                i.abvMode === 'UNKNOWN'
                  ? 'Degré explicitement inconnu'
                  : i.abvMode === 'OVERRIDE'
                    ? 'Remplacement pour cette recette : ' + i.abvOverride + ' %'
                    : 'Héritage du catalogue : ' +
                      (i.ingredientDefaultAbv === null ? 'inconnu' : i.ingredientDefaultAbv + ' %')
              }}
            </p>
          </li>
        }
      </ol>
      <h3>Garnitures, dans l'ordre</h3>
      <ol>
        @for (g of c.garnishes; track $index) {
          <li>
            {{ g.ingredientName }} — {{ g.amount ?? 'Selon besoin' }}
            {{ g.unit ? label(units, g.unit) : '' }}. {{ g.specification }} {{ g.usage }}
          </li>
        }
      </ol>
      <h3>Préparation</h3>
      <ol>
        @for (step of c.steps; track $index) {
          <li>{{ step }}</li>
        }
      </ol>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        overflow-wrap: anywhere;
      }
      dd,
      li {
        white-space: pre-wrap;
      }
      dt {
        font-weight: 700;
        margin-top: 0.5rem;
      }
      dd {
        margin-inline-start: 1rem;
      }
    `,
  ],
})
export class CocktailContentPreview {
  readonly snapshot = input.required<CocktailContentSnapshot>();
  readonly types = COCKTAIL_TYPE_OPTIONS;
  readonly methods = RECIPE_METHOD_OPTIONS;
  readonly units = INGREDIENT_UNIT_OPTIONS;
  label(options: readonly { value: string; label: string }[], value: string): string {
    return options.find((o) => o.value === value)?.label ?? value;
  }
}
