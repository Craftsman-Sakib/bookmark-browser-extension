/**
 * @license
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 sakibcraft@gmail.com
 * 
 * Folders and Tags Organization Manager
 */

import React, { useState } from 'react';
import { BookmarkItem, FolderItem } from '../types';
import { Folder, Tag, Plus, Trash2, FolderPlus } from 'lucide-react';
import { putFolder, deleteFolder } from '../storage/db';

interface FoldersManagerProps {
  folders: FolderItem[];
  bookmarks: BookmarkItem[];
  onFoldersUpdated: (updatedFolders: FolderItem[]) => void;
  onFilterByTag: (tag: string) => void;
  onFilterByFolder: (folderId: string) => void;
}

const PRESET_COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4'];

export const FoldersManager: React.FC<FoldersManagerProps> = ({
  folders,
  bookmarks,
  onFoldersUpdated,
  onFilterByTag,
  onFilterByFolder
}) => {
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);

  const activeBookmarks = bookmarks.filter(b => !b.isInTrash);

  // Compute tag counts
  const tagCounts: Record<string, number> = {};
  for (const b of activeBookmarks) {
    for (const t of b.tags) {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    }
  }

  const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    const newFolder: FolderItem = {
      id: `f_${Date.now()}`,
      name: newFolderName.trim(),
      color: selectedColor,
      createdAt: Date.now()
    };

    await putFolder(newFolder);
    onFoldersUpdated([...folders, newFolder]);
    setNewFolderName('');
  };

  const handleDeleteFolder = async (folderId: string) => {
    await deleteFolder(folderId);
    onFoldersUpdated(folders.filter(f => f.id !== folderId));
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Create New Folder Card */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <FolderPlus className="w-4 h-4 text-emerald-400" />
          <span>Create New Organization Folder</span>
        </h3>

        <form onSubmit={handleCreateFolder} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name (e.g. Cryptography Papers, Design Inspiration)..."
            required
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          />

          <div className="flex items-center gap-1.5 self-center">
            {PRESET_COLORS.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                className={`w-6 h-6 rounded-full transition-transform ${
                  selectedColor === color ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'opacity-70 hover:opacity-100'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Folder</span>
          </button>
        </form>
      </div>

      {/* Existing Folders Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white">Your Folders ({folders.length})</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {folders.map(f => {
            const count = activeBookmarks.filter(b => b.folderId === f.id).length;

            return (
              <div
                key={f.id}
                className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 flex items-center justify-between gap-3 transition-colors group"
              >
                <button
                  onClick={() => onFilterByFolder(f.id)}
                  className="flex items-center gap-3 min-w-0 text-left flex-1"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0"
                    style={{ backgroundColor: `${f.color || '#10B981'}25`, color: f.color || '#10B981' }}
                  >
                    <Folder className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-xs text-slate-200 group-hover:text-emerald-400 truncate transition-colors">
                      {f.name}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {count} {count === 1 ? 'bookmark' : 'bookmarks'}
                    </div>
                  </div>
                </button>

                {folders.length > 1 && (
                  <button
                    onClick={() => handleDeleteFolder(f.id)}
                    className="p-1 text-slate-600 hover:text-red-400 hover:bg-slate-800 rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete Empty Folder"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tag Cloud */}
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Tag className="w-4 h-4 text-emerald-400" />
          <span>Active Tag Index ({sortedTags.length})</span>
        </h3>
        <p className="text-xs text-slate-400">
          Click any tag to filter your decrypted bookmarks:
        </p>

        {sortedTags.length === 0 ? (
          <div className="text-xs text-slate-500 italic py-2">
            No tags created yet. Add tags when saving or editing bookmarks.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 pt-1">
            {sortedTags.map(([tag, count]) => (
              <button
                key={tag}
                onClick={() => onFilterByTag(tag)}
                className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 hover:border-emerald-500/40 text-xs font-mono text-slate-300 hover:text-emerald-400 flex items-center gap-1.5 transition-colors"
              >
                <span>#{tag}</span>
                <span className="text-[10px] text-slate-500 tabular-nums">({count})</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
