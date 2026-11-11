/**
 * @license
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 sakibcraft@gmail.com
 * 
 * AegisMark Main Application Core
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { BookmarkItem, FolderItem, VaultHeader, VaultSession, DeviceSession, SubscriptionTier, SyncStats } from './types';
import { Navbar } from './components/Navbar';
import { VaultUnlockModal } from './components/VaultUnlockModal';
import { BookmarkList } from './components/BookmarkList';
import { FoldersManager } from './components/FoldersManager';
import { TrashView } from './components/TrashView';
import { PrivacyCenter } from './components/PrivacyCenter';
import { DevicesAndSync } from './components/DevicesAndSync';
import { ExtensionSimulator } from './components/ExtensionSimulator';
import { QuickSaveModal } from './components/QuickSaveModal';
import { NativeBookmarksModal } from './components/NativeBookmarksModal';
import { ExportExtensionModal } from './components/ExportExtensionModal';
import { PricingModal } from './components/PricingModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';

import {
  getVaultHeader,
  saveVaultHeader,
  putBatchEncryptedRecords
} from './storage/db';
import {
  initializeDefaultFolders,
  loadAndDecryptAllBookmarks,
  saveBookmark,
  softDeleteBookmark,
  restoreBookmark,
  permanentlyDeleteBookmark,
  emptyTrash,
  autoPruneOldTrash
} from './storage/bookmarks';
import { SyncRelayService } from './services/syncRelay';
import {
  generateEncryptedBackup,
  restoreFromEncryptedBackup,
  generateNetscapeHtml
} from './storage/importExport';
import { wrapMasterSecret, encryptBookmarkRecord, deriveRecordKey } from './crypto/engine';
import { Download, Upload, FileCode, Check, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function App() {
  const [header, setHeader] = useState<VaultHeader | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Active Cryptographic Session
  const [session, setSession] = useState<VaultSession>({
    isUnlocked: false,
    masterSecret: null,
    recordKey: null,
    vaultId: '',
    keyVersion: 1,
    mode: 'local'
  });

  // State Collections
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [syncStats, setSyncStats] = useState<SyncStats>({
    lastSyncAt: null,
    totalSynced: 0,
    pendingUploads: 0,
    pendingDownloads: 0,
    status: 'idle'
  });

  const [tier, setTier] = useState<SubscriptionTier>({
    plan: 'free',
    isTrial: false,
    trialDaysRemaining: 14
  });

  const [activeTab, setActiveTab] = useState<'bookmarks' | 'folders' | 'trash' | 'sync' | 'privacy' | 'pricing'>('bookmarks');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Modals & Panels
  const [showSimulator, setShowSimulator] = useState(false);
  const [showQuickSave, setShowQuickSave] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showNativeModal, setShowNativeModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showPlaintextWarning, setShowPlaintextWarning] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMac = typeof window !== 'undefined' && (/Mac|iPod|iPhone|iPad/.test(navigator.platform) || /Mac/.test(navigator.userAgent));

  const handleLockVault = useCallback(() => {
    setSession({
      isUnlocked: false,
      masterSecret: null,
      recordKey: null,
      vaultId: '',
      keyVersion: 1,
      mode: 'local'
    });
    setBookmarks([]);
  }, []);

  const focusSearchBar = useCallback(() => {
    if (activeTab !== 'bookmarks') {
      setActiveTab('bookmarks');
    }
    setShowShortcutsModal(false);

    // Multi-frame reliable focus targeting loop to ensure search input is focused
    // across immediate DOM availability, tab switching re-renders, and animation frames
    let frameCount = 0;
    const maxFrames = 12;

    const tryFocusTarget = () => {
      const searchInput = document.getElementById('aegismark-search-input') as HTMLInputElement | null;
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
        try {
          searchInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch {
          // ignore scroll errors
        }
      } else if (frameCount < maxFrames) {
        frameCount++;
        requestAnimationFrame(tryFocusTarget);
      }
    };

    // Immediate attempt
    const immediateEl = document.getElementById('aegismark-search-input') as HTMLInputElement | null;
    if (immediateEl) {
      immediateEl.focus();
      immediateEl.select();
    } else {
      requestAnimationFrame(tryFocusTarget);
    }

    // Safety fallback timeouts for slower mounts
    setTimeout(tryFocusTarget, 40);
    setTimeout(tryFocusTarget, 120);
  }, [activeTab]);

  // Centralized Global Keyboard Shortcut Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cross-platform modifier: Cmd on macOS, Ctrl on Windows / Linux
      const isModifier = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      // Ctrl/Cmd + N -> Open 'Quick Save' Modal
      if (isModifier && !e.shiftKey && !e.altKey && key === 'n') {
        e.preventDefault();
        e.stopPropagation();
        if (session.isUnlocked) {
          setShowShortcutsModal(false);
          setShowQuickSave(true);
        }
        return;
      }

      // Ctrl/Cmd + F or Ctrl/Cmd + K -> Focus Search Bar
      if (isModifier && !e.shiftKey && !e.altKey && (key === 'f' || key === 'k')) {
        e.preventDefault();
        e.stopPropagation();
        if (session.isUnlocked) {
          focusSearchBar();
        }
        return;
      }

      // Escape -> Close active modal or blur search
      if (e.key === 'Escape') {
        if (showShortcutsModal) {
          setShowShortcutsModal(false);
          return;
        }
        if (showQuickSave) {
          setShowQuickSave(false);
          return;
        }
        if (showSimulator) {
          setShowSimulator(false);
          return;
        }
        if (showNativeModal) {
          setShowNativeModal(false);
          return;
        }
        if (showExportModal) {
          setShowExportModal(false);
          return;
        }
        if (showPlaintextWarning) {
          setShowPlaintextWarning(false);
          return;
        }
        if (showPricingModal) {
          setShowPricingModal(false);
          return;
        }
        if (document.activeElement?.id === 'aegismark-search-input') {
          (document.activeElement as HTMLElement).blur();
        }
        return;
      }

      // Ctrl+L / Cmd+L or Alt+L -> Lock Vault
      if (
        (isModifier && (e.key === 'l' || e.key === 'L')) ||
        (e.altKey && (e.key === 'l' || e.key === 'L'))
      ) {
        if (session.isUnlocked) {
          e.preventDefault();
          e.stopPropagation();
          handleLockVault();
        }
        return;
      }

      // Ctrl+Shift+E / Cmd+Shift+E -> Toggle Simulator
      if (isModifier && e.shiftKey && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        e.stopPropagation();
        setShowSimulator(prev => !prev);
        return;
      }

      // ? or Ctrl+/ -> Open Keyboard Shortcuts Reference
      if (
        (e.key === '?' && !isTyping) ||
        (isModifier && (e.key === '/' || e.key === '?'))
      ) {
        e.preventDefault();
        e.stopPropagation();
        setShowShortcutsModal(prev => !prev);
        return;
      }

      // 1-5 Tab Switch Shortcuts (only when not typing in an input/textarea)
      if (!isTyping && !isModifier && !e.altKey && !e.shiftKey) {
        if (e.key === '1') setActiveTab('bookmarks');
        else if (e.key === '2') setActiveTab('folders');
        else if (e.key === '3') setActiveTab('trash');
        else if (e.key === '4') setActiveTab('sync');
        else if (e.key === '5') setActiveTab('privacy');
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [
    session.isUnlocked,
    focusSearchBar,
    handleLockVault,
    showShortcutsModal,
    showQuickSave,
    showSimulator,
    showNativeModal,
    showExportModal,
    showPlaintextWarning,
    showPricingModal
  ]);

  // Inactivity Auto-Lock Timer (15 minutes)
  const lastActivityRef = useRef<number>(Date.now());
  const resetActivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    const handleUserActivity = () => resetActivityTimer();
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('click', handleUserActivity);

    const interval = setInterval(() => {
      // 15 minutes = 900,000 ms
      if (session.isUnlocked && Date.now() - lastActivityRef.current > 15 * 60 * 1000) {
        handleLockVault();
      }
    }, 30000);

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      clearInterval(interval);
    };
  }, [session.isUnlocked, resetActivityTimer, handleLockVault]);

  // Initial Load on mount
  useEffect(() => {
    async function init() {
      try {
        const storedHeader = await getVaultHeader();
        setHeader(storedHeader);

        const initialFolders = await initializeDefaultFolders();
        setFolders(initialFolders);

        const initialDevices = await SyncRelayService.getInstance().initializeDefaultDevices();
        setDevices(initialDevices);
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setIsInitializing(false);
      }
    }
    init();
  }, []);

  // Unlock Vault Callback
  const handleUnlockSuccess = async (
    masterSecret: CryptoKey,
    recordKey: CryptoKey,
    mode: 'local' | 'cloud',
    userEmail?: string
  ) => {
    if (!header) return;

    setSession({
      isUnlocked: true,
      masterSecret,
      recordKey,
      vaultId: header.vaultId,
      keyVersion: header.keyVersion,
      mode,
      userEmail,
      unlockedAt: Date.now()
    });

    // Decrypt all bookmarks from IndexedDB
    try {
      const decrypted = await loadAndDecryptAllBookmarks(recordKey, header.vaultId);

      // Auto-prune trash items older than 30 days
      await autoPruneOldTrash(decrypted);

      // If new vault with 0 bookmarks, seed with starter bookmarks
      if (decrypted.length === 0) {
        const starterBookmarks: BookmarkItem[] = [
          {
            id: crypto.randomUUID(),
            title: 'Electronic Frontier Foundation (EFF)',
            url: 'https://www.eff.org',
            folderId: 'f_research',
            tags: ['privacy', 'digital-rights', 'security'],
            notes: 'Defending civil liberties in the digital world.',
            isFavorite: true,
            isInTrash: false,
            createdAt: Date.now() - 7200000,
            updatedAt: Date.now() - 7200000
          },
          {
            id: crypto.randomUUID(),
            title: 'NIST Computer Security Resource Center',
            url: 'https://csrc.nist.gov',
            folderId: 'f_research',
            tags: ['cryptography', 'nist', 'standards'],
            notes: 'Federal information processing standards & guidelines.',
            isFavorite: true,
            isInTrash: false,
            createdAt: Date.now() - 3600000,
            updatedAt: Date.now() - 3600000
          },
          {
            id: crypto.randomUUID(),
            title: 'Mozilla Developer Network (MDN)',
            url: 'https://developer.mozilla.org',
            folderId: 'f_work',
            tags: ['development', 'web-crypto', 'apis'],
            notes: 'Comprehensive web standards and API reference documentation.',
            isFavorite: false,
            isInTrash: false,
            createdAt: Date.now() - 1800000,
            updatedAt: Date.now() - 1800000
          }
        ];

        for (const item of starterBookmarks) {
          await saveBookmark(item, recordKey, header.vaultId, header.keyVersion);
        }
        setBookmarks(starterBookmarks);
      } else {
        setBookmarks(decrypted);
      }

      setSyncStats(prev => ({ ...prev, totalSynced: decrypted.length }));
    } catch (err) {
      console.error('Failed to load decrypted bookmarks:', err);
    }
  };

  // Bookmark Mutations
  const handleSaveBookmark = async (item: BookmarkItem) => {
    if (!session.recordKey || !session.vaultId) return;
    await saveBookmark(item, session.recordKey, session.vaultId, session.keyVersion);

    setBookmarks(prev => {
      const idx = prev.findIndex(b => b.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = item;
        return next;
      }
      return [item, ...prev];
    });
  };

  const handleSoftDelete = async (item: BookmarkItem) => {
    if (!session.recordKey || !session.vaultId) return;
    await softDeleteBookmark(item, session.recordKey, session.vaultId, session.keyVersion);

    setBookmarks(prev => prev.map(b => b.id === item.id ? { ...b, isInTrash: true, trashedAt: Date.now() } : b));
  };

  const handleRestore = async (item: BookmarkItem) => {
    if (!session.recordKey || !session.vaultId) return;
    await restoreBookmark(item, session.recordKey, session.vaultId, session.keyVersion);

    setBookmarks(prev => prev.map(b => b.id === item.id ? { ...b, isInTrash: false, trashedAt: undefined } : b));
  };

  const handlePermanentDelete = async (id: string) => {
    await permanentlyDeleteBookmark(id);
    setBookmarks(prev => prev.filter(b => b.id !== id));
  };

  const handleEmptyTrash = async () => {
    await emptyTrash(bookmarks);
    setBookmarks(prev => prev.filter(b => !b.isInTrash));
  };

  // Sync Relay Trigger
  const handleTriggerSync = async () => {
    if (!session.recordKey || !session.vaultId) return;
    const result = await SyncRelayService.getInstance().performSync(
      bookmarks,
      session.recordKey,
      session.vaultId,
      session.keyVersion
    );
    setSyncStats(SyncRelayService.getInstance().getStats());
  };

  // Simulate Remote Concurrent Conflict
  const handleSimulateConflict = async () => {
    if (!session.recordKey || !session.vaultId || bookmarks.length === 0) return;
    const target = bookmarks[0];
    const conflictCopy = await SyncRelayService.getInstance().simulateRemoteConcurrentEdit(
      target,
      session.recordKey,
      session.vaultId,
      session.keyVersion
    );
    setBookmarks(prev => [conflictCopy, ...prev]);
  };

  // Revoke Device
  const handleRevokeDevice = async (deviceId: string) => {
    setDevices(prev => prev.filter(d => d.deviceId !== deviceId));
  };

  // Rotate Master Secret (advances keyVersion and re-encrypts all bookmarks)
  const handleRotateMasterSecret = async () => {
    if (!session.recordKey || !header) return;

    // 1. Generate new 256-bit MasterSecret
    const newMasterSecretBytes = crypto.getRandomValues(new Uint8Array(32));
    const newRecordKey = await deriveRecordKey(newMasterSecretBytes);

    const newKeyVersion = (header.keyVersion || 1) + 1;

    // 2. Re-encrypt all bookmarks under newKeyVersion
    for (const b of bookmarks) {
      await saveBookmark(b, newRecordKey, header.vaultId, newKeyVersion);
    }

    const updatedHeader: VaultHeader = {
      ...header,
      keyVersion: newKeyVersion,
      updatedAt: Date.now()
    };

    await saveVaultHeader(updatedHeader);
    setHeader(updatedHeader);

    const newMasterSecretKey = await crypto.subtle.importKey(
      'raw',
      newMasterSecretBytes,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );

    setSession(prev => ({
      ...prev,
      masterSecret: newMasterSecretKey,
      recordKey: newRecordKey,
      keyVersion: newKeyVersion
    }));
  };

  // Export Encrypted .aegis Backup
  const handleExportAegis = async () => {
    try {
      const jsonString = await generateEncryptedBackup();
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aegismark-vault-backup-${new Date().toISOString().slice(0, 10)}.aegis`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    }
  };

  // Plaintext HTML Export
  const handleDownloadNetscapeHtml = () => {
    const htmlString = generateNetscapeHtml(bookmarks);
    const blob = new Blob([htmlString], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookmarks_plaintext_${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
    setShowPlaintextWarning(false);
  };

  // Restore .aegis Backup
  const handleFileRestoreChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const { recordCount, header: restoredHeader } = await restoreFromEncryptedBackup(text);
      setHeader(restoredHeader);
      await saveVaultHeader(restoredHeader);
      alert(`Successfully restored ${recordCount} encrypted records! Please unlock the vault with your master passphrase.`);
      handleLockVault();
    } catch (err: any) {
      alert(`Restore failed: ${err.message}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Native Bookmarks Import callback
  const handleNativeImportComplete = async (
    items: Array<{ title: string; url: string; folder: string }>
  ) => {
    if (!session.recordKey || !session.vaultId) return;

    const newBookmarks: BookmarkItem[] = [];
    for (const item of items) {
      const b: BookmarkItem = {
        id: crypto.randomUUID(),
        title: item.title,
        url: item.url,
        folderId: 'f_work',
        tags: ['browser-imported'],
        isFavorite: false,
        isInTrash: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await saveBookmark(b, session.recordKey, session.vaultId, session.keyVersion);
      newBookmarks.push(b);
    }

    setBookmarks(prev => [...newBookmarks, ...prev]);
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-xs">
        Initializing AegisMark Cryptographic Core...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Hidden file input for .aegis backup restore */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileRestoreChange}
        accept=".aegis,.json"
        className="hidden"
      />

      {/* Top Bar Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isUnlocked={session.isUnlocked}
        onLockToggle={() => {
          if (session.isUnlocked) {
            handleLockVault();
          }
        }}
        onOpenQuickSave={() => setShowQuickSave(true)}
        onOpenExportModal={() => setShowExportModal(true)}
        onOpenShortcuts={() => setShowShortcutsModal(true)}
        onToggleSimulator={() => setShowSimulator(!showSimulator)}
        showSimulator={showSimulator}
        theme={theme}
        onThemeToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      />

      {/* Vault Unlock / Initialization Modal */}
      {(!session.isUnlocked || !header) && (
        <VaultUnlockModal
          header={header}
          onUnlockSuccess={handleUnlockSuccess}
          onHeaderCreated={(newHeader) => setHeader(newHeader)}
        />
      )}

      {/* Main Workspace Viewport */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Workspace Quick Actions Bar (Below the fold) */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <span className="font-mono text-slate-300">
              Vault: <strong className="text-emerald-400 font-bold">{session.mode === 'cloud' ? 'Cloud E2EE' : 'Local Only'}</strong>
            </span>
            <span className="text-slate-600">·</span>
            <span className="font-mono text-slate-400">
              {bookmarks.filter(b => !b.isInTrash).length} Bookmarks
            </span>
            {tier.plan === 'pro' && (
              <>
                <span className="text-slate-600">·</span>
                <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Pro Plan Active
                </span>
              </>
            )}
          </div>

          {/* Backup, Restore, and Native Integration Shortcuts */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNativeModal(true)}
              className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            >
              Browser Bookmarks API
            </button>
            <button
              onClick={handleExportAegis}
              className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors flex items-center gap-1"
              title="Export zero-knowledge encrypted JSON backup (.aegis)"
            >
              <Download className="w-3 h-3 text-emerald-400" />
              <span>Export .aegis</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors flex items-center gap-1"
              title="Restore vault from encrypted .aegis backup"
            >
              <Upload className="w-3 h-3 text-emerald-400" />
              <span>Restore .aegis</span>
            </button>
            <button
              onClick={() => setShowPlaintextWarning(true)}
              className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Export standard Netscape HTML format"
            >
              HTML Export
            </button>
          </div>
        </div>

        {/* View Tabs Switching */}
        {activeTab === 'bookmarks' && (
          <BookmarkList
            bookmarks={bookmarks}
            folders={folders}
            onSaveBookmark={handleSaveBookmark}
            onSoftDelete={handleSoftDelete}
            onOpenQuickSave={() => setShowQuickSave(true)}
            onOpenNativeModal={() => setShowNativeModal(true)}
          />
        )}

        {activeTab === 'folders' && (
          <FoldersManager
            folders={folders}
            bookmarks={bookmarks}
            onFoldersUpdated={setFolders}
            onFilterByTag={(tag) => {
              setActiveTab('bookmarks');
            }}
            onFilterByFolder={(fId) => {
              setActiveTab('bookmarks');
            }}
          />
        )}

        {activeTab === 'trash' && (
          <TrashView
            bookmarks={bookmarks}
            onRestore={handleRestore}
            onPermanentDelete={handlePermanentDelete}
            onEmptyTrash={handleEmptyTrash}
          />
        )}

        {activeTab === 'sync' && (
          <DevicesAndSync
            devices={devices}
            syncStats={syncStats}
            bookmarks={bookmarks}
            onTriggerSync={handleTriggerSync}
            onSimulateConflict={handleSimulateConflict}
            onRevokeDevice={handleRevokeDevice}
            onRotateMasterSecret={handleRotateMasterSecret}
          />
        )}

        {activeTab === 'privacy' && (
          <PrivacyCenter
            header={header}
            onResetVault={() => {
              setHeader(null);
              handleLockVault();
            }}
          />
        )}

        {activeTab === 'pricing' && (
          <div className="py-4">
            <PricingModal
              currentTier={tier}
              onUpgradeOrActivateTrial={(newPlan) => {
                setTier({
                  plan: newPlan,
                  isTrial: newPlan === 'pro',
                  trialDaysRemaining: 14
                });
                alert(newPlan === 'pro' ? '14-Day Free Pro Trial Activated!' : 'Switched to Personal Vault.');
              }}
              onClose={() => setActiveTab('bookmarks')}
            />
          </div>
        )}
      </main>

      {/* Extension Simulator Modal (380x520px realistic popup) */}
      {showSimulator && (
        <ExtensionSimulator
          folders={folders}
          bookmarks={bookmarks}
          isUnlocked={session.isUnlocked}
          onSaveBookmark={handleSaveBookmark}
          onClose={() => setShowSimulator(false)}
          onLockVault={handleLockVault}
        />
      )}

      {/* Quick Save Modal */}
      {showQuickSave && (
        <QuickSaveModal
          folders={folders}
          onSaveBookmark={handleSaveBookmark}
          onClose={() => setShowQuickSave(false)}
        />
      )}

      {/* Native Browser Bookmarks Import/Export Modal */}
      {showNativeModal && (
        <NativeBookmarksModal
          bookmarks={bookmarks}
          onImportComplete={handleNativeImportComplete}
          onClose={() => setShowNativeModal(false)}
        />
      )}

      {/* Export Extension ZIP Packages Modal */}
      {showExportModal && (
        <ExportExtensionModal
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* Plaintext HTML Export Warning Modal */}
      {showPlaintextWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center gap-2 text-amber-400 font-bold font-display text-base pb-2 border-b border-slate-800">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Plaintext HTML Export Warning</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Standard Netscape Bookmark HTML files store bookmark URLs and titles in <strong>unencrypted plaintext</strong>. Anyone who gains access to this downloaded file will be able to read all exported bookmarks.
            </p>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-slate-400 leading-relaxed font-mono">
              For zero-knowledge offline backups, prefer the <strong>Export .aegis</strong> option, which remains fully encrypted under your master passphrase.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowPlaintextWarning(false)}
                className="px-3.5 py-1.5 text-xs font-medium border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDownloadNetscapeHtml}
                className="px-4 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors"
              >
                Download Plaintext HTML
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Cheat Sheet Modal */}
      {showShortcutsModal && (
        <KeyboardShortcutsModal
          onClose={() => setShowShortcutsModal(false)}
          isMac={isMac}
        />
      )}

      {/* Clean Footer */}
      <footer className="w-full border-t border-slate-800 bg-slate-950 px-6 py-4 text-center text-xs text-slate-500 font-mono flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          AegisMark &copy; 2026 sakibcraft@gmail.com · MIT License · Zero-Knowledge Cryptography
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <button
            onClick={() => setShowShortcutsModal(true)}
            className="hover:text-emerald-400 transition-colors flex items-center gap-1 text-[11px]"
            title="Open Keyboard Shortcuts Modal"
          >
            <span>Shortcuts</span>
            <kbd className="px-1 py-0.2 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400">
              ?
            </kbd>
          </button>
          <span>AES-256-GCM</span>
          <span>PBKDF2 600,000 iter</span>
          <span>BIP39 24-Word Recovery</span>
        </div>
      </footer>
    </div>
  );
}
