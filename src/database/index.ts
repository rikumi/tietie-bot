import path from 'path';
import fs from 'fs';

export interface IDatabase {
  run(sql: string, params?: any[]): Promise<number>;
  get<T = any>(sql: string, params?: any[]): Promise<T | undefined>;
  all<T = any>(sql: string, params?: any[]): Promise<T[]>;
  prepare(sql: string): Promise<{
    run(params?: any[]): Promise<number>;
    get<T = any>(params?: any[]): Promise<T | undefined>;
    all<T = any>(params?: any[]): Promise<T[]>;
    finalize(): Promise<void>;
  }>
}

const dbPromise = (async () => {
  // @ts-ignore
  const { Database } = await import('sqlite-async');
  const db: IDatabase = await Database.open(path.resolve(__dirname, '../../database.db'));
  return db;
})();

export const getDatabase = () => dbPromise;

fs.readdirSync(__dirname).forEach((fileName) => {
  if (fileName === __filename) return;
  const file = path.resolve(__dirname, fileName);
  if (!/\.ts$/.test(file)) return;
  import(file).then(({ init }) => init?.());
});
