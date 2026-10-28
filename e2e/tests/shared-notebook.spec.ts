import { expect, Page, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

interface Actor { user: { id: string; email: string }; workspaceId: string; csrfToken: string; credential: string }
interface Fixture { owner: Actor; member: Actor; bar: { id: string; name: string } }
const headers = (a: Actor) => ({ Origin: 'http://127.0.0.1:4200', 'X-Barbook-Request': '1', 'X-Barbook-CSRF': a.csrfToken, 'X-Barbook-Expected-User': a.user.id, 'X-Barbook-Expected-Workspace': a.workspaceId });
function fixture(): Fixture { return JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'test/create-browser-bar-fixture.ts'], { cwd: join(__dirname, '../../backend'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })) as Fixture; }
async function use(page: Page, a: Actor, ip: number) {
  await page.context().setExtraHTTPHeaders({ 'X-Forwarded-For': `192.0.2.${ip}` });
  await page.context().addCookies([{ name: 'barbook-session-dev', value: a.credential, url: 'http://127.0.0.1', httpOnly: true, sameSite: 'Lax' }]);
}
async function openBar(page: Page, bar: Fixture['bar']) {
  await page.goto('/cocktails');
  const trigger = page.getByRole('button', { name: 'Compte et sécurité', exact: true });
  await trigger.click();
  await page.getByRole('button', { name: bar.name, exact: true }).click();
  await expect(page.getByRole('link', { name: 'Carnet Bar', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Compte et sécurité', exact: true })).toContainText(bar.name);
  await page.keyboard.press('Escape');
}
async function fill(page: Page, name: string) {
  await page.getByRole('textbox', { name: /^Nom \*/ }).fill(name);
  await page.getByRole('textbox', { name: /^Verre/ }).fill('Coupe');
  await page.getByRole('combobox', { name: /^Ingrédient/ }).fill('Gin partagé');
  await page.getByRole('combobox', { name: /^Unité/ }).selectOption('CL');
  await page.getByRole('spinbutton', { name: /^Quantité/ }).fill('5');
  await page.getByRole('spinbutton', { name: /^Degré alcoolique/ }).fill('40');
  await page.getByRole('textbox', { name: /Étape\s+1/ }).fill('Shaker puis filtrer.');
}

test('two accounts select Bar from profile, share create/edit and keep Personnel isolated', async ({ page, browser }, info) => {
  const f = fixture();
  const second = await browser.newContext({ viewport: info.project.use.viewport, isMobile: info.project.name === 'mobile', hasTouch: info.project.name === 'mobile' });
  const member = await second.newPage();
  try {
    await use(page, f.owner, info.project.name === 'mobile' ? 182 : 180);
    await use(member, f.member, info.project.name === 'mobile' ? 183 : 181);
    await openBar(page, f.bar);
    await page.goto('/cocktails/new');
    const name = `Recette Bar ${randomUUID().slice(0, 8)}`;
    await fill(page, name);
    const created = page.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith(`/workspaces/${f.bar.id}/cocktails`));
    await page.getByRole('button', { name: 'Créer le cocktail', exact: true }).click();
    expect((await created).status()).toBe(201);
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
    const detailUrl = page.url();
    await expect(page.getByRole('link', { name: 'Mettre en corbeille', exact: true })).toHaveCount(0);
    await expect(page.locator('main input, main select, main textarea')).toHaveCount(0);
    await openBar(member, f.bar);
    await expect(member.getByRole('heading', { name, exact: true })).toBeVisible();
    await member.getByRole('heading', { name, exact: true }).click();
    await member.getByRole('link', { name: 'Modifier la recette', exact: true }).click();
    await member.getByRole('textbox', { name: 'Notes', exact: true }).fill('Modifié par Maël');
    await member.getByRole('button', { name: 'Enregistrer la recette', exact: true }).click();
    await expect(member.getByText('Recette enregistrée.', { exact: true })).toBeVisible();
    await page.goto(detailUrl);
    await expect(page.getByText('Modifié par Maël', { exact: true })).toBeVisible();
    for (const theme of ['light', 'dark']) {
      const themeButton = page.getByRole('button', { name: /^Thème d’affichage :/ });
      // Use the existing theme control's options, keeping preference independent of workspace.
      await themeButton.click();
      await page.getByRole('button', { name: theme === 'light' ? /^Clair/ : /^Sombre/ }).click();
      await page.getByRole('button', { name: 'Compte et sécurité', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Déconnecter tous les appareils', exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath(`bar-profile-${theme}.png`), fullPage: true });
      await page.keyboard.press('Escape');
    }
    await member.getByRole('button', { name: 'Compte et sécurité', exact: true }).click();
    await member.getByRole('button', { name: 'Personnel · privé', exact: true }).click();
    await member.keyboard.press('Escape');
    await expect(member.getByRole('heading', { name, exact: true })).toHaveCount(0);
    await expect(member.getByRole('link', { name: 'Mes cocktails', exact: true })).toBeVisible();
    const privateList = await member.request.get('http://127.0.0.1:3000/api/cocktails', { headers: headers(f.member) });
    expect(privateList.status()).toBe(200);
    expect((await privateList.json() as { total: number }).total).toBe(0);
  } finally { await second.close(); }
});

test('Bar drafts survive refresh, keep original access intention and are purged on explicit workspace change', async ({ page }, info) => {
  const f = fixture();
  await use(page, f.member, info.project.name === 'mobile' ? 185 : 184);
  await openBar(page, f.bar);
  await page.goto('/cocktails/new');
  await fill(page, 'Brouillon partagé conservé');
  page.on('dialog', dialog => void dialog.accept());
  await page.reload();
  await page.getByRole('button', { name: 'Restaurer le brouillon', exact: true }).click();
  await expect(page.getByRole('textbox', { name: /^Nom \*/ })).toHaveValue('Brouillon partagé conservé');
  const revoke = await page.request.post(`http://127.0.0.1:3000/api/workspaces/${f.bar.id}/members/${f.member.user.id}/revoke`, { headers: { ...headers(f.owner), Cookie: `barbook-session-dev=${f.owner.credential}` }, data: { expectedAccessVersion: 0 } });
  expect(revoke.status()).toBe(200);
  const readd = await page.request.post(`http://127.0.0.1:3000/api/workspaces/${f.bar.id}/members`, { headers: { ...headers(f.owner), Cookie: `barbook-session-dev=${f.owner.credential}` }, data: { email: f.member.user.email, expectedAccessVersion: 1 } });
  expect(readd.status()).toBe(200);
  await page.reload();
  await page.getByRole('button', { name: 'Restaurer le brouillon', exact: true }).click();
  await expect(page.getByText('Le brouillon est conservé, mais son envoi est bloqué.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Créer le cocktail', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Compte et sécurité', exact: true }).click();
  await page.getByRole('button', { name: 'Personnel · privé', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.goto('/cocktails/new');
  await expect(page.getByRole('button', { name: 'Restaurer le brouillon', exact: true })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: /^Nom \*/ })).toHaveValue('');
});
