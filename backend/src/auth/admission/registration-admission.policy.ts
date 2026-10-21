import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isEmail } from 'class-validator';

/** Admission applies to new accounts only; it never grants workspace access. */
@Injectable()
export class RegistrationAdmissionPolicy {
  private readonly allowedEmails: ReadonlySet<string>;

  constructor(config: ConfigService) {
    const raw = config.get<unknown>('REGISTRATION_ALLOWED_EMAILS');
    if (raw === undefined || raw === '') {
      this.allowedEmails = new Set();
      return;
    }
    if (typeof raw !== 'string') this.invalidConfiguration();
    const normalized = raw.trim().toLowerCase();
    if (normalized === '') {
      this.allowedEmails = new Set();
      return;
    }
    const emails = normalized.split(',').map((email) => email.trim());
    if (
      emails.some(
        (email) => email.length > 254 || email.includes('*') || !isEmail(email),
      )
    ) {
      this.invalidConfiguration();
    }
    this.allowedEmails = new Set(emails);
  }

  assertAllowed(email: string): void {
    if (!this.allowedEmails.has(email.trim().toLowerCase())) {
      throw new ForbiddenException({
        code: 'REGISTRATION_NOT_ALLOWED',
        message:
          'Les inscriptions sont réservées aux participants de la bêta privée.',
      });
    }
  }

  private invalidConfiguration(): never {
    // Do not expose the configured addresses in startup errors or logs.
    throw new Error(
      'REGISTRATION_ALLOWED_EMAILS must contain exact comma-separated email addresses.',
    );
  }
}
