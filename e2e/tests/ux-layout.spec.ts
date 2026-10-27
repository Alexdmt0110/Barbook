import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

interface Actor { user: { id: string }; workspaceId: string; csrfToken: string; credential: string }
for (const theme of ['light', 'dark']) {
  test(`layout reference ${theme}`, async ({ page }, info) => {
    await page.context().setExtraHTTPHeaders({ 'X-Forwarded-For': `192.0.2.${(info.project.name === 'mobile' ? 150 : 140) + (theme === 'dark' ? 1 : 0)}` });
    const actor = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'test/create-browser-edit-actor.ts'], {
      cwd: join(__dirname, '../../backend'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    })) as Actor;
    await page.context().addCookies([{ name: 'barbook-session-dev', value: actor.credential, url: 'http://127.0.0.1', httpOnly: true, sameSite: 'Lax' }]);
    const headers = { Origin: 'http://127.0.0.1:4200', 'X-Barbook-Request': '1', 'X-Barbook-CSRF': actor.csrfToken, 'X-Barbook-Expected-User': actor.user.id, 'X-Barbook-Expected-Workspace': actor.workspaceId };
    const name = `Recette de référence aux agrumes et aux épices ${randomUUID()}`;
    const response = await page.request.post('http://127.0.0.1:3000/api/cocktails', { headers, data: { name, type: 'PERSONAL_CREATION', method: 'SHAKER', glass: 'Coupe', ingredients: [{ ingredientName: 'Gin', ingredientDefaultAbv: 40, amount: 50, unit: 'ML' }], steps: ['Shaker puis filtrer.'] } });
    expect(response.status()).toBe(201);
    const recipe = await response.json() as {slug:string};
    await page.addInitScript((value: string) => localStorage.setItem('barbook.theme', value), theme);
    const widths = info.project.name === 'mobile' ? [360, 390] : [768, 1024, 1440, 1920, 2560, 3440];
    for (const width of widths) {
      await page.setViewportSize({width, height: 900});
      for (const [label, path] of [['home','/'],['library','/cocktails'],['folders','/folders'],['detail',`/cocktails/${recipe.slug}`]]) {
        await page.goto(path);
        await expect(page.locator('main h1')).toBeVisible();
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        if (label === 'library') await expect(page.getByRole('heading', {name, exact:true})).toBeVisible();
        if (label === 'detail') await expect(page.getByRole('heading', {name, exact:true})).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        if (width >= 1440) {
          const content = page.locator('.home-page, .cocktails-page, .folders-page, .detail-page');
          expect((await content.boundingBox())!.width).toBeGreaterThan(width * 0.9);
        }
        if (label === 'home') {
          const trigger = page.getByRole('button', {name:'Compte et sécurité',exact:true});
          await trigger.focus(); await page.keyboard.press('Enter');
          await expect(page.getByRole('region', {name:'Compte et sécurité',exact:true})).toBeVisible();
          await page.screenshot({path:info.outputPath(`account-${theme}-${width}.png`),animations:'disabled'});
          await page.keyboard.press('Escape');
          await expect(trigger).toBeFocused();
          await expect(page.getByRole('button', {name:'Déconnecter tous les appareils',exact:true})).toBeHidden();
        }
        await page.screenshot({path:info.outputPath(`${label}-${theme}-${width}.png`),fullPage:true,animations:'disabled'});
      }
    }
  });
}
