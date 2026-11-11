/**
 * @license
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 sakibcraft@gmail.com
 * 
 * Native Browser Bookmarks Import & Export Modal with Plaintext Sync Warnings
 */

import React, { useState } from 'react';
import { BookmarkItem } from '../types';
import {
  importFromNativeBookmarks,
  exportToNativeBookmarks,
  isNativeBookmarksAvailable
} from '../storage/nativeBookmarks';
import {
  Globe,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  X,
  RefreshCw
} from 'lucide-react';

interface NativeBookmarksModalProps {
  bookmarks: BookmarkItem[];
  onImportComplete: (imported: Array<{ title: string; url: string; folder: string }>) => Promise<void>;
  onClose: () => void;
}

export const NativeBookmarksModal: React.FC<NativeBookmarksModalProps> = ({
  bookmarks,
  onImportComplete,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [hasAcknowledgedWarning, setHasAcknowledgedWarning] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const isNative = isNativeBookmarksAvailable();

  const handleImport = async () => {
    setIsProcessing(true);
    setStatusMsg('');
    try {
      const items = await importFromNativeBookmarks();
      await onImportComplete(items);
      setStatusMsg(`✓ Successfully imported and encrypted ${items.length} bookmarks from browser!`);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setStatusMsg(err.message || 'Failed to import native bookmarks.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = async () => {
    if (!hasAcknowledgedWarning) return;
    setIsProcessing(true);
    setStatusMsg('');

    try {
      const count = await exportToNativeBookmarks(bookmarks);
      setStatusMsg(`✓ Exported ${count} bookmarks to your browser's "AegisMark Vault" folder!`);
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      setStatusMsg(err.message || 'Failed to export native bookmarks.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 text-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold font-display">Native Browser Bookmarks</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => { setActiveTab('import'); setStatusMsg(''); }}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'import' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Import from Browser
          </button>
          <button
            onClick={() => { setActiveTab('export'); setStatusMsg(''); }}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'export' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Export to Browser
          </button>
        </div>

        {statusMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* IMPORT VIEW */}
        {activeTab === 'import' && (
          <div className="space-y-4 text-xs text-slate-300">
            <p className="leading-relaxed">
              Import bookmarks directly from your browser&apos;s native bookmark tree into your AegisMark encrypted vault.
            </p>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-[11px] text-slate-400 leading-relaxed font-mono">
              Status: {isNative ? 'Browser Bookmarks API active' : 'Web Simulator active (sample bookmarks ready)'}
            </div>

            <button
              onClick={handleImport}
              disabled={isProcessing}
              className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-2"
            >
              {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              <span>Import & Encrypt Bookmarks</span>
            </button>
          </div>
        )}

        {/* EXPORT VIEW WITH PLAIN-TEXT LEAKAGE WARNING */}
        {activeTab === 'export' && (
          <div className="space-y-4 text-xs text-slate-300">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 space-y-1.5">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Security Warning: Plaintext Export</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-200/90">
                Exporting decrypted bookmarks into Chrome or Firefox may cause browser native synchronization (such as Google Sync or Firefox Sync) to transmit your plaintext URLs to your Google or Mozilla account.
              </p>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={hasAcknowledgedWarning}
                onChange={(e) => setHasAcknowledgedWarning(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-950"
              />
              <span>
                I understand that exporting to the browser creates unencrypted bookmarks in my browser tree.
              </span>
            </label>

            <button
              onClick={handleExport}
              disabled={!hasAcknowledgedWarning || isProcessing}
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>Export to Browser Bookmarks</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
