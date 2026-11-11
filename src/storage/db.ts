/**
 * @license
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 sakibcraft@gmail.com
 * 
 * Local-First IndexedDB Database for AegisMark
 */

import { EncryptedRecord, FolderItem, VaultHeader, DeviceSession } from '../types';

const DB_NAME = 'aegismark_vault_db';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

export async function getDb(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Meta store: stores VaultHeader and local configuration
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }

      // Records store: stores EncryptedRecord objects
      if (!db.objectStoreNames.contains('records')) {
        const recordsStore = db.createObjectStore('records', { keyPath: 'id' });
        recordsStore.createIndex('vaultId', 'vaultId', { unique: false });
        recordsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // Folders store: stores user organization folders
      if (!db.objectStoreNames.contains('folders')) {
        db.createObjectStore('folders', { keyPath: 'id' });
      }

      // Devices store: stores registered device sessions
      if (!db.objectStoreNames.contains('devices')) {
        db.createObjectStore('devices', { keyPath: 'deviceId' });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Meta Store Operations
export async function saveVaultHeader(header: VaultHeader): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['meta'], 'readwrite');
    const store = tx.objectStore('meta');
    store.put({ key: 'vault_header', value: header });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getVaultHeader(): Promise<VaultHeader | null> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['meta'], 'readonly');
    const store = tx.objectStore('meta');
    const req = store.get('vault_header');
    req.onsuccess = () => resolve(req.result ? req.result.value : null);
    req.onerror = () => reject(req.error);
  });
}

export async function saveMetaValue<T>(key: string, value: T): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['meta'], 'readwrite');
    const store = tx.objectStore('meta');
    store.put({ key, value });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getMetaValue<T>(key: string): Promise<T | null> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['meta'], 'readonly');
    const store = tx.objectStore('meta');
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result ? req.result.value : null);
    req.onerror = () => reject(req.error);
  });
}

// Encrypted Records Operations
export async function putEncryptedRecord(record: EncryptedRecord): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['records'], 'readwrite');
    const store = tx.objectStore('records');
    store.put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function putBatchEncryptedRecords(records: EncryptedRecord[]): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['records'], 'readwrite');
    const store = tx.objectStore('records');
    for (const r of records) {
      store.put(r);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllEncryptedRecords(): Promise<EncryptedRecord[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['records'], 'readonly');
    const store = tx.objectStore('records');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteEncryptedRecord(id: string): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['records'], 'readwrite');
    const store = tx.objectStore('records');
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Folders Operations
export async function getAllFolders(): Promise<FolderItem[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['folders'], 'readonly');
    const store = tx.objectStore('folders');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function putFolder(folder: FolderItem): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['folders'], 'readwrite');
    const store = tx.objectStore('folders');
    store.put(folder);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteFolder(id: string): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['folders'], 'readwrite');
    const store = tx.objectStore('folders');
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Devices Operations
export async function getAllDevices(): Promise<DeviceSession[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['devices'], 'readonly');
    const store = tx.objectStore('devices');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function putDevice(device: DeviceSession): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['devices'], 'readwrite');
    const store = tx.objectStore('devices');
    store.put(device);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteDevice(deviceId: string): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['devices'], 'readwrite');
    const store = tx.objectStore('devices');
    store.delete(deviceId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Storage Quota Diagnostics
export async function getStorageDiagnostics(): Promise<{
  usageBytes: number;
  quotaBytes: number;
  percentageUsed: number;
  recordCount: number;
}> {
  let usageBytes = 0;
  let quotaBytes = 0;

  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      usageBytes = estimate.usage || 0;
      quotaBytes = estimate.quota || 0;
    } catch {
      // ignore
    }
  }

  const records = await getAllEncryptedRecords();
  const percentageUsed = quotaBytes > 0 ? (usageBytes / quotaBytes) * 100 : 0;

  return {
    usageBytes,
    quotaBytes,
    percentageUsed,
    recordCount: records.length
  };
}

// Reset Entire Local Database (for account deletion or full reset)
export async function clearEntireDatabase(): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['meta', 'records', 'folders', 'devices'], 'readwrite');
    tx.objectStore('meta').clear();
    tx.objectStore('records').clear();
    tx.objectStore('folders').clear();
    tx.objectStore('devices').clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
