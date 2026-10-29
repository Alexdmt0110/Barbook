import { Rational } from './rational';

export const BATCH_UNITS = [
  'ML',
  'G',
  'PIECE',
  'LEAF',
  'SPRIG',
  'DASH',
  'DROP',
  'BAR_SPOON',
  'TEASPOON',
  'TABLESPOON',
  'SCOOP',
  'PINCH',
  'TOP_UP',
] as const;
export type BatchUnit = (typeof BATCH_UNITS)[number];
export interface BatchLine {
  ingredientName: string;
  amount: number | null;
  unit: BatchUnit | null;
}
export interface BatchParameters {
  mode: 'PORTIONS' | 'VOLUME_ML';
  target: number;
  includedPositions: number[];
  rounding: { unit: Exclude<BatchUnit, 'TOP_UP'>; step: number }[];
}
export class BatchCalculationError extends Error {}
const zero = () => new Rational(0n);
const positiveDecimal = (value: number, maximum: number, label: string) => {
  try {
    if (typeof value !== 'number' || value <= 0 || value > maximum)
      throw new Error();
    return Rational.decimal(value);
  } catch {
    throw new BatchCalculationError(
      `${label}: expected a positive decimal with at most three places, up to ${maximum}.`,
    );
  }
};

/** Pure domain calculation; authorization and source snapshots belong to the transaction layer. */
export function calculateBatch(
  ingredients: readonly BatchLine[],
  garnishes: readonly BatchLine[],
  parameters: BatchParameters,
) {
  if (!['PORTIONS', 'VOLUME_ML'].includes(parameters.mode))
    throw new BatchCalculationError('Invalid target mode.');
  if (!ingredients.length || ingredients.length > 50 || garnishes.length > 20)
    throw new BatchCalculationError('Invalid recipe line count.');
  const target = positiveDecimal(
    parameters.target,
    parameters.mode === 'PORTIONS' ? 10000 : 1000000,
    'Target',
  );
  const selected = new Set(parameters.includedPositions);
  if (
    !selected.size ||
    selected.size !== parameters.includedPositions.length ||
    [...selected].some(
      (i) => !Number.isInteger(i) || i < 0 || i >= ingredients.length,
    )
  )
    throw new BatchCalculationError(
      'Select at least one distinct ingredient position from this recipe.',
    );
  if (parameters.rounding.length > 12)
    throw new BatchCalculationError('Too many rounding units.');
  const steps = new Map<BatchUnit, Rational>();
  for (const item of parameters.rounding) {
    if (
      !BATCH_UNITS.includes(item.unit) ||
      steps.has(item.unit) ||
      String(item.unit) === 'TOP_UP'
    )
      throw new BatchCalculationError(
        'Each quantitative unit accepts at most one rounding step.',
      );
    steps.set(item.unit, positiveDecimal(item.step, 100000, 'Rounding step'));
  }
  for (const line of [...ingredients, ...garnishes]) {
    if (line.unit !== null && !BATCH_UNITS.includes(line.unit))
      throw new BatchCalculationError('Unknown unit.');
    if (line.amount !== null)
      positiveDecimal(line.amount, 99999.999, 'Source quantity');
  }
  const included = ingredients.filter((_, i) => selected.has(i));
  if (included.some((line) => line.unit === 'TOP_UP'))
    throw new BatchCalculationError(
      'TOP_UP stays at service and cannot be included in the base.',
    );
  const measurable = included.every(
    (line) => line.unit === 'ML' && line.amount !== null,
  );
  if (parameters.mode === 'VOLUME_ML' && !measurable)
    throw new BatchCalculationError(
      'An exact base volume requires every included quantity to be known in ML.',
    );
  const dose = measurable
    ? included.reduce(
        (sum, line) => sum.add(Rational.decimal(line.amount!)),
        zero(),
      )
    : null;
  const factor = parameters.mode === 'PORTIONS' ? target : target.divide(dose!);
  const scale = (line: BatchLine, multiplier: Rational) => {
    const reason =
      line.unit === 'TOP_UP'
        ? 'TOP_UP'
        : line.amount === null
          ? 'UNKNOWN_AMOUNT'
          : line.unit === null
            ? 'UNKNOWN_UNIT'
            : null;
    if (reason)
      return { exact: null, rounded: null, delta: null, unknown: reason };
    const exact = Rational.decimal(line.amount!).multiply(multiplier);
    if (exact.numerator > 1000000000n * exact.denominator)
      throw new BatchCalculationError(
        'Calculated line quantity exceeds capacity.',
      );
    const step = steps.get(line.unit!);
    const rounded = step ? exact.round(step) : exact;
    if (exact.numerator > 0n && rounded.numerator === 0n)
      throw new BatchCalculationError(
        'Rounding would remove a positive ingredient. Choose a smaller step.',
      );
    if (rounded.numerator > 1000000000n * rounded.denominator)
      throw new BatchCalculationError(
        'Rounded line quantity exceeds capacity.',
      );
    return { exact, rounded, delta: rounded.subtract(exact), unknown: null };
  };
  const base = ingredients.map((line, i) =>
    selected.has(i) ? scale(line, factor) : null,
  );
  const volume = dose
    ? base.reduce(
        (sum, item) => (item?.rounded ? sum.add(item.rounded) : sum),
        zero(),
      )
    : null;
  const portions =
    volume && dose ? volume.divide(dose).floor() : factor.floor();
  const serviceFactor =
    parameters.mode === 'VOLUME_ML' ? new Rational(portions) : factor;
  const remaining =
    volume && dose
      ? volume.subtract(dose.multiply(new Rational(portions)))
      : null;
  const unitTotals = new Map<BatchUnit, Rational>();
  for (let i = 0; i < ingredients.length; i++) {
    const unit = ingredients[i].unit;
    const amount = base[i]?.rounded;
    if (unit && amount)
      unitTotals.set(unit, (unitTotals.get(unit) ?? zero()).add(amount));
  }
  const project = (
    line: BatchLine,
    position: number,
    isBase: boolean,
    amounts: ReturnType<typeof scale>,
  ) => ({
    position,
    ingredientName: line.ingredientName,
    unit: line.unit,
    originalAmount: line.amount,
    included: isBase,
    exact: amounts.exact?.json() ?? null,
    rounded: amounts.rounded?.json() ?? null,
    delta: amounts.delta?.json() ?? null,
    ratio:
      isBase &&
      line.unit &&
      amounts.rounded &&
      !included.some(
        (other) => other.unit === line.unit && other.amount === null,
      ) &&
      unitTotals.get(line.unit)?.numerator
        ? amounts.rounded.divide(unitTotals.get(line.unit)!).json()
        : null,
    unknown: amounts.unknown,
  });
  return {
    formatVersion: 1,
    factor: factor.json(),
    completePortions: String(portions),
    basePerPortionMl: dose?.json() ?? null,
    baseVolumeMl: volume?.json() ?? null,
    targetVolumeMl: parameters.mode === 'VOLUME_ML' ? target.json() : null,
    volumeDifferenceMl:
      parameters.mode === 'VOLUME_ML' && volume
        ? volume.subtract(target).json()
        : null,
    remainingMl: remaining?.json() ?? null,
    ingredients: ingredients.map((line, i) =>
      project(line, i, selected.has(i), base[i] ?? scale(line, serviceFactor)),
    ),
    garnishes: garnishes.map((line, i) =>
      project(line, i, false, scale(line, serviceFactor)),
    ),
  };
}
