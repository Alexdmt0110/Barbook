import { expect, Page, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { basename, join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
interface Actor {user:{id:string;email:string};workspaceId:string;credential:string;csrfToken:string}
interface Fixture {owner:Actor;member:Actor;bar:{id:string;name:string}}
function fixture():Fixture{return JSON.parse(execFileSync(process.execPath,['--import','tsx','test/create-browser-bar-fixture.ts'],{cwd:join(__dirname,'../../backend'),encoding:'utf8',stdio:['ignore','pipe','pipe']})) as Fixture;}
async function open(page:Page,a:Actor,f:Fixture,ip:number){
  await page.context().setExtraHTTPHeaders({'X-Forwarded-For':`192.0.2.${ip}`});
  await page.context().addCookies([{name:'barbook-session-dev',value:a.credential,url:'http://127.0.0.1',httpOnly:true,sameSite:'Lax'}]);
  await page.goto('/cocktails');await page.getByRole('button',{name:'Compte et sécurité',exact:true}).click();
  await page.getByRole('button',{name:f.bar.name,exact:true}).click();await closed(page);
  await page.getByRole('link',{name:'Inventaire',exact:true}).click();await expect(page.getByRole('heading',{name:'Inventaire manuel',exact:true})).toBeVisible();
}
async function closed(page:Page){await expect(page.getByRole('button',{name:'Compte et sécurité',exact:true})).toHaveAttribute('aria-expanded','false');}
const card=(page:Page,name:string)=>page.getByRole('listitem',{name:`Produit ${name}`,exact:true});
async function captureView(page:Page,path:string){
  await page.evaluate(()=>window.scrollTo({top:0,left:0,behavior:'instant'}));
  const png = await page.screenshot({path,fullPage:true});
  // CI fixtures are synthetic and test-database guarded. Expose only selected PNGs, never HTTP credentials.
  // Chunked evidence lets review tools verify/render the actual capture without an available local runtime.
  const project = test.info().project.name;
  const name = basename(path);
  const selected = (project === 'mobile' && ['inventory-light.png', 'inventory-create-dark.png', 'inventory-count-dark.png', 'inventory-conflict-reviewed.png'].includes(name))
    || (project === 'desktop' && ['inventory-dark.png', 'inventory-settings-light.png'].includes(name));
  if (process.env.CI && selected) {
    const key = `${project}/${name}`;
    const encoded = png.toString('base64');
    console.log('BARBOOK_VISUAL_META ' + JSON.stringify({key, bytes:png.length, sha256:createHash('sha256').update(png).digest('hex'), chunks:Math.ceil(encoded.length/8192)}));
    for (let offset=0; offset<encoded.length; offset+=8192)
      console.log('BARBOOK_VISUAL_CHUNK ' + JSON.stringify({key, index:offset/8192, data:encoded.slice(offset,offset+8192)}));
  }
}
async function create(page:Page,name:string,target=8,capture?:string){
  await page.getByRole('button',{name:'Nouveau produit',exact:true}).click();
  await expect(page.getByRole('textbox',{name:'Nom du produit',exact:true})).toBeFocused();
  const control=await page.getByRole('textbox',{name:'Nom du produit',exact:true}).boundingBox();const header=await page.locator('.app-header').boundingBox();expect(control!.y).toBeGreaterThanOrEqual(header!.y+header!.height);
  await page.getByRole('textbox',{name:'Nom du produit',exact:true}).fill(name);
  await page.getByRole('textbox',{name:'Conditionnement descriptif',exact:true}).fill('Bouteille 700 mL');
  await page.getByRole('spinbutton',{name:'Comptage initial (unités physiques)',exact:true}).fill('6');
  await page.getByRole('spinbutton',{name:'Seuil d’alerte (unités)',exact:true}).fill('2');
  await page.getByRole('spinbutton',{name:'Stock cible (unités)',exact:true}).fill(String(target));
  if(capture)await captureView(page,capture);
  const submit=page.getByRole('button',{name:'Créer le produit et son comptage',exact:true});await submit.focus();await page.keyboard.press('Enter');
  await expect(card(page,name)).toContainText('Stock : 6 unité(s)');
}
async function prepareMove(page:Page,name:string,operation:'ADD'|'REMOVE'|'SET',amount:number,reason:string){
  await page.getByRole('button',{name:`Compter ${name}`,exact:true}).click();
  await expect(page.getByRole('combobox',{name:'Opération',exact:true})).toBeFocused();
  await page.getByRole('combobox',{name:'Opération',exact:true}).selectOption(operation);
  await page.getByRole('spinbutton',{name:operation==='SET'?'Nouveau comptage total':'Nombre d’unités',exact:true}).fill(String(amount));
  await page.getByRole('textbox',{name:'Motif du mouvement',exact:true}).fill(reason);
}
async function count(page:Page,name:string,operation:'ADD'|'REMOVE'|'SET',amount:number,reason:string,after:number){
  await prepareMove(page,name,operation,amount,reason);await page.getByRole('button',{name:'Confirmer le mouvement',exact:true}).click();
  await expect(page.getByRole('region',{name:'Action d’inventaire',exact:true})).toHaveCount(0);await expect(card(page,name)).toContainText(`Stock : ${after} unité(s)`);
}

test('two accounts count physical units, inspect authors and explain reorder suggestions in both themes',async({page,browser},info)=>{
  const f=fixture(),name=`Paddy ${randomUUID().slice(0,8)}`;
  const context=await browser.newContext({viewport:info.project.use.viewport,isMobile:info.project.name==='mobile',hasTouch:info.project.name==='mobile',recordVideo:{dir:info.outputPath('member-video')}});const member=await context.newPage();
  try{
    await open(page,f.owner,f,info.project.name==='mobile'?226:225);await create(page,name,9,info.outputPath('inventory-create-dark.png'));
    await page.getByRole('button',{name:`Régler ${name}`,exact:true}).click();
    await page.getByRole('spinbutton',{name:'Stock cible (unités)',exact:true}).fill('8');
    await captureView(page,info.outputPath('inventory-settings-dark.png'));
    await page.getByRole('button',{name:'Enregistrer les paramètres',exact:true}).click();
    await expect(card(page,name)).toContainText('cible 8');
    await open(member,f.member,f,info.project.name==='mobile'?228:227);await expect(member.getByRole('button',{name:'Nouveau produit',exact:true})).toHaveCount(0);
    await expect(member.getByRole('button',{name:`Régler ${name}`,exact:true})).toHaveCount(0);
    await count(member,name,'ADD',1,'Réception manuelle',7);await count(member,name,'REMOVE',1,'Bouteille terminée',6);await prepareMove(member,name,'SET',2,'Comptage du soir');
    await captureView(member,info.outputPath('inventory-count-dark.png'));
    await member.getByRole('button',{name:'Confirmer le mouvement',exact:true}).click();await expect(card(member,name)).toContainText('Stock : 2 unité(s)');
    await page.getByRole('button',{name:'Actualiser l’inventaire',exact:true}).click();await expect(card(page,name)).toContainText('Stock : 2 unité(s)');
    const suggestion=page.getByRole('listitem',{name:`Suggestion ${name}`,exact:true});await expect(suggestion).toContainText('6 unité(s) suggérée(s)');await expect(suggestion).toContainText('max(0, 8 − 2)');
    await page.getByRole('button',{name:`Historique ${name}`,exact:true}).click();const history=page.getByRole('region',{name:'Historique des mouvements',exact:true});
    await expect(history.getByRole('listitem')).toHaveCount(4);await expect(history).toContainText('Fixture Alex');await expect(history).toContainText('Fixture Maël');await expect(history).toContainText('Comptage du soir');
    for(const [theme,label,accent] of [['light','Clair','#a45a2b'],['dark','Sombre','#f1b57c']]){
      await page.getByRole('button',{name:/^Thème d’affichage :/}).click();await page.getByRole('button',{name:new RegExp(`^${label}`)}).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme',theme);await expect(page.locator('.app-shell')).toHaveCSS('--color-accent',accent);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.getByRole('button',{name:'Actualiser l’inventaire',exact:true})).toBeEnabled();
      await expect(page.getByRole('button',{name:'Nouveau produit',exact:true})).toBeEnabled();
      await captureView(page,info.outputPath(`inventory-${theme}.png`));
      await page.getByRole('button',{name:`Régler ${name}`,exact:true}).click();await captureView(page,info.outputPath(`inventory-settings-${theme}.png`));await page.getByRole('button',{name:'Fermer cette saisie',exact:true}).click();
    }
    await member.getByRole('button',{name:'Compte et sécurité',exact:true}).click();await member.getByRole('button',{name:'Personnel · privé',exact:true}).click();await closed(member);
    await expect(member.getByRole('link',{name:'Inventaire',exact:true})).toHaveCount(0);await member.goto('/inventory');
    await expect(member.getByText('Choisis un Bar confirmé depuis ton profil pour accéder à son inventaire partagé.',{exact:true})).toBeVisible();await expect(member.getByText(name,{exact:true})).toHaveCount(0);
  }finally{await context.close();}
});

test('a stale editor keeps input and requires explicit inspection and a new intention without silent replay',async({page,browser},info)=>{
  const f=fixture(),name=`Conflit stock ${randomUUID().slice(0,8)}`;const context=await browser.newContext({viewport:info.project.use.viewport,isMobile:info.project.name==='mobile',hasTouch:info.project.name==='mobile'});const member=await context.newPage();
  try{
    await open(page,f.owner,f,info.project.name==='mobile'?230:229);await create(page,name);await open(member,f.member,f,info.project.name==='mobile'?232:231);
    await prepareMove(member,name,'REMOVE',1,'Saisie conservée après conflit');await count(page,name,'ADD',1,'Réception concurrente',7);
    let posts=0;member.on('request',r=>{if(r.method()==='POST'&&new URL(r.url()).pathname.endsWith('/movements'))posts++;});
    const failed=member.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname.endsWith('/movements'));
    await member.getByRole('button',{name:'Confirmer le mouvement',exact:true}).click();expect((await failed).status()).toBe(409);
    const form=member.getByRole('region',{name:'Action d’inventaire',exact:true});await expect(form).toContainText('Action refusée');await expect(member.getByRole('textbox',{name:'Motif du mouvement',exact:true})).toHaveValue('Saisie conservée après conflit');
    await member.getByRole('button',{name:'Vérifier l’état actuel et les droits',exact:true}).click();await expect(form).toContainText('État vérifié : 7 unité(s), version 1');await expect(form).toContainText('État chargé : 6 unité(s), version 0');
    await captureView(member,info.outputPath('inventory-conflict-reviewed.png'));
    expect(posts).toBe(1);await member.getByRole('button',{name:'Préparer explicitement une nouvelle intention',exact:true}).click();expect(posts).toBe(1);
    await expect(form).toContainText('État chargé : 7 unité(s), version 1');await member.getByRole('button',{name:'Confirmer le mouvement',exact:true}).click();await expect(card(member,name)).toContainText('Stock : 6 unité(s)');expect(posts).toBe(2);
  }finally{await context.close();}
});

test('a committed lost response is resolved by its receipt once even when browser storage is refused',async({page},info)=>{
  await page.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new DOMException('Synthetic denied','SecurityError');};Storage.prototype.setItem=()=>{throw new DOMException('Synthetic quota','QuotaExceededError');};});
  const f=fixture(),name=`Réponse perdue ${randomUUID().slice(0,8)}`;await open(page,f.owner,f,info.project.name==='mobile'?234:233);await create(page,name);
  let posts=0;
  await page.route(`**/api/workspaces/${f.bar.id}/inventory/products/*/movements`,async route=>{if(route.request().method()!=='POST')return route.continue();posts++;const response=await route.fetch();expect(response.status()).toBe(201);await route.abort('failed');});
  await prepareMove(page,name,'REMOVE',1,'Perte documentée');await page.getByRole('button',{name:'Confirmer le mouvement',exact:true}).click();
  await expect(page.getByText(/Résultat inconnu : le serveur peut avoir enregistré/)).toBeVisible();await expect(page.getByRole('button',{name:'Confirmer le mouvement',exact:true})).toBeDisabled();expect(posts).toBe(1);
  await page.getByRole('button',{name:'Vérifier le reçu de cette intention',exact:true}).click();await expect(page.getByText(/Reçu retrouvé : 6 → 5/)).toBeVisible();await expect(card(page,name)).toContainText('Stock : 5 unité(s)');expect(posts).toBe(1);
  await page.getByRole('button',{name:`Historique ${name}`,exact:true}).click();await expect(page.getByRole('region',{name:'Historique des mouvements',exact:true}).getByRole('listitem')).toHaveCount(2);
});

test('membership revocation rejects an open stock intention and leaves the counter/history untouched',async({page,browser},info)=>{
  const f=fixture(),name=`Retrait accès ${randomUUID().slice(0,8)}`;const context=await browser.newContext({viewport:info.project.use.viewport,isMobile:info.project.name==='mobile',hasTouch:info.project.name==='mobile'});const member=await context.newPage();
  try{
    await open(page,f.owner,f,info.project.name==='mobile'?236:235);await create(page,name);await open(member,f.member,f,info.project.name==='mobile'?238:237);await prepareMove(member,name,'REMOVE',1,'Ancienne intention avant retrait');
    await page.getByRole('button',{name:'Compte et sécurité',exact:true}).click();await page.getByRole('button',{name:'Gérer les membres',exact:true}).click();page.once('dialog',d=>void d.accept());
    await page.getByRole('button',{name:`Retirer ${f.member.user.email}`,exact:true}).click();await expect(page.getByText('Action confirmée. Actualise les membres et les droits avant une autre action.',{exact:true})).toBeVisible();
    await member.getByRole('button',{name:'Confirmer le mouvement',exact:true}).click();await expect(member.getByText('L’accès au Bar n’est plus confirmé. Choisis un espace autorisé.',{exact:true})).toBeVisible();await expect(member.locator('app-inventory')).toHaveCount(0);
    await page.keyboard.press('Escape');await closed(page);
    const refreshed=page.waitForResponse(r=>r.request().method()==='GET'&&new URL(r.url()).pathname===`/api/workspaces/${f.bar.id}/inventory/products`);
    await page.getByRole('button',{name:'Vérifier les droits du Bar',exact:true}).click();expect((await refreshed).status()).toBe(200);
    await expect(page.getByRole('button',{name:'Nouveau produit',exact:true})).toBeEnabled();await expect(card(page,name)).toContainText('Stock : 6 unité(s)');
    await page.getByRole('button',{name:`Historique ${name}`,exact:true}).click();await expect(page.getByRole('region',{name:'Historique des mouvements',exact:true}).getByRole('listitem')).toHaveCount(1);
    await member.getByRole('button',{name:'Compte et sécurité',exact:true}).click();await member.getByRole('button',{name:'Personnel · privé',exact:true}).click();await closed(member);await expect(member.getByRole('link',{name:'Mes cocktails',exact:true})).toBeVisible();
  }finally{await context.close();}
});
