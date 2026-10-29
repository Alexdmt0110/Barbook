import {
  calculateBatch,
  BatchCalculationError,
  BatchLine,
  BatchParameters,
} from './batch-calculation';
import { Rational } from './rational';
const line = (
  amount: number | null,
  unit: BatchLine['unit'] = 'ML',
): BatchLine => ({ ingredientName: 'Test', amount, unit });
const recipe = [line(45), line(15), line(30)];
const parameters = (
  changes: Partial<BatchParameters> = {},
): BatchParameters => ({
  mode: 'VOLUME_ML',
  target: 1000,
  includedPositions: [0, 1],
  rounding: [],
  ...changes,
});
const q = (n: number, d = 1) => ({
  numerator: String(n),
  denominator: String(d),
});
describe('Autonomous batch calculation', () => {
  it('keeps the 1 litre base separate from 16 service additions and its 40 mL remainder', () => {
    const result = calculateBatch(recipe, [line(1, 'PIECE')], parameters());
    expect(result.factor).toEqual(q(50, 3));
    expect(result.ingredients.map((l) => l.exact)).toEqual([
      q(750),
      q(250),
      q(480),
    ]);
    expect(result.completePortions).toBe('16');
    expect(result.remainingMl).toEqual(q(40));
    expect(result.baseVolumeMl).toEqual(q(1000));
    expect(result.garnishes[0].exact).toEqual(q(16));
  });
  it('scales from the original for fractions and a return to one portion without re-rounding', () => {
    for (const [target, expected] of [
      [12, 540],
      [1, 45],
      [0.5, 22.5],
    ]) {
      const r = calculateBatch(
        recipe,
        [],
        parameters({ mode: 'PORTIONS', target }),
      );
      expect(r.ingredients[0].exact).toEqual(Rational.decimal(expected).json());
    }
  });
  it('shows zero complete servings and a positive remainder below a portion', () => {
    const r = calculateBatch(recipe, [], parameters({ target: 30 }));
    expect(r.completePortions).toBe('0');
    expect(r.remainingMl).toEqual(q(30));
    expect(r.ingredients[2].exact).toEqual(q(0));
  });
  it('retains TOP_UP, unknown and distinct mass/qualitative units without a fake volume', () => {
    const r = calculateBatch(
      [line(2, 'G'), line(null, 'TOP_UP'), line(null), line(1, 'LEAF')],
      [],
      parameters({ mode: 'PORTIONS', target: 12, includedPositions: [0] }),
    );
    expect(r.baseVolumeMl).toBeNull();
    expect(r.ingredients[0].exact).toEqual(q(24));
    expect(r.ingredients[1]).toMatchObject({ exact: null, unknown: 'TOP_UP' });
    expect(r.ingredients[2]).toMatchObject({
      exact: null,
      unknown: 'UNKNOWN_AMOUNT',
    });
    expect(r.ingredients[3].exact).toEqual(q(12));
    expect(() =>
      calculateBatch(
        [line(2, 'G')],
        [],
        parameters({ includedPositions: [0] }),
      ),
    ).toThrow(BatchCalculationError);
  });
  it('exposes rounding effects on actual volume, ratios, complete portions and service quantities', () => {
    const r = calculateBatch(
      recipe,
      [],
      parameters({ target: 101, rounding: [{ unit: 'ML', step: 10 }] }),
    );
    expect(r.ingredients[0]).toMatchObject({
      exact: q(303, 4),
      rounded: q(80),
      delta: q(17, 4),
      ratio: q(8, 11),
    });
    expect(r.ingredients[1]).toMatchObject({
      exact: q(101, 4),
      rounded: q(30),
    });
    expect(r.baseVolumeMl).toEqual(q(110));
    expect(r.volumeDifferenceMl).toEqual(q(9));
    expect(r.remainingMl).toEqual(q(50));
    expect(r.ingredients[2].exact).toEqual(q(30));
    expect(new Rational(5n, 2n).round(new Rational(1n)).json()).toEqual(q(3));
  });
  it.each([0, -1, NaN, Infinity, 0.0001, 1000001])(
    'rejects an invalid volume target %s',
    (target) => {
      expect(() => calculateBatch(recipe, [], parameters({ target }))).toThrow(
        BatchCalculationError,
      );
    },
  );
  it('rejects empty/duplicate/foreign selection, TOP_UP inclusion and lossy steps', () => {
    for (const includedPositions of [[], [0, 0], [3], [-1], [0.5]])
      expect(() =>
        calculateBatch(recipe, [], parameters({ includedPositions })),
      ).toThrow(BatchCalculationError);
    expect(() =>
      calculateBatch(
        [line(null, 'TOP_UP')],
        [],
        parameters({ includedPositions: [0] }),
      ),
    ).toThrow(BatchCalculationError);
    expect(() =>
      calculateBatch(
        recipe,
        [],
        parameters({ target: 1, rounding: [{ unit: 'ML', step: 10 }] }),
      ),
    ).toThrow(BatchCalculationError);
    expect(() =>
      calculateBatch(
        recipe,
        [],
        parameters({
          rounding: [
            { unit: 'ML', step: 1 },
            { unit: 'ML', step: 2 },
          ],
        }),
      ),
    ).toThrow(BatchCalculationError);
  });
  it('does not present a partial known sum as the full base ratio', () => {
    const r = calculateBatch(
      [line(10), line(null)],
      [],
      parameters({ mode: 'PORTIONS', target: 2 }),
    );
    expect(r.ingredients[0].ratio).toBeNull();
    expect(r.ingredients[1].rounded).toBeNull();
  });
  it('keeps repeating decimal arithmetic exact and JSON serializable', () => {
    expect(new Rational(1n, 3n).multiply(new Rational(3n)).json()).toEqual(
      q(1),
    );
    expect(new Rational(0n, 3n).json()).toEqual(q(0));
    expect(() =>
      JSON.stringify(calculateBatch(recipe, [], parameters({ target: 1 }))),
    ).not.toThrow();
  });
});
