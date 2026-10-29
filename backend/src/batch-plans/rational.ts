/** Exact bounded recipe arithmetic. Never turn a repeating division into a rounded source. */
export class Rational {
  readonly numerator: bigint;
  readonly denominator: bigint;

  constructor(numerator: bigint, denominator = 1n) {
    if (denominator <= 0n)
      throw new Error('A positive denominator is required.');
    let a = numerator < 0n ? -numerator : numerator;
    let b = denominator;
    while (b) [a, b] = [b, a % b];
    const divisor = a || 1n;
    this.numerator = numerator / divisor;
    this.denominator = denominator / divisor;
  }

  static decimal(value: number): Rational {
    if (!Number.isFinite(value) || !/^-?\d+(\.\d{1,3})?$/.test(String(value)))
      throw new Error(
        'A finite decimal with at most three decimal places is required.',
      );
    const text = String(value);
    const decimals = text.split('.')[1]?.length ?? 0;
    return new Rational(BigInt(text.replace('.', '')), 10n ** BigInt(decimals));
  }

  add(other: Rational): Rational {
    return new Rational(
      this.numerator * other.denominator + other.numerator * this.denominator,
      this.denominator * other.denominator,
    );
  }
  subtract(other: Rational): Rational {
    return this.add(new Rational(-other.numerator, other.denominator));
  }
  multiply(other: Rational): Rational {
    return new Rational(
      this.numerator * other.numerator,
      this.denominator * other.denominator,
    );
  }
  divide(other: Rational): Rational {
    if (other.numerator <= 0n)
      throw new Error('A positive divisor is required.');
    return new Rational(
      this.numerator * other.denominator,
      this.denominator * other.numerator,
    );
  }
  floor(): bigint {
    if (this.numerator < 0n)
      throw new Error('Floor is only used for non-negative servings.');
    return this.numerator / this.denominator;
  }
  round(step: Rational): Rational {
    const ratio = this.divide(step);
    if (ratio.numerator < 0n)
      throw new Error('Only positive recipe quantities are rounded.');
    const ticks =
      (2n * ratio.numerator + ratio.denominator) / (2n * ratio.denominator);
    return new Rational(ticks).multiply(step);
  }
  json() {
    return {
      numerator: String(this.numerator),
      denominator: String(this.denominator),
    };
  }
}
