/**
 * @license
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 sakibcraft@gmail.com
 * 
 * Devices & Zero-Knowledge Sync Manager
 */

import React, { useState } from 'react';
import { DeviceSession, BookmarkItem, SyncStats } from '../types';
import {
  Laptop,
  Smartphone,
  RefreshCw,
  Shield,
  Trash2,
  CheckCircle,
  AlertCircle,
  Radio,
  KeyRound
} from 'lucide-react';

interface DevicesAndSyncProps {
  devices: DeviceSession[];
  syncStats: SyncStats;
  bookmarks: BookmarkItem[];
  onTriggerSync: () => Promise<void>;
  onSimulateConflict: () => Promise<void>;
  onRevokeDevice: (deviceId: string) => Promise<void>;
  onRotateMasterSecret: () => Promise<void>;
}

export const DevicesAndSync: React.FC<DevicesAndSyncProps> = ({
  devices,
  syncStats,
  bookmarks,
  onTriggerSync,
  onSimulateConflict,
  onRevokeDevice,
  onRotateMasterSecret
}) => {
  const [isRotating, setIsRotating] = useState(false);
  const [rotationMsg, setRotationMsg] = useState('');
  const [conflictMsg, setConflictMsg] = useState('');

  const handleSimulateConflictClick = async () => {
    try {
      setConflictMsg('Simulating concurrent modification from secondary device...');
      await onSimulateConflict();
      setConflictMsg('✓ Conflict detected & non-destructively preserved as [Conflict - Pixel 9] item!');
      setTimeout(() => setConflictMsg(''), 4000);
    } catch (err: any) {
      setConflictMsg(err.message || 'Simulation failed');
    }
  };

  const handleRotateSecretClick = async () => {
    setIsRotating(true);
    setRotationMsg('Rotating Master Secret and re-encrypting local records under keyVersion 2...');
    try {
      await onRotateMasterSecret();
      setRotationMsg('✓ Master Secret rotated and all records re-encrypted successfully!');
      setTimeout(() => setRotationMsg(''), 4000);
    } catch (err: any) {
      setRotationMsg(err.message || 'Key rotation failed');
    } finally {
      setIsRotating(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Sync Status Banner */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <h2 className="text-base font-bold font-display text-white">
              Zero-Knowledge Cloud Sync Relay
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Encrypted records synchronized via atomic Compare-And-Swap (CAS) revision protocol.
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs font-mono text-slate-500">
            <span>Last Sync: {syncStats.lastSyncAt ? new Date(syncStats.lastSyncAt).toLocaleTimeString() : 'Just now'}</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-400">{syncStats.totalSynced} records in vault</span>
          </div>
        </div>

        <button
          onClick={onTriggerSync}
          disabled={syncStats.status === 'syncing'}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shadow-sm shadow-emerald-500/20"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncStats.status === 'syncing' ? 'animate-spin' : ''}`} />
          <span>{syncStats.status === 'syncing' ? 'Synchronizing...' : 'Synchronize Now'}</span>
        </button>
      </div>

      {/* Conflict Resolution Demonstration Card */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>Non-Destructive Conflict Resolution Engine</span>
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          When two devices edit the same bookmark while offline, AegisMark guarantees <strong>zero data loss</strong> by forking the secondary edit into an authenticated conflict copy rather than silently overwriting.
        </p>

        {conflictMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-300 text-xs">
            {conflictMsg}
          </div>
        )}

        <button
          onClick={handleSimulateConflictClick}
          disabled={bookmarks.length === 0}
          className="px-3.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors disabled:opacity-50"
        >
          Simulate Remote Offline Conflict
        </button>
      </div>

      {/* Enrolled Device List */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white">
          Enrolled Devices ({devices.length})
        </h3>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden divide-y divide-slate-800">
          {devices.map(dev => (
            <div
              key={dev.deviceId}
              className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                  {dev.os.toLowerCase().includes('android') || dev.os.toLowerCase().includes('ios') ? (
                    <Smartphone className="w-4 h-4" />
                  ) : (
                    <Laptop className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                    <span>{dev.deviceName}</span>
                    {dev.isCurrent && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                        This Device
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {dev.browser} · {dev.os} · Last active {new Date(dev.lastSyncAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>

              {!dev.isCurrent && (
                <button
                  onClick={() => onRevokeDevice(dev.deviceId)}
                  className="px-2.5 py-1 text-xs text-red-400 hover:bg-red-500/10 border border-red-500/30 rounded-lg transition-colors"
                  title="Revoke sync access for this device"
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Key Rotation & Forward Secrecy Trigger */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-emerald-400" />
          <span>Master Secret Rotation & Epoch Advance</span>
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          If a device is lost or compromised, rotating the Master Secret re-encrypts all active bookmarks under a fresh cryptographic key (`keyVersion 2+`) and revokes access for previously enrolled devices.
        </p>

        {rotationMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-300 text-xs">
            {rotationMsg}
          </div>
        )}

        <button
          onClick={handleRotateSecretClick}
          disabled={isRotating}
          className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 rounded-lg transition-colors flex items-center gap-1.5"
        >
          {isRotating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
          <span>Rotate Master Secret Now</span>
        </button>
      </div>
    </div>
  );
};
