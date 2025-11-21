import type { capDataStorageOptions, JsonStore } from '../definitions';
import { Data } from './Data';
export declare class StorageDatabaseHelper {
    private _db;
    private _dbName;
    private _tableName;
    constructor(dbName: string, tableName: string);
    openStore(dbName: string, tableName: string): boolean;
    setConfig(dbName: string, tableName: string): any;
    setTable(tableName: string): Promise<void>;
    isTable(table: string): Promise<boolean>;
    tables(): Promise<string[]>;
    set(data: Data): Promise<void>;
    get(name: string): Promise<Data>;
    remove(name: string): Promise<void>;
    clear(): Promise<void>;
    keys(): Promise<string[]>;
    values(): Promise<string[]>;
    keysvalues(): Promise<Data[]>;
    iskey(name: string): Promise<boolean>;
    importJson(values: capDataStorageOptions[]): Promise<number>;
    exportJson(): Promise<JsonStore>;
}
