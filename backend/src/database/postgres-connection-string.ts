export interface PostgresConnectionSettings {
  user: string;
  password: string;
  host: string;
  port: string;
  database: string;
}

/**
 * Construit une URL PostgreSQL en encodant les valeurs pouvant contenir des caractères spéciaux.
 */
export function buildPostgresConnectionString(
  settings: PostgresConnectionSettings,
): string {
  const user = encodeURIComponent(settings.user);
  const password = encodeURIComponent(settings.password);
  const database = encodeURIComponent(settings.database);

  return `postgresql://${user}:${password}@${settings.host}:${settings.port}/${database}?schema=public`;
}
