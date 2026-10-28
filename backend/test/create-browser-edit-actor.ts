import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { RegistrationAdmissionPolicy } from '../src/auth/admission/registration-admission.policy';
import { AuthService } from '../src/auth/auth.service';
import { PasswordService } from '../src/auth/password.service';
import { SessionService } from '../src/auth/sessions/session.service';
import { PrismaService } from '../src/database/prisma.service';
import { requireTestDatabase } from './helpers/test-database';

// CLI only, excluded from the production build. Never alters the running API's admission/configuration.
async function create(): Promise<void> {
  requireTestDatabase();
  const email = `edit-${randomUUID()}@example.test`;
  const config = new ConfigService({
    ...process.env,
    REGISTRATION_ALLOWED_EMAILS: email,
  });
  const prisma = new PrismaService(config);
  try {
    const auth = new AuthService(
      prisma,
      new PasswordService(),
      new SessionService(prisma),
      new RegistrationAdmissionPolicy(config),
    );
    const issued = await auth.register({
      email,
      displayName: 'Disposable editing fixture',
      password: 'Synthetic editing fixture password 42!',
    });
    process.stdout.write(
      JSON.stringify({ ...issued.response, credential: issued.credential }),
    );
  } finally {
    await prisma.$disconnect();
  }
}
void create().catch(() => {
  process.stderr.write('Disposable editing actor failed.\n');
  process.exitCode = 1;
});
