import { expect, Page, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import type { CocktailContentSnapshot } from '../../frontend/src/app/features/cocktails/data-access/cocktail-content.models';
import type { RecipeLifecycle } from '../../frontend/src/app/features/cocktails/data-access/cocktail-lifecycle.models';

interface Actor { user: { id: string }; workspaceId: string; csrfToken: string; credential: string }
test.beforeEach(async ({ context }, info) => {
  // Independent synthetic clients, preserving the application's existing quotas.
  const client = (info.project.name === 'mobile' ? 60 : 50) + (info.title.startsWith('trash conflict') ? 1 : 0);
  await context.setExtraHTTPHeaders({ 'X-Forwarded-For': `192.0.2.${client}` });
});
async function fixture(page: Page) {
  const actor = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'test/create-browser-edit-actor.ts'], {
    cwd: join(__dirname, '../../backend'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  })) as Actor;
  await page.context().addCookies([{ name: 'barbook-session-dev', value: actor.credential, url: 'http://127.0.0.1', httpOnly: true, sameSite: 'Lax' }]);
  const headers = { Origin: 'http://127.0.0.1:4200', 'X-Barbook-Request': '1', 'X-Barbook-CSRF': actor.csrfToken, 'X-Barbook-Expected-User': actor.user.id, 'X-Barbook-Expected-Workspace': actor.workspaceId };
  const name = `Trash ${randomUUID()}`;
  const response = await page.request.post('http://127.0.0.1:3000/api/cocktails', { headers, data: {
    name, type: 'PERSONAL_CREATION', method: 'SHAKER', glass: 'Coupe',
    ingredients: [{ ingredientName: 'Gin', ingredientDefaultAbv: 40, amount: 50, unit: 'ML' }], steps: ['Shaker.'],
  } });
  expect(response.status()).toBe(201);
  const recipe = await response.json() as { id: string; slug: string };
  return { recipe, headers, name, url: `http://127.0.0.1:3000/api/cocktails/id/${recipe.id}` };
}

test('trash lifecycle after editing preserves content and original URL with explicit keyboard confirmations', async ({ page }, info) => {
  const { recipe, headers, name, url } = await fixture(page);
  await page.goto(`/cocktails/${recipe.slug}`);
  await page.getByRole('link', { name: 'Modifier la recette', exact: true }).click();
  const renamed = `${name} edited`;
  await page.getByRole('textbox', { name: 'Nom *', exact: true }).fill(renamed);
  const saved = page.waitForResponse(r => r.request().method() === 'PUT' && r.url().endsWith(`/id/${recipe.id}/content`));
  await page.getByRole('button', { name: 'Enregistrer la recette', exact: true }).click();
  expect((await saved).status()).toBe(200);
  await page.goto(`/cocktails/${recipe.slug}`);
  await page.getByRole('link', { name: 'Mettre en corbeille', exact: true }).click();
  const confirmation = page.getByRole('button', { name: 'Confirmer la mise en corbeille', exact: true });
  await expect(confirmation).toBeVisible();
  const before = await page.request.get(`${url}/lifecycle`, { headers });
  expect((await before.json() as RecipeLifecycle).deletedAt).toBeNull();
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(confirmation).toHaveCount(0);
  await page.getByRole('button', { name: 'Préparer la mise en corbeille', exact: true }).click();
  await confirmation.focus(); await page.keyboard.press('Enter');
  await expect(page.getByText('Recette placée en corbeille.', { exact: true })).toBeVisible();
  expect((await page.request.get(`${url}/content`, { headers })).status()).toBe(404);
  await page.getByRole('link', { name: 'Ouvrir la corbeille', exact: true }).click();
  const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: renamed, exact: true }) });
  await expect(card).toBeVisible();
  await page.screenshot({ path: info.outputPath('personal-trash.png'), animations: 'disabled' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await card.getByRole('button', { name: 'Restaurer', exact: true }).click();
  const restore = card.getByRole('button', { name: 'Confirmer la restauration', exact: true });
  await restore.focus(); await page.keyboard.press('Enter');
  await card.getByRole('link', { name: 'Ouvrir la recette', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/cocktails/${recipe.slug}$`));
  await expect(page.getByRole('heading', { name: renamed, exact: true })).toBeVisible();
  const restored = await (await page.request.get(`${url}/content`, { headers })).json() as CocktailContentSnapshot;
  expect(restored.content.name).toBe(renamed); expect(restored.contentVersion).toBe(3); expect(restored.organizationVersion).toBe(2);
  expect(restored.content.ingredients[0].abvMode).toBe('INHERIT');
});

test('trash conflict and genuinely lost committed response never replay a deletion', async ({ page }) => {
  const { recipe, headers, url } = await fixture(page);
  await page.goto(`/cocktails/id/${recipe.id}/delete`);
  const confirmation = page.getByRole('button', { name: 'Confirmer la mise en corbeille', exact: true });
  await expect(confirmation).toBeVisible();
  const loaded = await (await page.request.get(`${url}/content`, { headers })).json() as CocktailContentSnapshot;
  const edit = await page.request.put(`${url}/content`, { headers, data: { ...loaded.content, notes: 'Concurrent editor', expectedContentVersion: loaded.contentVersion } });
  expect(edit.status()).toBe(200);
  const conflict = page.waitForResponse(r => r.request().method() === 'DELETE' && r.url().endsWith(`/id/${recipe.id}`));
  await confirmation.click(); expect((await conflict).status()).toBe(409);
  await expect(page.getByRole('alert')).toContainText('recette a changé');
  await expect(confirmation).toHaveCount(0);
  await page.getByRole('button', { name: 'Vérifier l’état actuel', exact: true }).click();
  await expect(confirmation).toBeVisible();
  let deletes = 0;
  const pattern = `**/api/cocktails/id/${recipe.id}`;
  await page.route(pattern, async route => {
    if (route.request().method() !== 'DELETE') { await route.continue(); return; }
    deletes++;
    const real = await route.fetch(); expect(real.status()).toBe(200);
    await route.abort('failed');
  });
  await confirmation.click();
  await expect(page.getByRole('alert')).toContainText('peut-être été enregistrée');
  await expect(confirmation).toHaveCount(0); expect(deletes).toBe(1);
  const committed = await (await page.request.get(`${url}/lifecycle`, { headers })).json() as RecipeLifecycle;
  expect(committed.contentVersion).toBe(2); expect(committed.deletedAt).not.toBeNull();
  await page.getByRole('button', { name: 'Vérifier l’état actuel', exact: true }).click();
  await expect(page.getByText('Recette placée en corbeille.', { exact: true })).toBeVisible();
  expect(deletes).toBe(1);
  await page.unroute(pattern);
});
