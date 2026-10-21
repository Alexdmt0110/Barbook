import { expect, Page } from '@playwright/test';
import { acceptDraftNavigation } from './draft-journeys';

/** Independent cookie jars are devices; responses are lost only after real server commit. */
export async function globalLogoutJourney(
  page: Page,
  email: string,
  password: string,
  screenshotPath: string,
): Promise<void> {
  const browser = page.context().browser();
  if (!browser) throw new Error('A real browser is required.');
  const device = await browser.newContext({ viewport: page.viewportSize(), locale: 'fr-FR' });
  const remote = await device.newPage();
  acceptDraftNavigation(remote);
  const pattern = '**/api/auth/logout-all';
  let requests = 0;
  try {
    await remote.goto('http://127.0.0.1:4200/login');
    await remote.getByLabel('Adresse email', { exact: true }).fill(email);
    await remote.getByLabel('Mot de passe', { exact: true }).fill(password);
    await remote.getByRole('button', { name: 'Se connecter', exact: true }).click();
    await expect(remote).toHaveURL('http://127.0.0.1:4200/');
    await remote.goto('http://127.0.0.1:4200/cocktails/new');
    await remote.getByRole('textbox', { name: /^Nom \*/ }).fill('Draft on other device');
    const remoteCookie = (await device.cookies()).find((c) => c.name === 'barbook-session-dev')!;
    const localCookie = (await page.context().cookies()).find(
      (c) => c.name === 'barbook-session-dev',
    )!;
    expect(remoteCookie.value).not.toBe(localCookie.value);
    await page.getByRole('textbox', { name: /^Nom \*/ }).fill('Draft before global intent');
    await page.getByRole('button', { name: 'Déconnecter tous les appareils', exact: true }).click();
    const form = page.getByRole('form', { name: 'Confirmer la déconnexion globale' });
    await expect(form).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: screenshotPath, fullPage: true, animations: 'disabled' });
    await form.getByRole('button', { name: 'Annuler', exact: true }).click();
    await expect(page.getByRole('textbox', { name: /^Nom \*/ })).toHaveValue(
      'Draft before global intent',
    );
    await page.getByRole('button', { name: 'Déconnecter tous les appareils', exact: true }).click();
    const input = form.getByLabel('Mot de passe pour déconnexion globale', { exact: true });
    await input.fill('incorrect password');
    await input.focus();
    await page.keyboard.press('Enter');
    await expect(form.getByRole('alert')).toContainText('Mot de passe refusé');
    await expect(input).toHaveValue('');
    expect(await page.evaluate(() => sessionStorage.getItem('barbook.drafts.v1'))).toBeNull();
    // Wrong password did not revoke either real device; local screen stays locked honestly.
    expect((await remote.request.get('http://127.0.0.1:3000/api/auth/me')).status()).toBe(200);
    expect((await page.request.get('http://127.0.0.1:3000/api/auth/me')).status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'Créer un cocktail', exact: true })).toHaveCount(
      0,
    );
    await page.route(pattern, async (route) => {
      requests++;
      const result = await route.fetch();
      expect(result.status()).toBe(204);
      expect(result.headers()['set-cookie']).toBeUndefined();
      await route.abort('failed');
    });
    await input.fill(password);
    await form
      .getByRole('button', { name: 'Confirmer la déconnexion globale', exact: true })
      .click();
    await expect(form.getByRole('alert')).toContainText('Déconnexion globale non confirmée');
    expect(requests).toBe(1);
    await expect(input).toHaveValue('');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    // No BroadcastChannel crosses these contexts: the real server reports voluntary revocation.
    const refused = remote.waitForResponse((r) => new URL(r.url()).pathname === '/api/auth/me');
    await remote.reload();
    const response = await refused;
    expect(response.status()).toBe(401);
    expect(((await response.json()) as { code: string }).code).toBe('SESSION_REVOKED');
    await expect(remote).toHaveURL(/\/login\?returnUrl=/);
    expect(await remote.evaluate(() => sessionStorage.getItem('barbook.drafts.v1'))).toBeNull();
    for (const cookie of [remoteCookie, localCookie]) {
      const replay = await page.request.get('http://127.0.0.1:3000/api/auth/me', {
        headers: { Cookie: `barbook-session-dev=${cookie.value}` },
      });
      expect(replay.status()).toBe(401);
    }
    expect(requests).toBe(1); // No automatic replay despite the lost success response.
  } finally {
    await page.unroute(pattern);
    await device.close();
  }
}
