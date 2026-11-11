/**
 * @license
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 sakibcraft@gmail.com
 * 
 * Top Bar Navigation Contract (3-Zone strict layout)
 */

import React from 'react';
import { Shield, ShieldAlert, Lock, Unlock, Download, Smartphone, Command } from 'lucide-react';

interface NavbarProps {
  activeTab: 'bookmarks' | 'folders' | 'trash' | 'sync' | 'privacy' | 'pricing';
  setActiveTab: (tab: 'bookmarks' | 'folders' | 'trash' | 'sync' | 'privacy' | 'pricing') => void;
  isUnlocked: boolean;
  onLockToggle: () => void;
  onOpenQuickSave: () => void;
  onOpenExportModal: () => void;
  onOpenShortcuts?: () => void;
  onToggleSimulator: () => void;
  showSimulator: boolean;
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isUnlocked,
  onLockToggle,
  onOpenQuickSave,
  onOpenExportModal,
  onOpenShortcuts,
  onToggleSimulator,
  showSimulator,
  theme,
  onThemeToggle
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md px-4 lg:px-8 py-3.5 flex items-center justify-between gap-6 transition-colors">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => setActiveTab('bookmarks')}
          className="flex items-center gap-2.5 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg p-1"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/25 transition-colors">
            <Shield className="w-4 h-4" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight text-slate-100 whitespace-nowrap">
            AegisMark
          </span>
        </button>
        <span className="hidden sm:inline-block text-[11px] font-mono font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
          E2EE v3.3
        </span>
      </div>

      {/* Zone 2: Single-line clean text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
        <button
          onClick={() => setActiveTab('bookmarks')}
          className={`whitespace-nowrap transition-colors py-1 ${
            activeTab === 'bookmarks'
              ? 'text-emerald-400 font-semibold border-b-2 border-emerald-400'
              : 'hover:text-slate-200'
          }`}
        >
          Bookmarks
        </button>
        <button
          onClick={() => setActiveTab('folders')}
          className={`whitespace-nowrap transition-colors py-1 ${
            activeTab === 'folders'
              ? 'text-emerald-400 font-semibold border-b-2 border-emerald-400'
              : 'hover:text-slate-200'
          }`}
        >
          Folders & Tags
        </button>
        <button
          onClick={() => setActiveTab('trash')}
          className={`whitespace-nowrap transition-colors py-1 ${
            activeTab === 'trash'
              ? 'text-emerald-400 font-semibold border-b-2 border-emerald-400'
              : 'hover:text-slate-200'
          }`}
        >
          Trash (30d)
        </button>
        <button
          onClick={() => setActiveTab('sync')}
          className={`whitespace-nowrap transition-colors py-1 ${
            activeTab === 'sync'
              ? 'text-emerald-400 font-semibold border-b-2 border-emerald-400'
              : 'hover:text-slate-200'
          }`}
        >
          Devices & Sync
        </button>
        <button
          onClick={() => setActiveTab('privacy')}
          className={`whitespace-nowrap transition-colors py-1 ${
            activeTab === 'privacy'
              ? 'text-emerald-400 font-semibold border-b-2 border-emerald-400'
              : 'hover:text-slate-200'
          }`}
        >
          Security & Privacy
        </button>
        <button
          onClick={() => setActiveTab('pricing')}
          className={`whitespace-nowrap transition-colors py-1 ${
            activeTab === 'pricing'
              ? 'text-emerald-400 font-semibold border-b-2 border-emerald-400'
              : 'hover:text-slate-200'
          }`}
        >
          Plans
        </button>
      </nav>

      {/* Zone 3: 1 Primary action cluster */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Extension Simulator Toggle */}
        <button
          onClick={onToggleSimulator}
          className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
            showSimulator
              ? 'bg-slate-800 text-emerald-400 border-emerald-500/40'
              : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
          }`}
          title="Toggle Extension Popup Simulator"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Popup Simulator</span>
        </button>

        {/* Lock / Unlock Toggle Button */}
        <button
          onClick={onLockToggle}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
            isUnlocked
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
              : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
          }`}
        >
          {isUnlocked ? (
            <>
              <Unlock className="w-3.5 h-3.5" />
              <span>Unlocked</span>
            </>
          ) : (
            <>
              <Lock className="w-3.5 h-3.5" />
              <span>Vault Locked</span>
            </>
          )}
        </button>

        {/* Quick Save Action Button */}
        <button
          onClick={onOpenQuickSave}
          disabled={!isUnlocked}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap shadow-sm shadow-emerald-500/20"
          title="Add new bookmark (Ctrl+N)"
        >
          <span>Quick Save</span>
          <kbd className="hidden sm:inline-block px-1 py-0.2 rounded text-[10px] font-mono font-normal opacity-80 bg-slate-950/20 text-slate-950">
            Ctrl+N
          </kbd>
        </button>

        {/* Keyboard Shortcuts Trigger */}
        {onOpenShortcuts && (
          <button
            onClick={onOpenShortcuts}
            className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-700 rounded-lg transition-colors hidden sm:flex"
            title="Keyboard Shortcuts (? or Ctrl+/)"
            aria-label="View Keyboard Shortcuts"
          >
            <Command className="w-4 h-4" />
          </button>
        )}

        {/* Export Extension Package Modal Trigger */}
        <button
          onClick={onOpenExportModal}
          className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-700 rounded-lg transition-colors"
          title="Download Production Extension ZIP for Chrome / Edge / Firefox"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
