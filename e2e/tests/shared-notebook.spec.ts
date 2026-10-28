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
  await expect(page.getByRole('button', { name: 'Compte et sécurité', exact: true })).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('[aria-label="Espace actif"]')).toContainText(bar.name);
  const brand = (await page.locator('.brand').boundingBox())!;
  const profile = (await trigger.boundingBox())!;
  expect(brand.x + brand.width).toBeLessThanOrEqual(profile.x);
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
  const second = await browser.newContext({ viewport: info.project.use.viewport, isMobile: info.project.name === 'mobile', hasTouch: info.project.name === 'mobile', recordVideo: { dir: info.outputPath('member-video') } });
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

test('OWNER manages existing-account membership and revocation blocks a member with an open recipe draft', async ({ page, browser }, info) => {
  const f = fixture();
  const second = await browser.newContext({ viewport: info.project.use.viewport, isMobile: info.project.name === 'mobile', hasTouch: info.project.name === 'mobile', recordVideo: { dir: info.outputPath('member-video') } });
  const member = await second.newPage();
  try {
    await use(page, f.owner, info.project.name === 'mobile' ? 188 : 186);
    await use(member, f.member, info.project.name === 'mobile' ? 189 : 187);
    await openBar(member, f.bar);
    await member.getByRole('button', { name: 'Compte et sécurité', exact: true }).click();
    await expect(member.getByRole('button', { name: 'Gérer les membres', exact: true })).toHaveCount(0);
    await member.getByRole('button', { name: 'Fermer le panneau utilisateur', exact: true }).click();
    await member.goto('/cocktails/new');
    await fill(member, 'Intention du membre avant révocation');
    await openBar(page, f.bar);
    await page.getByRole('button', { name: 'Compte et sécurité', exact: true }).click();
    await page.getByRole('button', { name: 'Gérer les membres', exact: true }).click();
    await expect(page.getByText(f.member.user.email, { exact: false })).toBeVisible();
    await page.screenshot({ path: info.outputPath('owner-members.png'), fullPage: true });
    page.once('dialog', dialog => void dialog.accept());
    await page.getByRole('button', { name: `Retirer ${f.member.user.email}`, exact: true }).click();
    await expect(page.getByText('Action confirmée. Actualise les membres et les droits avant une autre action.', { exact: true })).toBeVisible();
    await member.getByRole('button', { name: 'Créer le cocktail', exact: true }).click();
    await expect(member.getByText('L’accès au Bar n’est plus confirmé. Choisis un espace autorisé.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Vérifier les membres et les droits', exact: true }).click();
    await expect(page.getByRole('button', { name: `Retirer ${f.member.user.email}`, exact: true })).toHaveCount(0);
    await page.getByRole('textbox', { name: 'Email du membre existant', exact: true }).fill(f.member.user.email);
    await page.getByRole('button', { name: 'Ajouter le membre', exact: true }).click();
    await expect(page.getByText('Action confirmée. Actualise les membres et les droits avant une autre action.', { exact: true })).toBeVisible();
    const list = await page.request.get(`http://127.0.0.1:3000/api/workspaces/${f.bar.id}/cocktails`, { headers: headers(f.owner) });
    expect(list.status()).toBe(200);
    expect((await list.json() as { total: number }).total).toBe(0);
  } finally { await second.close(); }
});
