import { expect, Page, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
interface Actor { user: { id: string; email: string }; workspaceId: string; credential: string; csrfToken: string }
interface Bar { id: string; name: string }
function actor(): Actor {
  return JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'test/create-browser-edit-actor.ts'], { cwd: join(__dirname, '../../backend'), encoding: 'utf8', stdio: ['ignore','pipe','pipe'] })) as Actor;
}
async function use(page: Page, a: Actor, ip: number) {
  await page.context().setExtraHTTPHeaders({'X-Forwarded-For': `192.0.2.${ip}`});
  await page.context().addCookies([{name:'barbook-session-dev',value:a.credential,url:'http://127.0.0.1',httpOnly:true,sameSite:'Lax'}]);
  await page.goto('/cocktails');
}
async function profile(page: Page) {
  const button = page.getByRole('button',{name:'Compte et sécurité',exact:true});
  if (await button.getAttribute('aria-expanded') !== 'true') await button.click();
  await expect(page.getByText('Chargement des Bars…',{exact:true})).toHaveCount(0);
}
async function prepare(page: Page, name: string) {
  await profile(page);
  await page.getByRole('button',{name:'Créer mon premier bar',exact:true}).click();
  await page.getByRole('textbox',{name:'Nom du bar',exact:true}).fill(name);
  await page.getByRole('radio',{name:'Rouge',exact:true}).check();
  await page.getByRole('checkbox',{name:'J’ai vérifié mes Bars et je confirme la création d’un nouvel espace.',exact:true}).check();
}
async function mode(page: Page, label: string) {
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:/^Thème d’affichage :/}).click();
  await page.getByRole('button',{name:new RegExp(`^${label}`)}).click();
}
async function tokens(page: Page) {
  return page.locator('.app-shell').evaluate(el => {
    const style = getComputedStyle(el);
    return Object.fromEntries(['--color-accent','--color-on-accent','--color-danger','--color-danger-border','--color-focus-ring','--color-text','--color-surface-solid'].map(k => [k,style.getPropertyValue(k).trim()]));
  });
}
function contrast(a: string,b: string) {
  const luminance = (hex: string) => {
    const c = hex.slice(1).match(/../g)!.map(n => parseInt(n,16)/255).map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4);
    return .2126*c[0]+.7152*c[1]+.0722*c[2];
  };
  const x=luminance(a),y=luminance(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}

test('create Bar in profile, explicitly open it, share with another account and restore personal theme', async ({page,browser},info) => {
  const owner=actor(), member=actor(); const name=`Bar rouge ${randomUUID().slice(0,8)}`;
  const context=await browser.newContext({viewport:info.project.use.viewport,isMobile:info.project.name==='mobile',hasTouch:info.project.name==='mobile',recordVideo:{dir:info.outputPath('member-video')}});
  const other=await context.newPage();
  try {
    await use(page,owner,info.project.name==='mobile'?211:210);
    await mode(page,'Sombre'); const personal=await tokens(page);
    await prepare(page,name);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:info.outputPath('create-bar-dark.png'),fullPage:true});
    const response=page.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname==='/api/workspaces');
    await page.getByRole('button',{name:'Confirmer la création du Bar',exact:true}).click();
    const created=await response; expect(created.status()).toBe(201); const bar=await created.json() as Bar;
    await expect(page.getByRole('button',{name:'Ouvrir le Bar créé',exact:true})).toBeVisible();
    expect(await tokens(page)).toEqual(personal);
    await expect(page.getByRole('link',{name:'Mes cocktails',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Ouvrir le Bar créé',exact:true}).click();
    await expect(page.locator('[aria-label="Espace actif"]')).toContainText(name);
    for (const [label,key,color] of [['Sombre','dark','#ff9198'],['Clair','light','#981b28']]) {
      await mode(page,label); const current=await tokens(page);
      expect(current['--color-accent']).toBe(color);
      expect(contrast(current['--color-accent'],current['--color-on-accent'])).toBeGreaterThanOrEqual(4.5);
      expect(await page.locator('html').getAttribute('data-theme')).toBe(key);
      await profile(page); await expect(page.getByRole('button',{name:'Déconnecter tous les appareils',exact:true})).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await page.screenshot({path:info.outputPath(`created-bar-${key}.png`),fullPage:true});
    }
    await mode(page,'Sombre'); const red=await tokens(page);
    for (const k of ['--color-danger','--color-danger-border','--color-focus-ring','--color-text','--color-surface-solid']) expect(red[k]).toBe(personal[k]);
    await mode(page,'Contraste élevé'); expect((await tokens(page))['--color-accent']).toBe('#ffd600');
    await mode(page,'Sombre'); await profile(page);
    await page.getByRole('button',{name:'Gérer les membres',exact:true}).click();
    await page.getByRole('textbox',{name:'Email du membre existant',exact:true}).fill(member.user.email);
    await page.getByRole('button',{name:'Ajouter le membre',exact:true}).click();
    await page.getByRole('button',{name:'Vérifier les membres et les droits',exact:true}).click();
    await expect(page.getByText(member.user.email,{exact:false}).first()).toBeVisible();
    await page.keyboard.press('Escape');
    await page.goto('/cocktails/new');
    const recipe=`Recette rouge ${randomUUID().slice(0,8)}`;
    await page.getByRole('textbox',{name:/^Nom \*/}).fill(recipe);
    await page.getByRole('textbox',{name:/^Verre/}).fill('Coupe');
    await page.getByRole('combobox',{name:/^Ingrédient/}).fill('Gin partagé');
    await page.getByRole('combobox',{name:/^Unité/}).selectOption('CL');
    await page.getByRole('spinbutton',{name:/^Quantité/}).fill('5');
    await page.getByRole('spinbutton',{name:/^Degré alcoolique/}).fill('40');
    await page.getByRole('textbox',{name:/Étape\s+1/}).fill('Mélanger.');
    await page.getByRole('button',{name:'Créer le cocktail',exact:true}).click();
    await expect(page.getByRole('heading',{name:recipe,exact:true})).toBeVisible();
    await use(other,member,info.project.name==='mobile'?213:212);
    await profile(other); await other.getByRole('button',{name,exact:true}).click();
    await expect(other.getByRole('heading',{name:recipe,exact:true})).toBeVisible();
    expect((await tokens(other))['--color-accent']).toBe('#ff9198');
    await profile(other); await expect(other.getByRole('button',{name:'Gérer les membres',exact:true})).toHaveCount(0);
    await other.getByRole('button',{name:'Personnel · privé',exact:true}).click();
    await expect(other.getByRole('heading',{name:recipe,exact:true})).toHaveCount(0);
    await profile(page); await page.getByRole('button',{name:'Personnel · privé',exact:true}).click();
    expect(await tokens(page)).toEqual(personal);
    await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
    expect(bar.id).toBeTruthy();
  } finally { await context.close(); }
});

test('lost committed Bar creation response resolves explicitly without another POST', async ({page},info) => {
  await use(page,actor(),info.project.name==='mobile'?215:214);
  await prepare(page,`Bar réponse perdue ${randomUUID().slice(0,8)}`);
  let posts=0; let bar: Bar|undefined;
  await page.route('**/api/workspaces',async route=>{
    if(route.request().method()!=='POST') return route.continue();
    posts++; const response=await route.fetch(); expect(response.status()).toBe(201); bar=await response.json() as Bar; await route.abort('failed');
  });
  await page.getByRole('button',{name:'Confirmer la création du Bar',exact:true}).click();
  await expect(page.getByRole('button',{name:'Vérifier cette création',exact:true})).toBeVisible();
  expect(posts).toBe(1); await expect(page.getByRole('textbox',{name:'Nom du bar',exact:true})).toBeDisabled();
  await expect(page.getByRole('link',{name:'Mes cocktails',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Vérifier cette création',exact:true}).click();
  await expect(page.getByRole('button',{name:'Ouvrir le Bar créé',exact:true})).toBeVisible();
  expect(posts).toBe(1); expect(bar?.id).toBeTruthy();
  await page.getByRole('button',{name:'Ouvrir le Bar créé',exact:true}).click();
  await expect(page.locator('[aria-label="Espace actif"]')).toContainText(bar!.name);
  expect(posts).toBe(1);
});

test('creation preserves personal draft until explicit opening and accepted workspace purge', async ({page},info) => {
  await use(page,actor(),info.project.name==='mobile'?217:216);
  await page.goto('/cocktails/new');
  await page.getByRole('textbox',{name:/^Nom \*/}).fill('Brouillon personnel à protéger');
  await prepare(page,`Bar et brouillon ${randomUUID().slice(0,8)}`);
  await page.getByRole('button',{name:'Confirmer la création du Bar',exact:true}).click();
  const open=page.getByRole('button',{name:'Ouvrir le Bar créé',exact:true}); await expect(open).toBeVisible();
  page.once('dialog',d=>void d.dismiss()); await open.click();
  await expect(page.getByRole('textbox',{name:/^Nom \*/})).toHaveValue('Brouillon personnel à protéger');
  await expect(page.getByRole('link',{name:'Mes cocktails',exact:true})).toBeVisible();
  page.once('dialog',d=>void d.accept()); await open.click();
  await expect(page.getByRole('link',{name:'Carnet Bar',exact:true})).toBeVisible();
  await profile(page); await page.getByRole('button',{name:'Personnel · privé',exact:true}).click();
  await page.goto('/cocktails/new');
  await expect(page.getByRole('button',{name:'Restaurer le brouillon',exact:true})).toHaveCount(0);
  await expect(page.getByRole('textbox',{name:/^Nom \*/})).toHaveValue('');
});
