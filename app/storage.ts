import { IFilterInfo, IStorageProvider, SimpleFsStorageProvider } from "matrix-bot-sdk";
import Keyv = require("keyv");

import { KEYV_URL } from "settings";

/**
 * A storage provider that uses the disk to store information.
 * @category Storage providers
 */
export class KeyvStorageProvider extends SimpleFsStorageProvider {

    private keyv: any;
    
    /**
     * Creates a new simple file system storage provider.
     * @param {string} filename The file name (typically 'storage.json') to store data within.
     * @param {boolean} trackTransactionsInMemory True (default) to track all received appservice transactions rather than on disk.
     * @param {number} maxInMemoryTransactions The maximum number of transactions to hold in memory before rotating the oldest out. Defaults to 20.
     */
    constructor(filename: string, trackTransactionsInMemory: boolean = true, maxInMemoryTransactions: number = 20) {
        super(filename, trackTransactionsInMemory, maxInMemoryTransactions)
        this.keyv = new Keyv(KEYV_URL);
    }

    readValue(key: string): string | null | undefined {
        return this.keyv.get(key)
    }

    storeValue(key: string, value: string): void {
        this.keyv.set(key, value);
    }

    storageForUser(userId: string): IStorageProvider {
        return new NamespacedKeyvProvider(userId, this);
    }
}

/**
 * A namespaced storage provider that uses the disk to store information.
 * @category Storage providers
 */
class NamespacedKeyvProvider implements IStorageProvider {
    constructor(private prefix: string, private parent: KeyvStorageProvider) {
    }

    setFilter(filter: IFilterInfo): Promise<any> | void {
        return this.parent.storeValue(`${this.prefix}_int_filter`, JSON.stringify(filter));
    }

    getFilter(): IFilterInfo | Promise<IFilterInfo> {
        return Promise.resolve(this.parent.readValue(`${this.prefix}_int_filter`)).then(r => r ? JSON.parse(r) : r);
    }

    setSyncToken(token: string | null): Promise<any> | void {
        return this.parent.storeValue(`${this.prefix}_int_syncToken`, token || "");
    }

    getSyncToken(): string | Promise<string | null> | null {
        return Promise.resolve(this.parent.readValue(`${this.prefix}_int_syncToken`)).then(r => r ?? null);
    }

    readValue(key: string): string | Promise<string | null | undefined> | null | undefined {
        return this.parent.readValue(`${this.prefix}_kv_${key}`);
    }

    storeValue(key: string, value: string): Promise<any> | void {
        return this.parent.storeValue(`${this.prefix}_kv_${key}`, value);
    }
}
