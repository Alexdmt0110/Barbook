import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { RegistrationAdmissionPolicy } from '../src/auth/admission/registration-admission.policy';
import { AuthService } from '../src/auth/auth.service';
import { PasswordService } from '../src/auth/password.service';
import { SessionService } from '../src/auth/sessions/session.service';
import { PrismaService } from '../src/database/prisma.service';
import { requireTestDatabase } from './helpers/test-database';

/** Synthetic fixture only; not a product provisioning endpoint or a production script. */
async function create(): Promise<void> {
  requireTestDatabase();
  const emails = [0, 1].map(() => `bar-${randomUUID()}@example.test`);
  const config = new ConfigService({
    ...process.env,
    REGISTRATION_ALLOWED_EMAILS: emails.join(','),
  });
  const prisma = new PrismaService(config);
  try {
    const auth = new AuthService(
      prisma,
      new PasswordService(),
      new SessionService(prisma),
      new RegistrationAdmissionPolicy(config),
    );
    const actors = [];
    for (const [index, email] of emails.entries()) {
      const issued = await auth.register({
        email,
        displayName: index === 0 ? 'Fixture Alex' : 'Fixture Maël',
        password: 'Synthetic Bar fixture password 42!',
      });
      actors.push({ ...issued.response, credential: issued.credential });
    }
    const bar = await prisma.workspace.create({
      data: {
        name: `Bar de test ${randomUUID().slice(0, 8)}`,
        kind: 'SHARED',
        members: {
          create: actors.map((actor, index) => ({
            userId: actor.user.id,
            role: index === 0 ? 'OWNER' : 'MEMBER',
          })),
        },
      },
      select: { id: true, name: true },
    });
    process.stdout.write(
      JSON.stringify({ owner: actors[0], member: actors[1], bar }),
    );
  } finally {
    await prisma.$disconnect();
  }
}
void create().catch(() => {
  process.stderr.write('Disposable Bar fixture failed.\n');
  process.exitCode = 1;
});
