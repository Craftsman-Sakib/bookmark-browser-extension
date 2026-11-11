/**
 * @license
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 sakibcraft@gmail.com
 * 
 * Centralized Keyboard Shortcuts Cheat Sheet Modal
 */

import React from 'react';
import { Command, X, Bookmark, Search, Lock, Smartphone, FileUp, Sparkles } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  onClose: () => void;
  isMac?: boolean;
}

interface ShortcutItem {
  keys: string[];
  alternateKeys?: string[];
  action: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface ShortcutGroup {
  title: string;
  items: ShortcutItem[];
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  onClose,
  isMac = false
}) => {
  const modKey = isMac ? '⌘' : 'Ctrl';

  const shortcutGroups: ShortcutGroup[] = [
    {
      title: 'Common Actions',
      items: [
        {
          keys: [modKey, 'N'],
          action: 'Open Quick Save',
          description: 'Add a new encrypted bookmark instantly from anywhere.',
          icon: Bookmark
        },
        {
          keys: [modKey, 'F'],
          alternateKeys: [modKey, 'K'],
          action: 'Focus Search Bar',
          description: 'Jump directly to decrypted bookmarks search.',
          icon: Search
        },
        {
          keys: ['Esc'],
          action: 'Close / Blur',
          description: 'Dismiss any open modal or unfocus active input.',
          icon: X
        },
        {
          keys: [modKey, 'L'],
          alternateKeys: ['Alt', 'L'],
          action: 'Lock Vault',
          description: 'Immediately wipe active keys from memory and lock.',
          icon: Lock
        }
      ]
    },
    {
      title: 'Tools & Utilities',
      items: [
        {
          keys: [modKey, 'Shift', 'E'],
          action: 'Toggle Popup Simulator',
          description: 'Preview the extension in a 380×520px realistic popup.',
          icon: Smartphone
        },
        {
          keys: ['?'],
          alternateKeys: [modKey, '/'],
          action: 'Shortcuts Help',
          description: 'Display this keyboard shortcut reference sheet.',
          icon: Command
        }
      ]
    },
    {
      title: 'Tab Navigation (when not typing)',
      items: [
        {
          keys: ['1'],
          action: 'Bookmarks',
          description: 'Switch to main decrypted bookmarks grid.'
        },
        {
          keys: ['2'],
          action: 'Folders & Tags',
          description: 'Manage folder taxonomy and tag clouds.'
        },
        {
          keys: ['3'],
          action: 'Trash',
          description: 'View 30-day soft deleted bookmarks.'
        },
        {
          keys: ['4'],
          action: 'Devices & Sync',
          description: 'Manage connected devices and CAS sync.'
        },
        {
          keys: ['5'],
          action: 'Security & Privacy',
          description: 'Inspect crypto health, quotas, and zero-knowledge audits.'
        }
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-6 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard Shortcuts"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Command className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display text-white">
                Keyboard Shortcuts
              </h2>
              <p className="text-xs text-slate-400">
                Speed through your encrypted bookmarks with global shortcuts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Close shortcuts modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcuts Groups */}
        <div className="space-y-6">
          {shortcutGroups.map((group) => (
            <div key={group.title} className="space-y-2.5">
              <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider font-mono">
                {group.title}
              </h3>
              <div className="bg-slate-950/70 rounded-xl border border-slate-800/80 divide-y divide-slate-800/60 overflow-hidden">
                {group.items.map((item) => (
                  <div
                    key={item.action}
                    className="flex items-center justify-between p-3 gap-4 hover:bg-slate-900/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-slate-200">
                        {item.action}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {item.description}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.keys.map((k) => (
                        <kbd
                          key={k}
                          className="min-w-[24px] px-2 py-1 text-center text-xs font-mono font-semibold bg-slate-900 border border-slate-700 rounded-md text-emerald-300 shadow-sm shadow-black/40"
                        >
                          {k}
                        </kbd>
                      ))}

                      {item.alternateKeys && (
                        <>
                          <span className="text-[11px] text-slate-500 px-0.5">or</span>
                          {item.alternateKeys.map((k) => (
                            <kbd
                              key={k}
                              className="min-w-[24px] px-2 py-1 text-center text-xs font-mono font-semibold bg-slate-900 border border-slate-700 rounded-md text-slate-300 shadow-sm shadow-black/40"
                            >
                              {k}
                            </kbd>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer tip */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-500">
          <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">Esc</kbd> anytime to exit</span>
          <span className="font-mono text-emerald-400/80">AegisMark 3.3 Shortcuts</span>
        </div>
      </div>
    </div>
  );
};
