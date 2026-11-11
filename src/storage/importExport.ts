/**
 * @license
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 sakibcraft@gmail.com
 * 
 * Sanitized Import and Export Utilities for AegisMark
 */

import { BookmarkItem, EncryptedRecord, VaultHeader } from '../types';
import { getAllEncryptedRecords, getVaultHeader, putBatchEncryptedRecords } from './db';

const MAX_IMPORT_SIZE_BYTES = 15 * 1024 * 1024; // 15 MiB limit

export interface ImportPreviewResult {
  validBookmarks: Array<{ title: string; url: string; tags: string[]; folder: string }>;
  duplicateCount: number;
  skippedUnsafeCount: number;
  totalParsed: number;
}

/**
 * Validates that a URL is strictly HTTP or HTTPS. Rejects dangerous schemes.
 */
export function isValidBookmarkUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Escapes HTML characters to prevent XSS.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Generates an encrypted .aegis JSON backup bundle.
 */
export async function generateEncryptedBackup(): Promise<string> {
  const header = await getVaultHeader();
  if (!header) {
    throw new Error('Vault is not initialized. Cannot create backup.');
  }

  const records = await getAllEncryptedRecords();

  const backupData = {
    format: 'aegismark-vault-backup',
    version: 1,
    exportedAt: Date.now(),
    header,
    records
  };

  return JSON.stringify(backupData, null, 2);
}

/**
 * Restores vault records from an .aegis encrypted backup bundle.
 */
export async function restoreFromEncryptedBackup(
  backupJsonString: string
): Promise<{ recordCount: number; header: VaultHeader }> {
  let data: any;
  try {
    data = JSON.parse(backupJsonString);
  } catch {
    throw new Error('Invalid backup file: corrupt JSON.');
  }

  if (data.format !== 'aegismark-vault-backup' || !data.header || !Array.isArray(data.records)) {
    throw new Error('Invalid AegisMark backup format: missing required vault header or records.');
  }

  const header: VaultHeader = data.header;
  const records: EncryptedRecord[] = data.records;

  // Persist records to IndexedDB
  await putBatchEncryptedRecords(records);

  return {
    recordCount: records.length,
    header
  };
}

/**
 * Exports decrypted bookmarks into standard Netscape Bookmark HTML format.
 * NOTE: Plaintext export! UI must display warning modal.
 */
export function generateNetscapeHtml(bookmarks: BookmarkItem[]): string {
  const dateStr = Math.floor(Date.now() / 1000);
  let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>AegisMark Bookmarks</TITLE>
<H1>AegisMark Bookmarks</H1>
<DL><p>
`;

  // Filter out trashed items from export
  const activeBookmarks = bookmarks.filter(b => !b.isInTrash);

  for (const b of activeBookmarks) {
    const addDate = Math.floor(b.createdAt / 1000);
    const tagsAttr = b.tags.length > 0 ? ` TAGS="${escapeHtml(b.tags.join(','))}"` : '';
    html += `    <DT><A HREF="${escapeHtml(b.url)}" ADD_DATE="${addDate}"${tagsAttr}>${escapeHtml(b.title)}</A>\n`;
    if (b.notes) {
      html += `    <DD>${escapeHtml(b.notes)}\n`;
    }
  }

  html += `</DL><p>\n`;
  return html;
}

/**
 * Parses and sanitizes imported files (Netscape HTML or JSON).
 */
export async function parseAndSanitizeImportFile(
  file: File,
  existingUrls: Set<string>
): Promise<ImportPreviewResult> {
  if (file.size > MAX_IMPORT_SIZE_BYTES) {
    throw new Error(`Import file exceeds 15 MiB limit (${(file.size / (1024 * 1024)).toFixed(1)} MiB).`);
  }

  const content = await file.text();
  const validBookmarks: ImportPreviewResult['validBookmarks'] = [];
  let duplicateCount = 0;
  let skippedUnsafeCount = 0;
  let totalParsed = 0;

  // Check if Netscape HTML format
  if (content.includes('<!DOCTYPE NETSCAPE-Bookmark-file-1>') || content.includes('<DT><A') || content.includes('<a href=')) {
    const regex = /<A\s+(?:[^>]*?\s+)?HREF="([^"]*)"(?:[^>]*?TAGS="([^"]*)")?[^>]*>(.*?)<\/A>/gi;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      totalParsed++;
      const rawUrl = match[1];
      const rawTags = match[2] || '';
      const rawTitle = match[3] || 'Untitled Bookmark';

      if (!isValidBookmarkUrl(rawUrl)) {
        skippedUnsafeCount++;
        continue;
      }

      if (existingUrls.has(rawUrl.trim())) {
        duplicateCount++;
        continue;
      }

      const cleanTags = rawTags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      validBookmarks.push({
        url: rawUrl.trim(),
        title: rawTitle.replace(/<[^>]*>/g, '').trim(),
        tags: cleanTags,
        folder: 'f_work'
      });
    }
  } else {
    // Try parsing as JSON array
    try {
      const data = JSON.parse(content);
      const items = Array.isArray(data) ? data : data.bookmarks || [];

      for (const item of items) {
        if (!item.url) continue;
        totalParsed++;

        if (!isValidBookmarkUrl(item.url)) {
          skippedUnsafeCount++;
          continue;
        }

        if (existingUrls.has(item.url.trim())) {
          duplicateCount++;
          continue;
        }

        validBookmarks.push({
          url: item.url.trim(),
          title: item.title || item.url,
          tags: Array.isArray(item.tags) ? item.tags : [],
          folder: item.folderId || 'f_work'
        });
      }
    } catch {
      throw new Error('Unrecognized bookmark file format. Please upload standard Netscape HTML or JSON.');
    }
  }

  return {
    validBookmarks,
    duplicateCount,
    skippedUnsafeCount,
    totalParsed
  };
}
