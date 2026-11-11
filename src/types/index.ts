/**
 * @license
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 sakibcraft@gmail.com
 */

export interface BookmarkItem {
  id: string;
  url: string;
  title: string;
  description?: string;
  notes?: string;
  folderId: string;
  tags: string[];
  isFavorite: boolean;
  isInTrash: boolean;
  trashedAt?: number;
  conflictOriginalId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface FolderItem {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  parentId?: string | null;
  createdAt: number;
}

export interface EncryptedRecord {
  id: string;
  vaultId: string;
  keyVersion: number;
  revision: number;
  iv: string; // base64 12-byte IV
  ciphertext: string; // base64 AES-256-GCM ciphertext + tag
  updatedAt: number;
}

export interface VaultHeader {
  vaultId: string;
  keyVersion: number;
  kdfType: 'pbkdf2';
  iterations: number;
  accountSalt: string; // hex string 16 bytes
  vaultSalt: string; // hex string 16 bytes
  wrappedSecretKek: {
    iv: string;
    ciphertext: string;
  };
  wrappedSecretRecovery: {
    iv: string;
    ciphertext: string;
  };
  recoveryAuthHash: string; // SHA-256 of RecoveryAuthKey
  schemaVersion: number;
  updatedAt: number;
}

export interface VaultSession {
  isUnlocked: boolean;
  masterSecret: CryptoKey | null;
  recordKey: CryptoKey | null;
  vaultId: string;
  keyVersion: number;
  mode: 'local' | 'cloud';
  userEmail?: string;
  unlockedAt?: number;
}

export interface DeviceSession {
  deviceId: string;
  deviceName: string;
  os: string;
  browser: string;
  lastSyncAt: number;
  isCurrent: boolean;
}

export interface SubscriptionTier {
  plan: 'free' | 'pro';
  isTrial: boolean;
  trialDaysRemaining: number;
  expiresAt?: number;
}

export interface SyncStats {
  lastSyncAt: number | null;
  totalSynced: number;
  pendingUploads: number;
  pendingDownloads: number;
  status: 'idle' | 'syncing' | 'error' | 'offline';
  errorMessage?: string;
}
