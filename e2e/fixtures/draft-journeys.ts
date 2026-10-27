import { expect, Page } from '@playwright/test';

export function acceptDraftNavigation(page: Page): void {
  page.on('dialog', async (dialog) => {
    if (dialog.type() === 'beforeunload' || dialog.message().startsWith('Quitter'))
      await dialog.accept();
  });
}

export async function restoreCreationAfterRefresh(page: Page, name: string): Promise<void> {
  let posts = 0;
  const count = (request: import('@playwright/test').Request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/cocktails')
      posts++;
  };
  page.on('request', count);
  try {
    await page.reload();
    await expect(
      page.getByRole('button', { name: 'Restaurer le brouillon', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('textbox', { name: /^Nom \*/ })).toHaveValue('');
    expect(posts).toBe(0);
    await page.getByRole('button', { name: 'Restaurer le brouillon', exact: true }).click();
    await expect(page.getByRole('textbox', { name: /^Nom \*/ })).toHaveValue(name);
    await expect(page.getByRole('spinbutton', { name: /^Quantité/ })).toHaveValue('5');
    await expect(page.getByRole('combobox', { name: /^Unité/ })).toHaveValue('CL');
    expect(posts).toBe(0);
  } finally {
    page.off('request', count);
  }
}

export async function restoreConflictedOrganization(page: Page): Promise<void> {
  await page.reload();
  await page.getByRole('button', { name: 'Modifier les dossiers et tags', exact: true }).click();
  await page.getByRole('button', { name: 'Restaurer le brouillon', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Retirer le tag Draft', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Enregistrer l’organisation', exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText('Une version serveur plus récente existe.', { exact: false }),
  ).toBeVisible();
}

/** The request really commits in PostgreSQL; only its response is deliberately lost. */
export async function loseCreationResponse(
  page: Page,
  name: string,
  fill: (page: Page, name: string) => Promise<void>,
  headers: Record<string, string>,
): Promise<void> {
  await page.goto('/cocktails/new');
  await fill(page, name);
  let posts = 0;
  let committed: { slug: string } | undefined;
  const pattern = '**/api/cocktails';
  await page.route(pattern, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    posts++;
    const response = await route.fetch();
    expect(response.status()).toBe(201);
    committed = (await response.json()) as { slug: string };
    await route.abort('failed');
  });
  try {
    await page.getByRole('button', { name: 'Créer le cocktail', exact: true }).click();
    await expect(
      page.getByText('Résultat de la dernière opération inconnu.', { exact: false }),
    ).toBeVisible();
    expect(posts).toBe(1);
    expect(committed).toBeDefined();
    await page.reload();
    await page.getByRole('button', { name: 'Restaurer le brouillon', exact: true }).click();
    await expect(page.getByRole('textbox', { name: /^Nom \*/ })).toHaveValue(name);
    await expect(
      page.getByRole('button', { name: 'Créer le cocktail', exact: true }),
    ).toBeDisabled();
    const actual = await page.request.get(
      `http://127.0.0.1:3000/api/cocktails/${committed!.slug}`,
      { headers },
    );
    expect(actual.status()).toBe(200);
    expect(((await actual.json()) as { name: string }).name).toBe(name);
    expect(posts).toBe(1);
    await page.getByRole('button', { name: 'Abandonner le brouillon', exact: true }).click();
  } finally {
    await page.unroute(pattern);
  }
}

/** Real browser quota exceptions at the storage boundary, without replacing any API. */
export async function exerciseDraftQuota(page: Page): Promise<void> {
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key === 'barbook.drafts.v1')
        throw new DOMException('Fixture quota exhausted', 'QuotaExceededError');
      return original.call(this, key, value);
    };
    (window as unknown as { restoreDraftStorage: () => void }).restoreDraftStorage = () => {
      Storage.prototype.setItem = original;
    };
  });
  try {
    await page.getByRole('textbox', { name: /^Nom \*/ }).fill('Quota draft');
    await expect(
      page.getByText('Stockage navigateur indisponible ou saturé.', { exact: false }),
    ).toBeVisible();
    await page
      .getByRole('navigation', { name: 'Navigation principale' })
      .getByRole('link', { name: 'Mes cocktails', exact: true })
      .click();
    await page.getByRole('link', { name: /Nouveau cocktail/ }).click();
    await page.getByRole('button', { name: 'Restaurer le brouillon', exact: true }).click();
    await expect(page.getByRole('textbox', { name: /^Nom \*/ })).toHaveValue('Quota draft');
    await page.getByRole('button', { name: 'Abandonner le brouillon', exact: true }).click();
  } finally {
    // Preserve the original failing assertion if Playwright is already tearing down.
    if (!page.isClosed())
      await page
        .evaluate(() =>
          (window as unknown as { restoreDraftStorage: () => void }).restoreDraftStorage(),
        )
        .catch((error) => {
          if (!page.isClosed()) throw error;
        });
  }
}
