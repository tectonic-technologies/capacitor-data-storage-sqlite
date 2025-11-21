'use strict';

var core = require('@capacitor/core');
var localForage = require('localforage');

const CapgoCapacitorDataStorageSqlite = core.registerPlugin('CapgoCapacitorDataStorageSqlite', {
    web: () => Promise.resolve().then(function () { return web; }).then((m) => new m.CapgoCapacitorDataStorageSqliteWeb()),
    electron: () => window.CapacitorCustomPlatform.plugins.CapacitorDataStorageSqlite,
});

class Data {
}

//import LocalForage from 'jeep-localforage';
//const DATABASE: string = "storageIDB";
//const STORAGESTORE: string = "storage_store";
class StorageDatabaseHelper {
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

/**
 * IsJsonSQLite
 * @param obj
 */
const isJsonStore = (obj) => {
    const keyFirstLevel = ['database', 'encrypted', 'tables'];
    if (obj == null || (Object.keys(obj).length === 0 && obj.constructor === Object))
        return false;
    for (const key of Object.keys(obj)) {
        if (keyFirstLevel.indexOf(key) === -1)
            return false;
        if (key === 'database' && typeof obj[key] != 'string')
            return false;
        if (key === 'encrypted' && typeof obj[key] != 'boolean')
            return false;
        if (key === 'tables' && typeof obj[key] != 'object')
            return false;
        if (key === 'tables') {
            for (const oKey of obj[key]) {
                const retTable = isTable(oKey);
                if (!retTable)
                    return false;
            }
        }
    }
    return true;
};
/**
 * IsTable
 * @param obj
 */
const isTable = (obj) => {
    const keyTableLevel = ['name', 'values'];
    if (obj == null || (Object.keys(obj).length === 0 && obj.constructor === Object)) {
        return false;
    }
    for (const key of Object.keys(obj)) {
        if (keyTableLevel.indexOf(key) === -1)
            return false;
        if (key === 'name' && typeof obj[key] != 'string')
            return false;
        if (key === 'values' && typeof obj[key] != 'object')
            return false;
        if (key === 'values') {
            for (const oKey of obj[key]) {
                const retValue = isValue(oKey);
                if (!retValue)
                    return false;
            }
        }
    }
    return true;
};
/**
 * IsValue
 * @param obj
 */
const isValue = (obj) => {
    const keyTableLevel = ['key', 'value'];
    if (obj == null || (Object.keys(obj).length === 0 && obj.constructor === Object)) {
        return false;
    }
    for (const key of Object.keys(obj)) {
        if (keyTableLevel.indexOf(key) === -1)
            return false;
        if (key === 'key' && typeof obj[key] != 'string')
            return false;
        if (key === 'value' && typeof obj[key] != 'string')
            return false;
    }
    return true;
};

class CapgoCapacitorDataStorageSqliteWeb extends core.WebPlugin {
    async openStore(options) {
        const dbName = options.database ? `${options.database}IDB` : 'storageIDB';
        const tableName = options.table ? options.table : 'storage_store';
        try {
            this.mDb = new StorageDatabaseHelper(dbName, tableName);
            return Promise.resolve();
        }
        catch (err) {
            return Promise.reject(`OpenStore: ${err.message}`);
        }
    }
    async closeStore(options) {
        throw new Error(`Method closeStore not implemented. ${options}`);
    }
    async isStoreOpen(options) {
        throw new Error(`Method isStoreOpen not implemented. ${options}`);
    }
    async isStoreExists(options) {
        throw new Error(`Method isStoreExists not implemented. ${options}`);
    }
    async setTable(options) {
        const tableName = options.table;
        if (tableName == null) {
            return Promise.reject('SetTable: Must provide a table name');
        }
        if (this.mDb) {
            try {
                await this.mDb.setTable(tableName);
                return Promise.resolve();
            }
            catch (err) {
                return Promise.reject(`SetTable: ${err.message}`);
            }
        }
        else {
            return Promise.reject('SetTable: Must open a store first');
        }
    }
    async set(options) {
        const key = options.key;
        if (key == null || typeof key != 'string') {
            return Promise.reject('Set: Must provide key as string');
        }
        const value = options.value ? options.value : null;
        if (value == null || typeof value != 'string') {
            return Promise.reject('Set: Must provide value as string');
        }
        const data = new Data();
        data.name = key;
        data.value = value;
        try {
            await this.mDb.set(data);
            return Promise.resolve();
        }
        catch (err) {
            return Promise.reject(`Set: ${err.message}`);
        }
    }
    async get(options) {
        const key = options.key;
        if (key == null || typeof key != 'string') {
            return Promise.reject('Get: Must provide key as string');
        }
        try {
            const data = await this.mDb.get(key);
            if ((data === null || data === void 0 ? void 0 : data.value) != null) {
                return Promise.resolve({ value: data.value });
            }
            else {
                return Promise.resolve({ value: '' });
            }
        }
        catch (err) {
            return Promise.reject(`Get: ${err.message}`);
        }
    }
    async remove(options) {
        const key = options.key;
        if (key == null || typeof key != 'string') {
            return Promise.reject('Remove: Must provide key as string');
        }
        try {
            await this.mDb.remove(key);
            return Promise.resolve();
        }
        catch (err) {
            return Promise.reject(`Remove: ${err.message}`);
        }
    }
    async clear() {
        try {
            await this.mDb.clear();
            return Promise.resolve();
        }
        catch (err) {
            return Promise.reject(`Clear: ${err.message}`);
        }
    }
    async iskey(options) {
        const key = options.key;
        if (key == null || typeof key != 'string') {
            return Promise.reject('Iskey: Must provide key as string');
        }
        try {
            const ret = await this.mDb.iskey(key);
            return Promise.resolve({ result: ret });
        }
        catch (err) {
            return Promise.reject(`Iskey: ${err.message}`);
        }
    }
    async keys() {
        try {
            const ret = await this.mDb.keys();
            return Promise.resolve({ keys: ret });
        }
        catch (err) {
            return Promise.reject(`Keys: ${err.message}`);
        }
    }
    async values() {
        try {
            const ret = await this.mDb.values();
            return Promise.resolve({ values: ret });
        }
        catch (err) {
            return Promise.reject(`Values: ${err.message}`);
        }
    }
    async filtervalues(options) {
        const filter = options.filter;
        if (filter == null || typeof filter != 'string') {
            return Promise.reject('Filtervalues: Must provide filter as string');
        }
        let regFilter;
        if (filter.startsWith('%')) {
            regFilter = new RegExp('^' + filter.substring(1), 'i');
        }
        else if (filter.endsWith('%')) {
            regFilter = new RegExp(filter.slice(0, -1) + '$', 'i');
        }
        else {
            regFilter = new RegExp(filter, 'i');
        }
        try {
            const ret = [];
            const results = await this.mDb.keysvalues();
            for (const result of results) {
                if (result.name != null && regFilter.test(result.name)) {
                    if (result.value != null) {
                        ret.push(result.value);
                    }
                    else {
                        return Promise.reject(`Filtervalues: result.value is null`);
                    }
                }
            }
            return Promise.resolve({ values: ret });
        }
        catch (err) {
            return Promise.reject(`Filtervalues: ${err.message}`);
        }
    }
    async keysvalues() {
        try {
            const ret = [];
            const results = await this.mDb.keysvalues();
            for (const result of results) {
                if (result.name != null && result.value != null) {
                    const res = { key: result.name, value: result.value };
                    ret.push(res);
                }
                else {
                    return Promise.reject(`Keysvalues: result.name/value are null`);
                }
            }
            return Promise.resolve({ keysvalues: ret });
        }
        catch (err) {
            return Promise.reject(`Keysvalues: ${err.message}`);
        }
    }
    async deleteStore(options) {
        throw new Error(`Method deleteStore not implemented. ${options}`);
    }
    async isTable(options) {
        const table = options.table;
        if (table == null) {
            return Promise.reject('Must provide a Table Name');
        }
        try {
            const ret = await this.mDb.isTable(table);
            return Promise.resolve({ result: ret });
        }
        catch (err) {
            return Promise.reject(err);
        }
    }
    async tables() {
        try {
            const ret = await this.mDb.tables();
            return Promise.resolve({ tables: ret });
        }
        catch (err) {
            return Promise.reject(err);
        }
    }
    async deleteTable(options) {
        throw new Error(`Method deleteTable not implemented. ${options}`);
    }
    async importFromJson(options) {
        const keys = Object.keys(options);
        if (!keys.includes('jsonstring')) {
            return Promise.reject('Must provide a json object');
        }
        let totalChanges = 0;
        if (options === null || options === void 0 ? void 0 : options.jsonstring) {
            const jsonStrObj = options.jsonstring;
            const jsonObj = JSON.parse(jsonStrObj);
            const isValid = isJsonStore(jsonObj);
            if (!isValid) {
                return Promise.reject('Must provide a valid JsonSQLite Object');
            }
            const vJsonObj = jsonObj;
            const dbName = vJsonObj.database ? `${vJsonObj.database}IDB` : 'storageIDB';
            for (const table of vJsonObj.tables) {
                const tableName = table.name ? table.name : 'storage_store';
                try {
                    this.mDb = new StorageDatabaseHelper(dbName, tableName);
                    // Open the database
                    const bRet = this.mDb.openStore(dbName, tableName);
                    if (bRet) {
                        // Import the JsonSQLite Object
                        if (table === null || table === void 0 ? void 0 : table.values) {
                            const changes = await this.mDb.importJson(table.values);
                            totalChanges += changes;
                        }
                    }
                    else {
                        return Promise.reject(`Open store: ${dbName} : table: ${tableName} failed`);
                    }
                }
                catch (err) {
                    return Promise.reject(`ImportFromJson: ${err.message}`);
                }
            }
            return Promise.resolve({ changes: totalChanges });
        }
        else {
            return Promise.reject('Must provide a json object');
        }
    }
    async isJsonValid(options) {
        const keys = Object.keys(options);
        if (!keys.includes('jsonstring')) {
            return Promise.reject('Must provide a json object');
        }
        if (options === null || options === void 0 ? void 0 : options.jsonstring) {
            const jsonStrObj = options.jsonstring;
            const jsonObj = JSON.parse(jsonStrObj);
            const isValid = isJsonStore(jsonObj);
            if (!isValid) {
                return Promise.reject('Stringify Json Object not Valid');
            }
            else {
                return Promise.resolve({ result: true });
            }
        }
        else {
            return Promise.reject('Must provide in options a stringify Json Object');
        }
    }
    async exportToJson() {
        try {
            const ret = await this.mDb.exportJson();
            return Promise.resolve({ export: ret });
        }
        catch (err) {
            return Promise.reject(`exportToJson: ${err}`);
        }
    }
    async getPluginVersion() {
        return { version: 'web' };
    }
}

var web = /*#__PURE__*/Object.freeze({
    __proto__: null,
    CapgoCapacitorDataStorageSqliteWeb: CapgoCapacitorDataStorageSqliteWeb
});

exports.CapgoCapacitorDataStorageSqlite = CapgoCapacitorDataStorageSqlite;
//# sourceMappingURL=plugin.cjs.js.map
