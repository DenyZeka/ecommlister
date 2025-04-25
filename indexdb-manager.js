class IndexDBManager {
    static dbName = 'ListingDatabase';
    static storeName = 'listedSkus';
    static version = 1;

    static async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'sku' });
                }
            };
        });
    }

    static async addListedSku(sku) {
        try {
            const db = await this.initDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);

                const request = store.add({
                    sku: sku,
                    dateAdded: new Date().toISOString()
                });

                request.onsuccess = () => resolve(true);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Error adding SKU:', error);
            return false;
        }
    }

    static async isSkuListed(sku) {
        try {
            const db = await this.initDB();
            return new Promise((resolve) => {
                const transaction = db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.get(sku);

                request.onsuccess = () => resolve(!!request.result);
                request.onerror = () => resolve(false);
            });
        } catch (error) {
            console.error('Error checking SKU:', error);
            return false;
        }
    }

    static async getAllListedSkus() {
        try {
            const db = await this.initDB();
            return new Promise((resolve) => {
                const transaction = db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.getAll();

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => resolve([]);
            });
        } catch (error) {
            console.error('Error getting SKUs:', error);
            return [];
        }
    }

    static async removeSku(sku) {
        try {
            const db = await this.initDB();
            return new Promise((resolve) => {
                const transaction = db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.delete(sku);

                request.onsuccess = () => resolve(true);
                request.onerror = () => resolve(false);
            });
        } catch (error) {
            console.error('Error removing SKU:', error);
            return false;
        }
    }

    static async clearAllSkus() {
        try {
            const db = await this.initDB();
            return new Promise((resolve) => {
                const transaction = db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.clear();

                request.onsuccess = () => resolve(true);
                request.onerror = () => resolve(false);
            });
        } catch (error) {
            console.error('Error clearing SKUs:', error);
            return false;
        }
    }
}