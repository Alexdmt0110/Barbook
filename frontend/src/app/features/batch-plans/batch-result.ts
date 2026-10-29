import { Component, input } from '@angular/core';
import { BatchPreview, Quantity } from './batch-api';
/** Render the server's exact fractions; never make rounded display values into new source quantities. */
@Component({
  selector: 'app-batch-result',
  template: `
    <section aria-label="Quantités du plan">
      <h2>Quantités prévues</h2>
      <p>
        Version de recette {{ result().snapshot.recipe.contentVersion }} · facteur exact
        {{ quantity(result().calculation.factor) }}.
      </p>
      <p>{{ result().calculation.completePortions }} portion(s) complète(s) de base.</p>
      @if (result().calculation.baseVolumeMl; as volume) {
        <p>
          Volume de base obtenu : {{ quantity(volume) }} mL.
          @if (result().calculation.remainingMl; as rest) {
            Reste de base : {{ quantity(rest) }} mL.
          }
        </p>
      } @else {
        <p>
          Volume de base inconnu ou non sommable : aucune conversion de masse ou de mesure
          qualitative en mL.
        </p>
      }
      @if (result().calculation.targetVolumeMl; as target) {
        <p>
          Cible : {{ quantity(target) }} mL ; écart après arrondi :
          {{ quantity(result().calculation.volumeDifferenceMl) }} mL. Les ajouts au service sont
          calculés pour les portions complètes du volume obtenu.
        </p>
      }
      <h3>Ingrédients : base et service</h3>
      <ul>
        @for (line of result().calculation.ingredients; track line.position) {
          <li>
            <strong>{{ line.ingredientName }}</strong> · {{ line.included ? 'Base' : 'Au service' }}
            <p>
              Par portion : {{ line.originalAmount === null ? 'inconnue' : line.originalAmount }}
              {{ line.unit }}.
              @if (line.unknown) {
                {{
                  line.unknown === 'TOP_UP'
                    ? 'Compléter au service — quantité inconnue.'
                    : 'Quantité ou unité inconnue — aucun zéro supposé.'
                }}
              } @else {
                Exact : {{ quantity(line.exact) }} {{ line.unit }} ; à mesurer :
                {{ quantity(line.rounded) }} {{ line.unit }} ; écart : {{ quantity(line.delta) }}
                {{ line.unit }}.
                @if (line.ratio) {
                  Ratio de base dans cette unité : {{ quantity(line.ratio) }}.
                }
              }
            </p>
          </li>
        }
      </ul>
      <h3>Garnitures au service</h3>
      @if (!result().calculation.garnishes.length) {
        <p>Aucune garniture dans ce snapshot.</p>
      }
      <ul>
        @for (line of result().calculation.garnishes; track line.position) {
          <li>
            {{ line.ingredientName }} ·
            @if (line.unknown) {
              Quantité inconnue.
            } @else {
              exact {{ quantity(line.exact) }} {{ line.unit }} ; à mesurer
              {{ quantity(line.rounded) }} {{ line.unit }} ; écart {{ quantity(line.delta) }}
              {{ line.unit }}.
            }
          </li>
        }
      </ul>
      <p>
        Aucune dilution ni durée de conservation calculée. Ce plan n’est pas une preuve de
        fabrication et ne modifie jamais l’inventaire.
      </p>
    </section>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    p,
    li {
      line-height: 1.5;
      overflow-wrap: anywhere;
    }
    li {
      margin-block: 1rem;
    }
    ul {
      padding-left: 1.5rem;
    }
  `,
})
export class BatchResult {
  readonly result = input.required<BatchPreview>();
  quantity(value: Quantity | null): string {
    if (!value) return 'inconnu';
    return value.denominator === '1' ? value.numerator : `${value.numerator}/${value.denominator}`;
  }
}
