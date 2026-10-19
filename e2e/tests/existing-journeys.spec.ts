import { expect, Page, test } from '@playwright/test';
import { createHmac, randomUUID } from 'node:crypto';

const password = 'Synthetic E2E fixture password 42!';

async function fillRecipeForm(page: Page, name: string): Promise<void> {
  await page.getByRole('textbox', { name: /^Nom \*/ }).fill(name);
  await page.getByRole('textbox', { name: /^Verre/ }).fill('Coupe');
  await page.getByRole('combobox', { name: /^Ingrédient/ }).fill('Fixture Gin');
  await page.getByRole('combobox', { name: /^Unité/ }).selectOption('CL');
  await page.getByRole('spinbutton', { name: /^Quantité/ }).fill('5');
  await page.getByRole('spinbutton', { name: /^Degré alcoolique/ }).fill('40');
  await page
    .getByRole('textbox', { name: /Étape\s+1/ })
    .fill('Shaker avec de la glace puis filtrer.');
}

test('register, create, classify, manage folders and log back in', async ({ page }, testInfo) => {
  const suffix = randomUUID().slice(0, 8);
  const email = `browser-${randomUUID()}@example.test`;
  const prefix = `QA e2e ${suffix}`;
  const name = `${prefix} <b>Citron</b>`;
  const tagName = `E2E-${suffix}`;
  const collectionName = `Collection ${suffix}`;

  await page.goto('/register');
  await page.getByLabel('Nom affiché', { exact: true }).fill('Fixture E2E');
  await page.getByLabel('Nom affiché', { exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Adresse email', { exact: true })).toBeFocused();
  await page.getByLabel('Adresse email', { exact: true }).fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Créer mon Barbook', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:4200/');
  await page
    .getByRole('navigation', { name: 'Navigation principale' })
    .getByRole('link', { name: 'Dossiers', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Aucun dossier à afficher', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Nom du dossier', { exact: true }).fill(collectionName);
  const emptyFolderResponse = page.waitForResponse(
    (r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/folders',
  );
  await page.getByRole('button', { name: 'Créer le dossier', exact: true }).click();
  const emptyFolderCreation = await emptyFolderResponse;
  expect(emptyFolderCreation.status()).toBe(201);
  const collection = (await emptyFolderCreation.json()) as { id: string };
  await expect(page).toHaveURL(`http://127.0.0.1:4200/folders/${collection.id}`);
  await expect(
    page.getByRole('heading', { name: collectionName, exact: true, level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Aucune recette à afficher', exact: true }),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath('empty-folder.png'), fullPage: true });
  await page
    .getByRole('navigation', { name: 'Navigation principale' })
    .getByRole('link', { name: 'Mes cocktails', exact: true })
    .click();
  await page.getByRole('link', { name: /Nouveau cocktail/ }).click();
  await expect(page).toHaveURL(/\/cocktails\/new$/);

  await fillRecipeForm(page, name);
  const createdResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === '/api/cocktails',
  );
  await page.getByRole('button', { name: 'Créer le cocktail', exact: true }).click();
  const creation = await createdResponse;
  expect(creation.status()).toBe(201);
  const created = (await creation.json()) as { id: string; slug: string };
  await expect(page).toHaveURL(`http://127.0.0.1:4200/cocktails/${created.slug}`);
  const title = page.getByRole('heading', { name, exact: true, level: 1 });
  await expect(title).toBeVisible();
  await expect(title.locator('b')).toHaveCount(0);

  const folderNames = [`E2E dossier ${suffix}`, `E2E autre <i>${suffix}</i>`];
  const folders: { id: string; name: string }[] = [];
  for (const folderName of folderNames) {
    await page.getByLabel('Nom du nouveau dossier', { exact: true }).fill(folderName);
    const response = page.waitForResponse(
      (r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/folders',
    );
    await page.getByRole('button', { name: 'Créer', exact: true }).click();
    const creation = await response;
    expect(creation.status()).toBe(201);
    folders.push((await creation.json()) as { id: string; name: string });
    await expect(page.getByRole('checkbox', { name: folderName, exact: true })).toBeChecked();
  }
  const folder = folders[0];
  await expect(page.getByRole('checkbox', { name: folderNames[0], exact: true })).toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByLabel('Nom du nouveau tag', { exact: true }).fill(tagName);
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
  const savedResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'PUT' &&
      new URL(response.url()).pathname.endsWith('/organization'),
  );
  await page.getByRole('button', { name: 'Enregistrer l’organisation', exact: true }).click();
  expect((await savedResponse).status()).toBe(200);

  const reloadedResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === `/api/cocktails/${created.slug}`,
  );
  await page.reload();
  const detail = (await (await reloadedResponse).json()) as {
    ingredients: { amount: number }[];
    folder: { id: string };
    folders: { id: string; name: string }[];
    organizationVersion: number;
    tags: { id: string; name: string }[];
  };
  expect(detail.ingredients[0].amount).toBe(50);
  expect(detail.folders.map((f) => f.id).sort()).toEqual(folders.map((f) => f.id).sort());
  expect(detail.organizationVersion).toBe(1);
  expect(detail.tags.map((tag) => tag.name)).toEqual([tagName]);
  for (const folderName of folderNames)
    await expect(page.getByRole('checkbox', { name: folderName, exact: true })).toBeChecked();
  await expect(
    page.getByRole('button', { name: `Retirer le tag ${tagName}`, exact: true }),
  ).toBeVisible();

  // A second real client changes the version; the UI must preserve its stale draft.
  const token = await page.evaluate(() => sessionStorage.getItem('barbook.accessToken'));
  expect(token).toBeTruthy();
  const remoteSave = await page.request.put(
    `http://127.0.0.1:3000/api/cocktails/${created.slug}/organization`,
    {
      headers: { Authorization: `Bearer ${token}` },
      data: { folderIds: folders.map((f) => f.id), tagNames: [tagName], expectedVersion: 1 },
    },
  );
  expect(remoteSave.status()).toBe(200);
  await page.getByLabel('Nom du nouveau tag', { exact: true }).fill('Draft');
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
  const conflictResponse = page.waitForResponse(
    (r) => r.request().method() === 'PUT' && new URL(r.url()).pathname.endsWith('/organization'),
  );
  await page.getByRole('button', { name: 'Enregistrer l’organisation', exact: true }).click();
  expect((await conflictResponse).status()).toBe(409);
  await expect(
    page.getByRole('button', { name: 'Retirer le tag Draft', exact: true }),
  ).toBeVisible();
  for (const folderName of folderNames)
    await expect(page.getByRole('checkbox', { name: folderName, exact: true })).toBeChecked();
  await page
    .getByRole('button', { name: 'Recharger et remplacer le brouillon', exact: true })
    .click();
  await expect(page.getByRole('button', { name: 'Retirer le tag Draft', exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByText('Classement rechargé. Tu peux modifier cette version.', { exact: true }),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: testInfo.outputPath('multiple-folder-classification.png'),
    fullPage: true,
  });

  await page
    .getByRole('navigation', { name: 'Navigation principale' })
    .getByRole('link', { name: 'Mes cocktails', exact: true })
    .click();
  const filteredResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname === '/api/cocktails' &&
      url.searchParams.get('search') === prefix &&
      url.searchParams.get('folderId') === folder.id &&
      url.searchParams.get('tagId') === detail.tags[0].id
    );
  });
  await page.getByRole('searchbox', { name: 'Rechercher', exact: true }).fill(prefix);
  await page.getByLabel('Dossier', { exact: true }).selectOption(folder.id);
  await page.getByLabel('Tag', { exact: true }).selectOption(detail.tags[0].id);
  const filtered = (await (await filteredResponse).json()) as {
    total: number;
    items: { id: string }[];
  };
  expect(filtered.total).toBe(1);
  expect(filtered.items[0].id).toBe(created.id);
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );

  const secondFilter = page.waitForResponse((r) => {
    const url = new URL(r.url());
    return (
      url.pathname === '/api/cocktails' &&
      url.searchParams.get('folderId') === folders[1].id &&
      url.searchParams.get('tagId') === detail.tags[0].id
    );
  });
  await page.getByLabel('Dossier', { exact: true }).selectOption(folders[1].id);
  const secondList = (await (await secondFilter).json()) as {
    total: number;
    items: { id: string }[];
  };
  expect(secondList.total).toBe(1);
  expect(secondList.items[0].id).toBe(created.id);

  await page.getByRole('button', { name: 'Déconnexion', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Adresse email', { exact: true }).fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:4200/');
  await page
    .getByRole('navigation', { name: 'Navigation principale' })
    .getByRole('link', { name: 'Mes cocktails', exact: true })
    .click();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();

  await page.getByRole('link', { name: /Nouveau cocktail/ }).click();
  await fillRecipeForm(page, 'New');
  const reservedResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === '/api/cocktails',
  );
  await page.getByRole('button', { name: 'Créer le cocktail', exact: true }).click();
  const reserved = await reservedResponse;
  expect(reserved.status()).toBe(201);
  expect(((await reserved.json()) as { slug: string }).slug).toBe('new-cocktail');
  await expect(page).toHaveURL('http://127.0.0.1:4200/cocktails/new-cocktail');
  await expect(page.getByRole('heading', { name: 'New', exact: true, level: 1 })).toBeVisible();
  // Populate two real catalogue pages without consuming another registration quota.
  const sessionToken = await page.evaluate(() => sessionStorage.getItem('barbook.accessToken'));
  expect(sessionToken).toBeTruthy();
  const headers = { Authorization: `Bearer ${sessionToken}` };
  for (let index = 0; index < 12; index++) {
    const response = await page.request.post('http://127.0.0.1:3000/api/cocktails', {
      headers,
      data: {
        name: `Batch ${suffix} ${String(index).padStart(2, '0')}`,
        type: 'PERSONAL_CREATION',
        method: 'BUILD',
        glass: 'Coupe',
        ingredients: [
          { ingredientName: 'Fixture Gin', ingredientDefaultAbv: 40, amount: 50, unit: 'ML' },
        ],
        steps: ['Préparer la fixture.'],
      },
    });
    expect(response.status()).toBe(201);
  }
  await page
    .getByRole('navigation', { name: 'Navigation principale' })
    .getByRole('link', { name: 'Dossiers', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: collectionName, exact: true })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath('folders-index.png'), fullPage: true });
  await page.getByLabel('Rechercher un dossier', { exact: true }).fill(folderNames[0]);
  const searchedFolders = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === '/api/folders/browse' &&
      new URL(r.url()).searchParams.get('search') === folderNames[0],
  );
  await page.getByRole('button', { name: 'Rechercher', exact: true }).click();
  expect(((await (await searchedFolders).json()) as { total: number }).total).toBe(1);
  await page.getByLabel('Rechercher un dossier', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Rechercher', exact: true }).click();
  await page
    .locator('.folder-card')
    .filter({ has: page.getByRole('heading', { name: collectionName, exact: true }) })
    .click();
  await expect(
    page.getByRole('heading', { name: collectionName, level: 1, exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Ajouter des cocktails', exact: true }).click();
  const firstCandidate = `Batch ${suffix} 00`;
  await page.getByRole('checkbox', { name: firstCandidate, exact: true }).check();
  await page
    .getByRole('navigation', { name: 'Pagination des recettes disponibles' })
    .getByRole('button', { name: 'Suivant', exact: true })
    .click();
  await page.getByRole('checkbox', { name: 'New', exact: true }).check();
  await page.getByRole('checkbox', { name, exact: true }).check();
  await expect(
    page.locator('app-folder-cocktail-picker').getByText('3 sélectionné(s)', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Pagination des recettes disponibles' })
    .getByRole('button', { name: 'Précédent', exact: true })
    .click();
  await expect(page.getByRole('checkbox', { name: firstCandidate, exact: true })).toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const batchResponse = page.waitForResponse(
    (r) =>
      r.request().method() === 'POST' &&
      new URL(r.url()).pathname === `/api/folders/${collection.id}/cocktails`,
  );
  await page.getByRole('button', { name: 'Ajouter la sélection', exact: true }).click();
  expect(await (await batchResponse).json()).toEqual({ added: 3 });
  const members = page.getByLabel('Recettes du dossier', { exact: true });
  await expect(members.getByRole('link', { name, exact: true })).toBeVisible();
  await expect(members.getByRole('link', { name: 'New', exact: true })).toBeVisible();
  const removeResponse = page.waitForResponse(
    (r) =>
      r.request().method() === 'DELETE' &&
      new URL(r.url()).pathname === `/api/folders/${collection.id}/cocktails/${created.id}`,
  );
  await members.getByRole('button', { name: `Retirer ${name} de ce dossier`, exact: true }).click();
  expect(await (await removeResponse).json()).toEqual({ removed: 1 });
  await expect(members.getByRole('link', { name, exact: true })).toHaveCount(0);
  const afterRemove = await page.request.get(
    `http://127.0.0.1:3000/api/cocktails/${created.slug}`,
    { headers },
  );
  expect(afterRemove.status()).toBe(200);
  const retained = (await afterRemove.json()) as {
    folders: { id: string }[];
    tags: { name: string }[];
  };
  expect(retained.folders.map((f) => f.id).sort()).toEqual(folders.map((f) => f.id).sort());
  expect(retained.tags.map((t) => t.name)).toEqual([tagName]);
  await page
    .getByRole('navigation', { name: 'Pagination des recettes disponibles' })
    .getByRole('button', { name: 'Suivant', exact: true })
    .click();
  await page.getByRole('checkbox', { name, exact: true }).check();
  const readdResponse = page.waitForResponse(
    (r) =>
      r.request().method() === 'POST' &&
      new URL(r.url()).pathname === `/api/folders/${collection.id}/cocktails`,
  );
  await page.getByRole('button', { name: 'Ajouter la sélection', exact: true }).click();
  expect(await (await readdResponse).json()).toEqual({ added: 1 });
  await expect(members.getByRole('link', { name, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Fermer la sélection', exact: true }).click();
  const renamedName = `${collectionName} renommée`;
  await page.getByLabel('Nom du dossier', { exact: true }).fill(renamedName);
  const renameResponse = page.waitForResponse(
    (r) =>
      r.request().method() === 'PATCH' &&
      new URL(r.url()).pathname === `/api/folders/${collection.id}`,
  );
  await page.getByRole('button', { name: 'Renommer', exact: true }).click();
  const renamed = await renameResponse;
  expect(renamed.status()).toBe(200);
  expect(((await renamed.json()) as { version: number }).version).toBe(1);
  await expect(
    page.getByRole('heading', { name: renamedName, level: 1, exact: true }),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath('folder-detail-dark.png'), fullPage: true });
  for (const [theme, file] of [
    ['Clair', 'light'],
    ['Contraste élevé', 'contrast'],
  ]) {
    await page.getByRole('button', { name: /Thème d’affichage/ }).click();
    await page
      .getByRole('dialog', { name: 'Choisir le thème d’affichage' })
      .getByRole('button', { name: new RegExp(`^${theme}`) })
      .click();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: testInfo.outputPath(`folder-detail-${file}.png`),
      fullPage: true,
    });
  }
  const deletedResponse = page.waitForResponse(
    (r) =>
      r.request().method() === 'DELETE' &&
      new URL(r.url()).pathname === `/api/folders/${collection.id}`,
  );
  const dialogPromise = page.waitForEvent('dialog');
  const deleteClick = page
    .getByRole('button', { name: 'Supprimer le dossier', exact: true })
    .click();
  const dialog = await dialogPromise;
  expect(dialog.message()).toContain(
    'Les cocktails, leurs tags et leurs autres dossiers seront conservés.',
  );
  await dialog.accept();
  await deleteClick;
  const deletion = await deletedResponse;
  expect(deletion.status()).toBe(200);
  expect(new URL(deletion.url()).searchParams.get('expectedVersion')).toBe('1');
  await expect(page).toHaveURL('http://127.0.0.1:4200/folders');
  await expect(page.getByRole('heading', { name: renamedName, exact: true })).toHaveCount(0);
  const afterDelete = await page.request.get(
    `http://127.0.0.1:3000/api/cocktails/${created.slug}`,
    { headers },
  );
  expect(afterDelete.status()).toBe(200);
  const preserved = (await afterDelete.json()) as {
    folders: { id: string }[];
    tags: { name: string }[];
    ingredients: { amount: number }[];
  };
  expect(preserved.folders.map((f) => f.id).sort()).toEqual(folders.map((f) => f.id).sort());
  expect(preserved.tags.map((t) => t.name)).toEqual([tagName]);
  expect(preserved.ingredients[0].amount).toBe(50);
  expect(
    (
      await page.request.get('http://127.0.0.1:3000/api/cocktails/new-cocktail', { headers })
    ).status(),
  ).toBe(200);
  await page.goto(`/cocktails/${created.slug}`);
  for (const folderName of folderNames)
    await expect(page.getByRole('checkbox', { name: folderName, exact: true })).toBeChecked();
  await page.goto(`/folders/${randomUUID()}`);
  await expect(
    page.getByRole('heading', { name: 'Dossier introuvable', exact: true }),
  ).toBeVisible();
});

test('expired real JWT is rejected by the API, clears storage and returns to login', async ({
  page,
  request,
}) => {
  const registration = await request.post('http://127.0.0.1:3000/api/auth/register', {
    data: {
      email: `expired-${randomUUID()}@example.test`,
      displayName: 'Expiry fixture',
      password,
    },
  });
  expect(registration.status()).toBe(201);
  const auth = (await registration.json()) as { user: { id: string } };
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('A synthetic JWT_SECRET is required for expiry fixtures');
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: auth.user.id,
      iss: 'barbook-api',
      aud: 'barbook-web',
      iat: now - 60,
      exp: now - 1,
    }),
  ).toString('base64url');
  const unsigned = `${header}.${payload}`;
  const expired = `${unsigned}.${createHmac('sha256', secret).update(unsigned).digest('base64url')}`;
  await page.addInitScript(
    (token) => sessionStorage.setItem('barbook.accessToken', token),
    expired,
  );
  const refused = page.waitForResponse(
    (response) => new URL(response.url()).pathname === '/api/auth/me',
  );
  await page.goto('/cocktails');
  expect((await refused).status()).toBe(401);
  await expect(page).toHaveURL('http://127.0.0.1:4200/login?returnUrl=%2Fcocktails');
  expect(await page.evaluate(() => sessionStorage.getItem('barbook.accessToken'))).toBeNull();
  await expect(page.getByRole('button', { name: 'Se connecter', exact: true })).toBeVisible();
});
