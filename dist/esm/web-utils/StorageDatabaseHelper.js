//import LocalForage from 'jeep-localforage';
import localForage from 'localforage';
import { Data } from './Data';
//const DATABASE: string = "storageIDB";
//const STORAGESTORE: string = "storage_store";
export class StorageDatabaseHelper {
    constructor(dbName, tableName) {
        this._db = null;
        const res = this.openStore(dbName, tableName);
        if (res) {
            this._dbName = dbName;
            this._tableName = tableName;
        }
        else {
            this._dbName = '';
            this._tableName = '';
            throw new Error('openStore return false');
        }
    }
    openStore(dbName, tableName) {
        let ret = false;
        const config = this.setConfig(dbName, tableName);
        this._db = localForage.createInstance(config);
        if (this._db != null) {
            this._dbName = dbName;
            ret = true;
        }
        return ret;
    }
    setConfig(dbName, tableName) {
        const config = {
            name: dbName,
            storeName: tableName,
            driver: [localForage.INDEXEDDB, localForage.WEBSQL],
            version: 1,
        };
        return config;
    }
    async setTable(tableName) {
        const res = this.openStore(this._dbName, tableName);
        if (res) {
            return Promise.resolve();
        }
        else {
            return Promise.reject(new Error('openStore return false'));
        }
    }
    async isTable(table) {
        if (this._db == null) {
            return Promise.reject(`isTable: this.db is null`);
        }
        try {
            let ret = false;
            const tables = await this.tables();
            if (tables.includes(table))
                ret = true;
            return Promise.resolve(ret);
        }
        catch (err) {
            return Promise.reject(err);
        }
    }
    async tables() {
        return new Promise((resolve, reject) => {
            // Let us open our database
            const DBOpenRequest = window.indexedDB.open(this._dbName);
            // these two event handlers act on the database being opened successfully, or not
            DBOpenRequest.onerror = () => {
                return reject(`Error loading database ${this._dbName}`);
            };
            DBOpenRequest.onsuccess = () => {
                let result = [];
                const db = DBOpenRequest.result;
                const retList = db.objectStoreNames;
                const values = Object.values(retList);
                for (const val of values) {
                    if (val.substring(0, 12) != 'local-forage') {
                        result = [...result, val];
                    }
                }
                return resolve(result);
            };
        });
    }
    async set(data) {
        try {
            await this._db.setItem(data.name, data.value);
            return Promise.resolve();
        }
        catch (err) {
            return Promise.reject(err);
        }
    }
    async get(name) {
        try {
            const value = await this._db.getItem(name);
            const data = new Data();
            data.name = name;
            data.value = value;
            return Promise.resolve(data);
        }
        catch (err) {
            return Promise.reject(err);
        }
    }
    async remove(name) {
        return this._db
            .removeItem(name)
            .then(() => {
            return Promise.resolve();
        })
            .catch((error) => {
            return Promise.reject(error);
        });
    }
    async clear() {
        return this._db
            .clear()
            .then(() => {
            return Promise.resolve();
        })
            .catch((error) => {
            return Promise.reject(error);
        });
    }
    async keys() {
        return this._db
            .keys()
            .then((keys) => {
            return Promise.resolve(keys);
        })
            .catch((error) => {
            return Promise.reject(error);
        });
    }
    async values() {
        const values = [];
        return this._db
            .iterate((value) => {
            values.push(value);
        })
            .then(() => {
            return Promise.resolve(values);
        })
            .catch((error) => {
            return Promise.reject(error);
        });
    }
    async keysvalues() {
        const keysvalues = [];
        return this._db
            .iterate((value, key) => {
            const data = new Data();
            data.name = key;
            data.value = value;
            keysvalues.push(data);
        })
            .then(() => {
            return Promise.resolve(keysvalues);
        })
            .catch((error) => {
            return Promise.reject(error);
        });
    }
    async iskey(name) {
        return this.get(name)
            .then((data) => {
            if (data.value != null) {
                return Promise.resolve(true);
            }
            else {
                return Promise.resolve(false);
            }
        })
            .catch((error) => {
            return Promise.reject(error);
        });
    }
    async importJson(values) {
        let changes = 0;
        for (const val of values) {
            try {
                const data = new Data();
                data.name = val.key;
                data.value = val.value;
                await this.set(data);
                changes += 1;
            }
            catch (err) {
                return Promise.reject(err);
            }
        }
        return Promise.resolve(changes);
    }
    async exportJson() {
        const retJson = {};
        const prevTableName = this._tableName;
        try {
            retJson.database = this._dbName.slice(0, -3);
            retJson.encrypted = false;
            retJson.tables = [];
            // get the table list
            const tables = await this.tables();
            for (const table of tables) {
                this._tableName = table;
                const retTable = {};
                retTable.name = table;
                retTable.values = [];
                const res = this.openStore(this._dbName, this._tableName);
                if (res) {
                    const dataTable = await this.keysvalues();
                    for (const tdata of dataTable) {
                        const retData = {};
                        if (tdata.name != null) {
                            retData.key = tdata.name;
                            retData.value = tdata.value;
                            retTable.values = [...retTable.values, retData];
                        }
                        else {
                            return Promise.reject('Data.name is undefined');
                        }
                    }
                    retJson.tables = [...retJson.tables, retTable];
                }
                else {
                    const msg = `Could not open ${this._dbName} ${this._tableName} `;
                    this._tableName = prevTableName;
                    return Promise.reject(msg);
                }
            }
            this._tableName = prevTableName;
            const res = this.openStore(this._dbName, this._tableName);
            if (res) {
                return Promise.resolve(retJson);
            }
            else {
                const msg = `Could not open ${this._dbName} ${this._tableName} `;
                return Promise.reject(msg);
            }
        }
        catch (err) {
            this._tableName = prevTableName;
            return Promise.reject(err);
        }
    }
}
//# sourceMappingURL=StorageDatabaseHelper.js.map