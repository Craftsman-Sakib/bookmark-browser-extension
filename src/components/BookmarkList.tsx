/**
 * @license
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 sakibcraft@gmail.com
 * 
 * High-Density Bookmark Grid and List View
 */

import React, { useState } from 'react';
import { BookmarkItem, FolderItem } from '../types';
import {
  Search,
  Star,
  ExternalLink,
  Trash2,
  Edit2,
  Folder,
  Tag,
  Plus,
  ArrowUpDown,
  Check,
  X
} from 'lucide-react';

interface BookmarkListProps {
  bookmarks: BookmarkItem[];
  folders: FolderItem[];
  onSaveBookmark: (item: BookmarkItem) => Promise<void>;
  onSoftDelete: (item: BookmarkItem) => Promise<void>;
  onOpenQuickSave: () => void;
  onOpenNativeModal: () => void;
}

export const BookmarkList: React.FC<BookmarkListProps> = ({
  bookmarks,
  folders,
  onSaveBookmark,
  onSoftDelete,
  onOpenQuickSave,
  onOpenNativeModal
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [editingItem, setEditingItem] = useState<BookmarkItem | null>(null);

  // Extract all unique tags
  const allTags = Array.from(
    new Set(bookmarks.filter(b => !b.isInTrash).flatMap(b => b.tags))
  );

  // Filter bookmarks
  const activeBookmarks = bookmarks.filter(b => !b.isInTrash);
  const filtered = activeBookmarks
    .filter(b => {
      if (onlyFavorites && !b.isFavorite) return false;
      if (selectedFolderId && b.folderId !== selectedFolderId) return false;
      if (selectedTag && !b.tags.includes(selectedTag)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchTitle = b.title.toLowerCase().includes(q);
        const matchUrl = b.url.toLowerCase().includes(q);
        const matchNotes = (b.notes || '').toLowerCase().includes(q);
        const matchTags = b.tags.some(t => t.toLowerCase().includes(q));
        if (!matchTitle && !matchUrl && !matchNotes && !matchTags) return false;
      }
      return true;
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const handleToggleFavorite = async (item: BookmarkItem) => {
    const updated = { ...item, isFavorite: !item.isFavorite, updatedAt: Date.now() };
    await onSaveBookmark(updated);
  };

  const handleUpdateEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    await onSaveBookmark({ ...editingItem, updatedAt: Date.now() });
    setEditingItem(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-3 rounded-xl backdrop-blur-sm">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            id="aegismark-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search decrypted bookmarks by title, URL, tag, or note..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-20 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            autoComplete="off"
            spellCheck={false}
          />
          <div className="absolute right-2.5 top-2 flex items-center gap-1.5">
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-slate-500 hover:text-slate-300 p-0.5 rounded text-xs"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-500 bg-slate-900 border border-slate-800 select-none">
              <span>Ctrl</span>
              <span>+</span>
              <span>F</span>
            </kbd>
          </div>
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex items-center gap-2">
          {/* Favorites Filter */}
          <button
            onClick={() => setOnlyFavorites(!onlyFavorites)}
            className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              onlyFavorites
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-amber-400 text-amber-400' : ''}`} />
            <span>Favorites</span>
          </button>

          {/* New Bookmark CTA */}
          <button
            onClick={onOpenQuickSave}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors flex items-center gap-1.5 shadow-sm shadow-emerald-500/20 whitespace-nowrap"
            title="Add Bookmark (Ctrl+N)"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Bookmark</span>
            <kbd className="hidden md:inline-block ml-1 px-1 py-0.2 rounded text-[10px] font-mono font-normal opacity-80 bg-slate-950/20 text-slate-950">
              Ctrl+N
            </kbd>
          </button>
        </div>
      </div>

      {/* Folders and Tags Pill-free Filter Strip */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          onClick={() => { setSelectedFolderId(null); setSelectedTag(null); }}
          className={`px-2.5 py-1 rounded-md transition-colors ${
            selectedFolderId === null && selectedTag === null
              ? 'bg-emerald-500/15 text-emerald-300 font-medium border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          All Items ({activeBookmarks.length})
        </button>

        <span className="text-slate-600">|</span>

        {/* Folders */}
        {folders.map(f => {
          const count = activeBookmarks.filter(b => b.folderId === f.id).length;
          return (
            <button
              key={f.id}
              onClick={() => { setSelectedFolderId(f.id); setSelectedTag(null); }}
              className={`px-2 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                selectedFolderId === f.id
                  ? 'bg-emerald-500/15 text-emerald-300 font-medium border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Folder className="w-3 h-3 text-emerald-400" />
              <span>{f.name}</span>
              <span className="text-[10px] text-slate-500 font-mono">({count})</span>
            </button>
          );
        })}

        {allTags.length > 0 && (
          <>
            <span className="text-slate-600">|</span>
            {allTags.slice(0, 6).map(t => (
              <button
                key={t}
                onClick={() => { setSelectedTag(selectedTag === t ? null : t); setSelectedFolderId(null); }}
                className={`px-2 py-0.5 rounded transition-colors text-[11px] font-mono ${
                  selectedTag === t
                    ? 'bg-slate-800 text-emerald-400 font-semibold'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                #{t}
              </button>
            ))}
          </>
        )}
      </div>

      {/* Main Bookmarks List (High-Density, 40px Row Heights) */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40">
          <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto mb-3">
            <Search className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-slate-200 mb-1">No Bookmarks Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4 leading-relaxed">
            {searchQuery || selectedFolderId || selectedTag
              ? 'No encrypted bookmarks match your active search and filter parameters.'
              : 'Your vault is currently empty. Start saving encrypted bookmarks or import your existing bookmarks from your browser.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={onOpenQuickSave}
              className="px-3.5 py-1.5 bg-emerald-500 text-slate-950 font-semibold text-xs rounded-lg hover:bg-emerald-400 transition-colors"
            >
              Create Bookmark
            </button>
            <button
              onClick={onOpenNativeModal}
              className="px-3.5 py-1.5 border border-slate-700 text-slate-300 font-medium text-xs rounded-lg hover:bg-slate-800 transition-colors"
            >
              Import from Browser
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden divide-y divide-slate-800/80">
          {filtered.map(item => {
            const folder = folders.find(f => f.id === item.folderId);
            const domain = item.url.replace(/^https?:\/\//, '').split('/')[0];

            return (
              <div
                key={item.id}
                className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-slate-800/40 transition-colors group"
              >
                {/* Left: Title, Unboxed Metadata, Tags */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <button
                      onClick={() => handleToggleFavorite(item)}
                      className={`text-slate-600 hover:text-amber-400 transition-colors ${
                        item.isFavorite ? 'text-amber-400' : ''
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${item.isFavorite ? 'fill-amber-400' : ''}`} />
                    </button>

                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-xs sm:text-sm text-slate-200 hover:text-emerald-400 transition-colors truncate flex items-center gap-1.5"
                    >
                      <span>{item.title}</span>
                      <ExternalLink className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </a>

                    {item.conflictOriginalId && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded border border-amber-500/30 shrink-0">
                        Conflict Copy
                      </span>
                    )}
                  </div>

                  {/* Clean Unboxed Metadata with · separator */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono">
                    <span className="text-slate-400">{domain}</span>
                    <span aria-hidden="true">·</span>
                    <span>{folder?.name || 'General'}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </span>
                    {item.tags.length > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <div className="flex items-center gap-1.5 text-emerald-400/80">
                          {item.tags.map(t => (
                            <span key={t}>#{t}</span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {item.notes && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-1 italic">
                      {item.notes}
                    </p>
                  )}
                </div>

                {/* Right: Quick Action Buttons */}
                <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => setEditingItem(item)}
                    className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
                    title="Edit Bookmark"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onSoftDelete(item)}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-md transition-colors"
                    title="Move to 30-Day Trash"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Bookmark Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <form
            onSubmit={handleUpdateEdit}
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 text-slate-100"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-semibold font-display">Edit Encrypted Bookmark</h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Title</label>
              <input
                type="text"
                value={editingItem.title}
                onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">URL</label>
              <input
                type="url"
                value={editingItem.url}
                onChange={(e) => setEditingItem({ ...editingItem, url: e.target.value })}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Folder</label>
              <select
                value={editingItem.folderId}
                onChange={(e) => setEditingItem({ ...editingItem, folderId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Tags (comma-separated)</label>
              <input
                type="text"
                value={editingItem.tags.join(', ')}
                onChange={(e) => setEditingItem({
                  ...editingItem,
                  tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Private Notes</label>
              <textarea
                value={editingItem.notes || ''}
                onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-3.5 py-1.5 text-xs font-medium border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 rounded-lg"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
