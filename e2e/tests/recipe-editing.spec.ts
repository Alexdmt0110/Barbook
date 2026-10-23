import { expect, Page, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { acceptDraftNavigation } from '../fixtures/draft-journeys';
import type { CocktailContentSnapshot } from '../../frontend/src/app/features/cocktails/data-access/cocktail-content.models';

const backend = join(__dirname, '../../backend');
const password = 'Synthetic editing fixture password 42!';
interface Actor {
  user: { id: string; email: string };
  workspaceId: string;
  csrfToken: string;
  credential: string;
}
function actor(): Actor {
  return JSON.parse(
    execFileSync(process.execPath, ['--import', 'tsx', 'test/create-browser-edit-actor.ts'], {
      cwd: backend,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }),
  ) as Actor;
}
const headers = (a: Actor) => ({
  Origin: 'http://127.0.0.1:4200',
  'X-Barbook-Request': '1',
  'X-Barbook-CSRF': a.csrfToken,
  'X-Barbook-Expected-User': a.user.id,
  'X-Barbook-Expected-Workspace': a.workspaceId,
});
async function useActor(page: Page, a: Actor) {
  await page
    .context()
    .addCookies([
      {
        name: 'barbook-session-dev',
        value: a.credential,
        url: 'http://127.0.0.1',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);
}
async function fixture(page: Page) {
  acceptDraftNavigation(page);
  const a = actor();
  await useActor(page, a);
  const created = await page.request.post('http://127.0.0.1:3000/api/cocktails', {
    headers: headers(a),
    data: {
      name: `Edit ${randomUUID()}`,
      type: 'PERSONAL_CREATION',
      method: 'SHAKER',
      glass: 'Coupe',
      ingredients: [
        { ingredientName: 'Gin', ingredientDefaultAbv: 40, amount: 12.345, unit: 'ML' },
      ],
      steps: ['Shaker.', 'Filtrer.'],
    },
  });
  expect(created.status()).toBe(201);
  const recipe = (await created.json()) as { id: string; slug: string };
  const url = `http://127.0.0.1:3000/api/cocktails/id/${recipe.id}/content`;
  const base = (await (
    await page.request.get(url, { headers: headers(a) })
  ).json()) as CocktailContentSnapshot;
  const rich = {
    ...base.content,
    family: 'Sour',
    ice: 'Gros cube',
    notes: 'Note privée',
    mainAlcoholName: 'Gin',
    ingredients: [
      { ...base.content.ingredients[0], specification: 'London dry', notes: 'Ligne privée' },
      {
        ingredientName: 'Zero',
        ingredientDefaultAbv: 40,
        amount: 1,
        unit: 'DASH',
        specification: null,
        notes: null,
        abvMode: 'OVERRIDE',
        abvOverride: 0,
      },
      {
        ingredientName: 'Equal',
        ingredientDefaultAbv: 40,
        amount: 15,
        unit: 'ML',
        specification: null,
        notes: null,
        abvMode: 'OVERRIDE',
        abvOverride: 40,
      },
      {
        ingredientName: 'Unknown',
        ingredientDefaultAbv: 20,
        amount: null,
        unit: 'TOP_UP',
        specification: null,
        notes: null,
        abvMode: 'UNKNOWN',
        abvOverride: null,
      },
      {
        ingredientName: 'Absent',
        ingredientDefaultAbv: null,
        amount: 2,
        unit: 'PIECE',
        specification: null,
        notes: null,
        abvMode: 'INHERIT',
        abvOverride: null,
      },
    ],
    garnishes: [
      {
        ingredientName: 'Citron',
        amount: 1,
        unit: 'PIECE',
        specification: 'Zeste',
        usage: 'Exprimer',
      },
    ],
  };
  const populated = await page.request.put(url, {
    headers: headers(a),
    data: { ...rich, expectedContentVersion: 0 },
  });
  expect(populated.status()).toBe(200);
  const initial = (await populated.json()) as CocktailContentSnapshot;
  await page.goto(`/cocktails/${recipe.slug}`);
  await page.getByRole('link', { name: 'Modifier la recette', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Modifier la recette', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Nom *', exact: true })).toHaveValue(
    initial.content.name,
  );
  return { a, recipe, url, initial };
}
const save = (page: Page) =>
  page.getByRole('button', { name: 'Enregistrer la recette', exact: true });

test('editing round trip, competing editor, explicit recovery and genuinely lost committed response', async ({
  page,
}, info) => {
  const { a, recipe, url, initial } = await fixture(page);
  await expect(page.getByRole('spinbutton', { name: 'Quantité 1', exact: true })).toHaveValue(
    '12.345',
  );
  await expect(page.getByRole('combobox', { name: 'Source du degré 1', exact: true })).toHaveValue(
    'INHERIT',
  );
  await expect(
    page.getByRole('spinbutton', { name: 'Degré pour cette recette 2 (%)', exact: true }),
  ).toHaveValue('0');
  await expect(
    page.getByRole('spinbutton', { name: 'Degré pour cette recette 3 (%)', exact: true }),
  ).toHaveValue('40');
  await expect(page.getByRole('combobox', { name: 'Source du degré 4', exact: true })).toHaveValue(
    'UNKNOWN',
  );
  await page.screenshot({ path: info.outputPath('editing-form.png'), animations: 'disabled' });
  const noOp = page.waitForResponse(
    (r) => r.request().method() === 'PUT' && r.url().endsWith(`/id/${recipe.id}/content`),
  );
  await save(page).click();
  const unchanged = await noOp;
  expect(unchanged.status()).toBe(200);
  expect(await unchanged.json()).toEqual(initial);
  await expect(
    page.getByText('Aucune modification : la recette est inchangée.', { exact: true }),
  ).toBeVisible();
  const name = `Renamed ${randomUUID()}`;
  await page.getByRole('textbox', { name: 'Nom *', exact: true }).fill(name);
  await page.getByRole('button', { name: 'Monter l’étape 2', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('textbox', { name: 'Étape 1 *', exact: true })).toHaveValue(
    'Filtrer.',
  );
  const changed = page.waitForResponse(
    (r) => r.request().method() === 'PUT' && r.url().endsWith(`/id/${recipe.id}/content`),
  );
  await save(page).click();
  expect((await changed).status()).toBe(200);
  const current = (await (
    await page.request.get(url, { headers: headers(a) })
  ).json()) as CocktailContentSnapshot;
  expect(current.contentVersion).toBe(2);
  expect(current.slug).toBe(recipe.slug);
  expect(current.content.ingredients).toEqual(initial.content.ingredients);
  expect(current.content.garnishes).toEqual(initial.content.garnishes);
  expect(current.content.steps).toEqual(['Filtrer.', 'Shaker.']);
  expect(current.organizationVersion).toBe(initial.organizationVersion);
  // A genuinely competing browser editor loads the same version and saves first.
  const second = await page.context().newPage();
  acceptDraftNavigation(second);
  try {
    await second.goto(`/cocktails/id/${recipe.id}/edit`);
    await second.getByRole('textbox', { name: 'Notes', exact: true }).fill('Autre éditeur');
    await save(second).click();
    await expect(second.getByText('Recette enregistrée.', { exact: true })).toBeVisible();
    await page.getByRole('textbox', { name: 'Notes', exact: true }).fill('Saisie locale conservée');
    const stale = page.waitForResponse(
      (r) => r.request().method() === 'PUT' && r.url().endsWith(`/id/${recipe.id}/content`),
    );
    await save(page).click();
    expect((await stale).status()).toBe(409);
    await expect(save(page)).toBeDisabled();
    await expect(page.getByRole('textbox', { name: 'Notes', exact: true })).toHaveValue(
      'Saisie locale conservée',
    );
    await page.reload();
    await page.getByRole('button', { name: 'Restaurer le brouillon', exact: true }).click();
    await expect(save(page)).toBeDisabled();
    await page.getByRole('button', { name: 'Comparer avec le serveur', exact: true }).click();
    await expect(
      page.getByRole('region', { name: 'Version serveur en lecture seule' }),
    ).toContainText('Autre éditeur');
    page.once('dialog', (d) => d.accept());
    await page
      .getByRole('button', {
        name: 'Abandonner la saisie et charger cette version serveur',
        exact: true,
      })
      .click();
    await expect(page.getByRole('textbox', { name: 'Notes', exact: true })).toHaveValue(
      'Autre éditeur',
    );
  } finally {
    await second.close();
  }
  let puts = 0;
  const pattern = `**/api/cocktails/id/${recipe.id}/content`;
  await page.route(pattern, async (route) => {
    if (route.request().method() !== 'PUT') {
      await route.continue();
      return;
    }
    puts++;
    const real = await route.fetch();
    expect(real.status()).toBe(200);
    await route.abort('failed');
  });
  await page.getByRole('textbox', { name: 'Notes', exact: true }).fill('Réponse réellement perdue');
  await save(page).click();
  await expect(
    page.getByText('Résultat de la dernière opération inconnu.', { exact: false }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Restaurer le brouillon', exact: true }).click();
  await expect(save(page)).toBeDisabled();
  expect(puts).toBe(1);
  const committed = (await (
    await page.request.get(url, { headers: headers(a) })
  ).json()) as CocktailContentSnapshot;
  expect(committed.content.notes).toBe('Réponse réellement perdue');
  expect(committed.contentVersion).toBe(4);
  await page.getByRole('button', { name: 'Comparer avec le serveur', exact: true }).click();
  await expect(
    page.getByRole('region', { name: 'Version serveur en lecture seule' }),
  ).toContainText('Réponse réellement perdue');
  expect(puts).toBe(1);
  await page.unroute(pattern);
  await page
    .getByRole('region', { name: 'Version serveur en lecture seule' })
    .screenshot({ path: info.outputPath('editing-server-comparison.png'), animations: 'disabled' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: info.outputPath('editing-conflict.png'),
    fullPage: true,
    animations: 'disabled',
  });
});

test('editing draft survives expiration, keeps explicit restore, handles refused storage and purges changed identity', async ({
  page,
  browser,
}, info) => {
  const { a, recipe } = await fixture(page);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'barbook.drafts.v1')
        throw new DOMException('Fixture quota', 'QuotaExceededError');
      return original.call(this, key, value);
    };
    (window as unknown as { restoreEditStorage: () => void }).restoreEditStorage = () => {
      Storage.prototype.setItem = original;
    };
  });
  await page.getByRole('textbox', { name: 'Notes', exact: true }).fill('Brouillon sous quota');
  await expect(
    page.getByText('Stockage navigateur indisponible ou saturé.', { exact: false }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Annuler et revenir à la recette', exact: true }).click();
  await page.getByRole('link', { name: 'Modifier la recette', exact: true }).click();
  await page.getByRole('button', { name: 'Restaurer le brouillon', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Notes', exact: true })).toHaveValue(
    'Brouillon sous quota',
  );
  await page.evaluate(() =>
    (window as unknown as { restoreEditStorage: () => void }).restoreEditStorage(),
  );
  await page
    .getByRole('textbox', { name: 'Notes', exact: true })
    .fill('Brouillon privé après expiration');
  execFileSync(process.execPath, ['--import', 'tsx', 'test/expire-browser-session.ts', a.user.id], {
    cwd: backend,
    stdio: 'pipe',
  });
  await save(page).click();
  await expect(page).toHaveURL(/\/login\?returnUrl=/);
  await page.getByLabel('Adresse email', { exact: true }).fill(a.user.email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Restaurer le brouillon', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Notes', exact: true })).toHaveValue(
    'Note privée',
  );
  await page.getByRole('button', { name: 'Restaurer le brouillon', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Notes', exact: true })).toHaveValue(
    'Brouillon privé après expiration',
  );
  // The same qualified memory fallback handles denied getters on a separate document.
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:4200',
    viewport: info.project.use.viewport,
  });
  try {
    await context.addCookies(await page.context().cookies());
    await context.addInitScript(() => {
      Object.defineProperty(window, 'sessionStorage', {
        configurable: true,
        get: () => {
          throw new DOMException('Fixture blocked', 'SecurityError');
        },
      });
    });
    const blocked = await context.newPage();
    const errors: string[] = [];
    blocked.on('pageerror', (e) => errors.push(e.message));
    await blocked.goto(`/cocktails/id/${recipe.id}/edit`);
    await blocked.getByRole('textbox', { name: 'Notes', exact: true }).fill('Mémoire seulement');
    await expect(
      blocked.getByText('Stockage navigateur indisponible ou saturé.', { exact: false }),
    ).toBeVisible();
    await save(blocked).click();
    await expect(blocked.getByText('Envoi bloqué :', { exact: false })).toBeVisible();
    expect(errors).toEqual([]);
    await blocked.screenshot({
      path: info.outputPath('editing-storage-refused.png'),
      fullPage: true,
    });
  } finally {
    await context.close();
  }
  // Same browser cookie jar now identifies a different real PostgreSQL user.
  const other = actor();
  await useActor(page, other);
  await page.reload();
  await expect(
    page.getByText('Cette recette n’est plus disponible dans ton carnet personnel.', {
      exact: true,
    }),
  ).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('barbook.drafts.v1'))).toBeNull();
  await expect(
    page.getByRole('button', { name: 'Restaurer le brouillon', exact: true }),
  ).toHaveCount(0);
});
