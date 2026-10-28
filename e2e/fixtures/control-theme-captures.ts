import { expect, Page, TestInfo } from '@playwright/test';

/** Capture actual native controls in both supported everyday themes through the UI. */
export async function captureControlThemes(page: Page, info: TestInfo, name: string): Promise<void> {
  for (const [label, value] of [['Clair', 'light'], ['Sombre', 'dark']]) {
    await page.getByRole('button', { name: /Thème d’affichage/ }).click();
    await page.getByRole('dialog', { name: 'Choisir le thème d’affichage' })
      .getByRole('button', { name: new RegExp(`^${label}`) }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', value);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`${name}-${value}.png`), fullPage: true, animations: 'disabled' });
  }
}
