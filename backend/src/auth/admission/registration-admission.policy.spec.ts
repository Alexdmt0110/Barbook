import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RegistrationAdmissionPolicy } from './registration-admission.policy';

const policy = (value?: unknown) =>
  new RegistrationAdmissionPolicy(
    new ConfigService({ REGISTRATION_ALLOWED_EMAILS: value }),
  );

describe('Private registration admission', () => {
  it.each([undefined, '', '   '])('is closed by default for %p', (value) => {
    expect(() => policy(value).assertAllowed('allowed@example.test')).toThrow(
      ForbiddenException,
    );
  });
  it('normalizes exact addresses without widening domains or aliases', () => {
    const admission = policy(
      ' Allowed@Example.Test , second@example.test,allowed@example.test ',
    );
    expect(() =>
      admission.assertAllowed(' ALLOWED@example.test '),
    ).not.toThrow();
    expect(() => admission.assertAllowed('second@example.test')).not.toThrow();
    for (const email of [
      'other@example.test',
      'allowed+extra@example.test',
      'allowed@example.test.attacker.test',
      'notallowed@example.test',
    ])
      expect(() => admission.assertAllowed(email)).toThrow(ForbiddenException);
  });
  it.each([
    '*',
    '*@example.test',
    '@example.test',
    'not-an-email',
    'allowed@example.test,',
    ',allowed@example.test',
    'allowed@example.test,,second@example.test',
    'Name <allowed@example.test>',
    true,
    null,
    42,
  ])('refuses invalid configuration %p without printing its value', (value) => {
    expect(() => policy(value)).toThrow(
      'REGISTRATION_ALLOWED_EMAILS must contain exact comma-separated email addresses.',
    );
  });
  it.each(['development', 'test', 'production'])(
    'has no environment bypass in %s',
    (environment) => {
      const admission = new RegistrationAdmissionPolicy(
        new ConfigService({ NODE_ENV: environment }),
      );
      expect(() => admission.assertAllowed('qa@example.test')).toThrow(
        ForbiddenException,
      );
    },
  );
});
