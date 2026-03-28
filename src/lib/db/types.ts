export type DatabaseRow = Record<string, unknown>;

export interface DatabaseClient {
  sql<Result = DatabaseRow>(
    queryTemplate: TemplateStringsArray | string,
    ...params: unknown[]
  ): Promise<Result[]>;
}
