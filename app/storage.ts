import { IFilterInfo, IStorageProvider, SimpleFsStorageProvider } from "matrix-bot-sdk";
import { createClient } from 'redis';

import { REDIS_URL } from "settings";

/**
 * A storage provider that uses the disk to store information.
 * @category Storage providers
 */
export class RedisStorageProvider extends SimpleFsStorageProvider {

    private redisClient: any;
    
    /**
     * Creates a new simple file system storage provider.
     * @param {string} filename The file name (typically 'storage.json') to store data within.
     * @param {boolean} trackTransactionsInMemory True (default) to track all received appservice transactions rather than on disk.
     * @param {number} maxInMemoryTransactions The maximum number of transactions to hold in memory before rotating the oldest out. Defaults to 20.
     */
    constructor(filename: string, trackTransactionsInMemory: boolean = true, maxInMemoryTransactions: number = 20) {
        super(filename, trackTransactionsInMemory, maxInMemoryTransactions)
        this.redisClient = createClient({url: REDIS_URL});
        this.redisClient.connect();
    }

    readValue(key: string): string | null | undefined {
        return this.redisClient.get(key)
    }

    storeValue(key: string, value: string): void {
        this.redisClient.set(key, value);
    }

    storageForUser(userId: string): IStorageProvider {
        return new NamespacedRedisProvider(userId, this);
    }
}

/**
 * A namespaced storage provider that uses the disk to store information.
 * @category Storage providers
 */
class NamespacedRedisProvider implements IStorageProvider {
    constructor(private prefix: string, private parent: RedisStorageProvider) {
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
