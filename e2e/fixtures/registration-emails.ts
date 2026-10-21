/** Exact synthetic addresses shared by the runner and its API process. */
export function browserFixtureEmail(project: string, journey: 'browser' | 'expired'): string {
  const runId = process.env.BARBOOK_BROWSER_RUN_ID;
  if (!runId || !/^[a-f0-9-]{36}$/.test(runId) || !['desktop', 'mobile'].includes(project)) {
    throw new Error('Disposable browser registration fixture is not configured.');
  }
  return `${journey}-${project}-${runId}@example.test`;
}
