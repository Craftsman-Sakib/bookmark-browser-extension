/**
 * @license
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 sakibcraft@gmail.com
 * 
 * Native Browser Bookmarks API Integration (chrome.bookmarks)
 */

import { BookmarkItem } from '../types';

declare const chrome: any;

/**
 * Checks if running in an extension environment with bookmarks API access.
 */
export function isNativeBookmarksAvailable(): boolean {
  return typeof chrome !== 'undefined' && chrome.bookmarks !== undefined;
}

/**
 * Reads bookmarks from the native browser bookmarks tree.
 */
export async function importFromNativeBookmarks(): Promise<Array<{ title: string; url: string; folder: string }>> {
  if (!isNativeBookmarksAvailable()) {
    // If running in Web Simulator, provide high-quality browser sample bookmarks
    return [
      { title: 'Electronic Frontier Foundation (EFF)', url: 'https://www.eff.org', folder: 'Security' },
      { title: 'Mozilla MDN Web Docs', url: 'https://developer.mozilla.org', folder: 'Development' },
      { title: 'OWASP Foundation', url: 'https://owasp.org', folder: 'Security' },
      { title: 'NIST Computer Security Resource Center', url: 'https://csrc.nist.gov', folder: 'Security' },
      { title: 'TypeScript Documentation', url: 'https://www.typescriptlang.org', folder: 'Development' }
    ];
  }

  return new Promise((resolve, reject) => {
    chrome.bookmarks.getTree((treeNodes: any[]) => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }

      const results: Array<{ title: string; url: string; folder: string }> = [];

      function traverse(nodes: any[], currentFolder: string) {
        for (const node of nodes) {
          if (node.url) {
            results.push({
              title: node.title || node.url,
              url: node.url,
              folder: currentFolder || 'Browser Imported'
            });
          }
          if (node.children) {
            traverse(node.children, node.title || currentFolder);
          }
        }
      }

      traverse(treeNodes, 'Bookmarks');
      resolve(results);
    });
  });
}

/**
 * Exports decrypted bookmarks to a designated browser bookmarks folder: "AegisMark Vault".
 * WARNING: Plaintext export to browser! Native browser sync (Google Sync, Firefox Sync) may sync these plaintext URLs.
 */
export async function exportToNativeBookmarks(bookmarks: BookmarkItem[]): Promise<number> {
  const activeBookmarks = bookmarks.filter(b => !b.isInTrash);

  if (!isNativeBookmarksAvailable()) {
    // In Web Simulator mode, simulate success
    return activeBookmarks.length;
  }

  return new Promise((resolve, reject) => {
    // 1. Create or locate AegisMark root folder
    chrome.bookmarks.create(
      { title: `AegisMark Vault (${new Date().toLocaleDateString()})` },
      (rootFolder: any) => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }

        let createdCount = 0;
        const total = activeBookmarks.length;

        if (total === 0) {
          return resolve(0);
        }

        for (const b of activeBookmarks) {
          chrome.bookmarks.create(
            {
              parentId: rootFolder.id,
              title: b.title,
              url: b.url
            },
            () => {
              createdCount++;
              if (createdCount === total) {
                resolve(createdCount);
              }
            }
          );
        }
      }
    );
  });
}
