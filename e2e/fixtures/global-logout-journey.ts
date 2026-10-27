import { chromium, expect, Page } from '@playwright/test';
import { acceptDraftNavigation } from './draft-journeys';

/** Independent cookie jars are devices; responses are lost only after real server commit. */
export async function globalLogoutJourney(
  page: Page,
  email: string,
  password: string,
  screenshotPath: string,
): Promise<void> {
  const browser = await chromium.launch({
    channel: 'chromium',
    ignoreDefaultArgs: ['--disable-back-forward-cache'],
  });
  const device = await browser.newContext({ viewport: page.viewportSize(), locale: 'fr-FR' });
  const remote = await device.newPage();
  acceptDraftNavigation(remote);
  const pattern = '**/api/auth/logout-all';
  let requests = 0;
  try {
    await remote.addInitScript(() => {
      window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
          sessionStorage.setItem('barbook.bfcache-proof', 'restored');
          const shell = document.querySelector('app-shell > .app-shell');
          sessionStorage.setItem(
            'barbook.bfcache-hidden',
            shell ? getComputedStyle(shell).visibility : 'missing',
          );
        }
      });
    });
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
    if (!(await page.getByRole('button', { name: 'Déconnecter tous les appareils', exact: true }).isVisible())) {
      await page.getByRole('button', { name: 'Compte et sécurité', exact: true }).click();
    }
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
    if (!(await page.getByRole('button', { name: 'Déconnecter tous les appareils', exact: true }).isVisible())) {
      await page.getByRole('button', { name: 'Compte et sécurité', exact: true }).click();
    }
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
    await remote.goto('http://127.0.0.1:3000/api');
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
    // BFCache restoration is deliberately outside Playwright Page's lifecycle tracker.
    // Observe the actual Chromium document and HTTP response through its native protocol.
    const cdp = await device.newCDPSession(remote);
    const notRestored: unknown[] = [];
    let refusedRequest: string | undefined;
    let refusedStatus: number | undefined;
    cdp.on('Page.backForwardCacheNotUsed', (event) =>
      notRestored.push(event.notRestoredExplanations),
    );
    cdp.on('Network.responseReceived', (event) => {
      if (new URL(event.response.url).pathname === '/api/auth/me') {
        refusedRequest = event.requestId;
        refusedStatus = event.response.status;
      }
    });
    await cdp.send('Page.enable');
    await cdp.send('Network.enable');
    const history = await cdp.send('Page.getNavigationHistory');
    const previous = history.entries[history.currentIndex - 1];
    expect(previous.url).toBe('http://127.0.0.1:4200/cocktails/new');
    await cdp.send('Page.navigateToHistoryEntry', { entryId: previous.id });
    type RestoredDocument = {
      url: string;
      proof: string | null;
      hidden: string | null;
      draft: string | null;
      privateHeading: boolean;
    };
    let restored: RestoredDocument | undefined;
    await expect
      .poll(async () => {
        try {
          const result = await cdp.send('Runtime.evaluate', {
            expression: `JSON.stringify({ url: location.href, proof: sessionStorage.getItem('barbook.bfcache-proof'), hidden: sessionStorage.getItem('barbook.bfcache-hidden'), draft: sessionStorage.getItem('barbook.drafts.v1'), privateHeading: Array.from(document.querySelectorAll('h1')).some(e => e.textContent?.trim() === 'Créer un cocktail') })`,
            returnByValue: true,
          });
          if (typeof result.result.value !== 'string') return false;
          restored = JSON.parse(result.result.value) as RestoredDocument;
          return new URL(restored.url).pathname === '/login';
        } catch (error) {
          if (
            error instanceof Error &&
            /Cannot find context|Execution context was destroyed/.test(error.message)
          )
            return false;
          throw error;
        }
      })
      .toBe(true);
    expect(restored?.proof, JSON.stringify(notRestored)).toBe('restored');
    expect(restored?.hidden).toBe('hidden');
    expect(restored?.draft).toBeNull();
    expect(restored?.privateHeading).toBe(false);
    expect(refusedStatus).toBe(401);
    expect(refusedRequest).toBeDefined();
    const refused = await cdp.send('Network.getResponseBody', { requestId: refusedRequest! });
    expect((JSON.parse(refused.body) as { code: string }).code).toBe('SESSION_REVOKED');
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
    await browser.close();
  }
}
