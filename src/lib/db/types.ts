export type DatabaseRow = Record<string, unknown>;

export interface DatabaseClient {
  sql<Result = DatabaseRow>(
    queryTemplate: TemplateStringsArray | string,
    ...params: unknown[]
  ): Promise<Result[]>;
  transaction<Result>(
    callback: (transaction: Pick<DatabaseClient, 'sql'>) => Promise<Result>,
  ): Promise<Result>;
}
