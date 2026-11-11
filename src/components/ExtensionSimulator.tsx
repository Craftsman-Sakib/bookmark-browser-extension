/**
 * @license
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 sakibcraft@gmail.com
 * 
 * Interactive 380x520px Browser Extension Popup Simulator
 */

import React, { useState } from 'react';
import { BookmarkItem, FolderItem } from '../types';
import {
  Globe,
  Tag,
  Folder,
  Lock,
  Search,
  Check,
  Star,
  ExternalLink,
  Smartphone,
  Monitor
} from 'lucide-react';

interface ExtensionSimulatorProps {
  folders: FolderItem[];
  bookmarks: BookmarkItem[];
  isUnlocked: boolean;
  onSaveBookmark: (item: BookmarkItem) => Promise<void>;
  onClose: () => void;
  onLockVault: () => void;
}

export const ExtensionSimulator: React.FC<ExtensionSimulatorProps> = ({
  folders,
  bookmarks,
  isUnlocked,
  onSaveBookmark,
  onClose,
  onLockVault
}) => {
  const [activeTab, setActiveTab] = useState<'save' | 'search'>('save');
  const [simulatedDevice, setSimulatedDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Simulated active tab information
  const [pageTitle, setPageTitle] = useState('NIST SP 800-38D: Recommendation for GCM');
  const [pageUrl, setPageUrl] = useState('https://csrc.nist.gov/publications/detail/sp/800-38d/final');
  const [selectedFolder, setSelectedFolder] = useState(folders[0]?.id || 'f_research');
  const [tagInput, setTagInput] = useState('nist, cryptography, gcm');
  const [notes, setNotes] = useState('Reference paper on 96-bit random IVs and authenticated Galois Counter Mode.');
  const [isFavorite, setIsFavorite] = useState(true);

  // Search inside popup
  const [searchQuery, setSearchQuery] = useState('');

  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isUnlocked) return;

    setIsSaving(true);
    const tags = tagInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const newBookmark: BookmarkItem = {
      id: crypto.randomUUID(),
      url: pageUrl.trim(),
      title: pageTitle.trim() || 'Untitled Bookmark',
      notes: notes.trim() || undefined,
      folderId: selectedFolder,
      tags,
      isFavorite,
      isInTrash: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    try {
      await onSaveBookmark(newBookmark);
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        setIsSaving(false);
      }, 1400);
    } catch {
      setIsSaving(false);
    }
  };

  const filteredBookmarks = bookmarks
    .filter(b => !b.isInTrash)
    .filter(b => {
      const q = searchQuery.toLowerCase();
      return b.title.toLowerCase().includes(q) || b.url.toLowerCase().includes(q);
    })
    .slice(0, 6);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
      <div className="flex flex-col items-center">
        {/* Simulator Device Controls Bar */}
        <div className="flex items-center justify-between w-[380px] mb-2 px-2 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 font-medium">
            <span>Simulator:</span>
            <button
              onClick={() => setSimulatedDevice('desktop')}
              className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
                simulatedDevice === 'desktop' ? 'bg-slate-800 text-emerald-400' : 'hover:text-slate-200'
              }`}
            >
              <Monitor className="w-3 h-3" />
              <span>Desktop</span>
            </button>
            <button
              onClick={() => setSimulatedDevice('mobile')}
              className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
                simulatedDevice === 'mobile' ? 'bg-slate-800 text-emerald-400' : 'hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3 h-3" />
              <span>Mobile AMO</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white px-2 py-0.5 rounded hover:bg-slate-800"
          >
            ✕ Close
          </button>
        </div>

        {/* 380x520px Extension Frame */}
        <div className="w-[380px] h-[520px] bg-slate-950 border-2 border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 relative">
          {/* Extension Header */}
          <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Globe className="w-3 h-3" />
              </div>
              <span className="font-display font-bold text-sm tracking-tight text-white">AegisMark</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex bg-slate-950 rounded-lg p-0.5 border border-slate-800 text-[11px]">
                <button
                  onClick={() => setActiveTab('save')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors ${
                    activeTab === 'save' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Save
                </button>
                <button
                  onClick={() => setActiveTab('search')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors ${
                    activeTab === 'search' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Search
                </button>
              </div>

              <button
                onClick={onLockVault}
                className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                title="Lock Vault"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* TAB 1: QUICK SAVE ACTIVE PAGE */}
          {activeTab === 'save' && (
            <form onSubmit={handleSave} className="flex-1 p-4 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-3">
                {/* Active Tab Preview Card */}
                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                  <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>Active Tab Detected</span>
                    <button
                      type="button"
                      onClick={() => setIsFavorite(!isFavorite)}
                      className={`text-slate-400 hover:text-amber-400 ${isFavorite ? 'text-amber-400' : ''}`}
                    >
                      <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-amber-400' : ''}`} />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={pageTitle}
                    onChange={(e) => setPageTitle(e.target.value)}
                    className="w-full bg-transparent font-medium text-xs text-white focus:outline-none border-b border-transparent focus:border-emerald-500/50 pb-0.5 truncate"
                    placeholder="Page Title"
                  />
                  <input
                    type="text"
                    value={pageUrl}
                    onChange={(e) => setPageUrl(e.target.value)}
                    className="w-full bg-transparent text-[11px] text-slate-400 focus:outline-none border-b border-transparent focus:border-emerald-500/50 pt-1 truncate font-mono"
                    placeholder="https://..."
                  />
                </div>

                {/* Folder Select */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1">
                    <Folder className="w-3 h-3 text-emerald-400" />
                    <span>Target Folder</span>
                  </label>
                  <select
                    value={selectedFolder}
                    onChange={(e) => setSelectedFolder(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    {folders.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tags Input */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-emerald-400" />
                    <span>Tags (comma-separated)</span>
                  </label>
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="work, research, design"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Private Notes Input */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Private Notes (Encrypted)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Encrypted note about this page..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>
              </div>

              {/* Action Button & Subtext */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSaving || isSaved}
                  className={`w-full py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                    isSaved
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                  }`}
                >
                  {isSaved ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Saved & Encrypted!</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3 h-3" />
                      <span>{isSaving ? 'Encrypting with 48B AAD...' : 'Save Encrypted Bookmark'}</span>
                    </>
                  )}
                </button>
                <div className="text-[10px] text-center text-slate-500 mt-2 font-mono">
                  AES-256-GCM · Random 96-bit IV · Sub-50ms local persist
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: INSTANT SEARCH INSIDE POPUP */}
          {activeTab === 'search' && (
            <div className="flex-1 p-3 flex flex-col overflow-hidden">
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Instant search encrypted vault..."
                  autoFocus
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
                {filteredBookmarks.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-500">
                    No bookmarks matching &ldquo;{searchQuery}&rdquo;
                  </div>
                ) : (
                  filteredBookmarks.map(b => (
                    <a
                      key={b.id}
                      href={b.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-2 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 transition-colors group"
                    >
                      <div className="flex items-center justify-between text-xs font-medium text-slate-200 group-hover:text-emerald-400 mb-0.5">
                        <span className="truncate">{b.title}</span>
                        <ExternalLink className="w-3 h-3 text-slate-500 shrink-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono truncate">
                        {b.url.replace(/^https?:\/\//, '')}
                      </div>
                    </a>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
