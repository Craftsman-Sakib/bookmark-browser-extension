/**
 * @license
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 sakibcraft@gmail.com
 * 
 * Bookmark Store and Manager
 */

import { BookmarkItem, EncryptedRecord, FolderItem } from '../types';
import {
  decryptBookmarkRecord,
  encryptBookmarkRecord
} from '../crypto/engine';
import {
  getAllEncryptedRecords,
  putEncryptedRecord,
  deleteEncryptedRecord as deleteFromDb,
  getAllFolders,
  putFolder
} from './db';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Default initial folders for new vaults
export const DEFAULT_FOLDERS: FolderItem[] = [
  { id: 'f_work', name: 'Work & Projects', color: '#3B82F6', createdAt: Date.now() },
  { id: 'f_research', name: 'Security & Research', color: '#10B981', createdAt: Date.now() },
  { id: 'f_reading', name: 'Reading List', color: '#8B5CF6', createdAt: Date.now() },
  { id: 'f_tools', name: 'Tools & Utilities', color: '#F59E0B', createdAt: Date.now() }
];

/**
 * Initializes default folders if none exist.
 */
export async function initializeDefaultFolders(): Promise<FolderItem[]> {
  const existing = await getAllFolders();
  if (existing.length === 0) {
    for (const folder of DEFAULT_FOLDERS) {
      await putFolder(folder);
    }
    return DEFAULT_FOLDERS;
  }
  return existing;
}

/**
 * Loads and decrypts all bookmark items from IndexedDB using active session RecordKey.
 */
export async function loadAndDecryptAllBookmarks(
  recordKey: CryptoKey,
  vaultId: string
): Promise<BookmarkItem[]> {
  const encryptedRecords = await getAllEncryptedRecords();
  const decryptedItems: BookmarkItem[] = [];

  for (const record of encryptedRecords) {
    try {
      const item = await decryptBookmarkRecord(record, recordKey, vaultId);
      decryptedItems.push(item);
    } catch (err) {
      console.warn(`Failed to decrypt record ${record.id}:`, err);
    }
  }

  return decryptedItems;
}

/**
 * Encrypts and persists a new or edited bookmark item.
 */
export async function saveBookmark(
  item: BookmarkItem,
  recordKey: CryptoKey,
  vaultId: string,
  keyVersion: number = 1
): Promise<EncryptedRecord> {
  const encrypted = await encryptBookmarkRecord(item, recordKey, vaultId, keyVersion);
  await putEncryptedRecord(encrypted);
  return encrypted;
}

/**
 * Moves a bookmark to the 30-day Trash (soft-delete).
 */
export async function softDeleteBookmark(
  item: BookmarkItem,
  recordKey: CryptoKey,
  vaultId: string,
  keyVersion: number = 1
): Promise<void> {
  const trashedItem: BookmarkItem = {
    ...item,
    isInTrash: true,
    trashedAt: Date.now(),
    updatedAt: Date.now()
  };
  await saveBookmark(trashedItem, recordKey, vaultId, keyVersion);
}

/**
 * Restores a bookmark from the Trash.
 */
export async function restoreBookmark(
  item: BookmarkItem,
  recordKey: CryptoKey,
  vaultId: string,
  keyVersion: number = 1
): Promise<void> {
  const restoredItem: BookmarkItem = {
    ...item,
    isInTrash: false,
    trashedAt: undefined,
    updatedAt: Date.now()
  };
  await saveBookmark(restoredItem, recordKey, vaultId, keyVersion);
}

/**
 * Permanently deletes a bookmark from IndexedDB.
 */
export async function permanentlyDeleteBookmark(id: string): Promise<void> {
  await deleteFromDb(id);
}

/**
 * Empties all bookmarks currently in the Trash.
 */
export async function emptyTrash(
  bookmarks: BookmarkItem[]
): Promise<void> {
  const trashed = bookmarks.filter(b => b.isInTrash);
  for (const b of trashed) {
    await deleteFromDb(b.id);
  }
}

/**
 * Automatically purges bookmarks that have been in the Trash for more than 30 days.
 */
export async function autoPruneOldTrash(
  bookmarks: BookmarkItem[]
): Promise<number> {
  const now = Date.now();
  let prunedCount = 0;

  for (const item of bookmarks) {
    if (item.isInTrash && item.trashedAt && (now - item.trashedAt) > THIRTY_DAYS_MS) {
      await deleteFromDb(item.id);
      prunedCount++;
    }
  }

  return prunedCount;
}

/**
 * Filters and searches decrypted bookmarks client-side.
 */
export function filterBookmarks(
  items: BookmarkItem[],
  options: {
    query?: string;
    folderId?: string | null;
    tag?: string | null;
    onlyFavorites?: boolean;
    inTrash?: boolean;
  }
): BookmarkItem[] {
  const { query, folderId, tag, onlyFavorites, inTrash = false } = options;
  const q = (query || '').trim().toLowerCase();

  return items.filter(b => {
    // Trash filter
    if (inTrash) {
      if (!b.isInTrash) return false;
    } else {
      if (b.isInTrash) return false;
    }

    // Favorite filter
    if (onlyFavorites && !b.isFavorite) return false;

    // Folder filter
    if (folderId && b.folderId !== folderId) return false;

    // Tag filter
    if (tag && !b.tags.includes(tag)) return false;

    // Search query
    if (q) {
      const matchTitle = b.title.toLowerCase().includes(q);
      const matchUrl = b.url.toLowerCase().includes(q);
      const matchNotes = (b.notes || '').toLowerCase().includes(q);
      const matchDesc = (b.description || '').toLowerCase().includes(q);
      const matchTags = b.tags.some(t => t.toLowerCase().includes(q));
      if (!matchTitle && !matchUrl && !matchNotes && !matchDesc && !matchTags) {
        return false;
      }
    }

    return true;
  }).sort((a, b) => b.updatedAt - a.updatedAt);
}
