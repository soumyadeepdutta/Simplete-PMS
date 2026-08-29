import React, { useState } from 'react';
import { useKanban } from '../../context/KanbanContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../ui/Modal';
import { Download, Upload, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const ExportImportModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { exportData, importData, resetDefaultData } = useKanban();
  const { can } = useAuth();
  const canImport = can('settings:manage');
  const [importJson, setImportJson] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleDownload = () => {
    exportData();
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canImport || !importJson.trim()) return;

    const success = importData(importJson.trim());
    if (success) {
      setImportStatus('success');
      setTimeout(() => {
        onClose();
        setImportStatus('idle');
        setImportJson('');
      }, 1200);
    } else {
      setImportStatus('error');
      setErrorMessage('Invalid data schema. Could not restore workspaces.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportJson(content);
    };
    reader.readAsText(file);
  };

  const handleResetToDemo = () => {
    if (!canImport) return;
    if (window.confirm('Reset all workspaces to factory demo state? This cannot be undone.')) {
      resetDefaultData();
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Data Architecture & Sync"
      description="Export workspace snapshot or restore from JSON backup"
      maxWidth="lg"
    >
      <div className="space-y-6">
        <div className="p-4 rounded-xl bg-surface-muted border border-border space-y-2.5">
          <h4 className="text-xs font-semibold text-ink uppercase tracking-wider flex items-center gap-2">
            <Download className="w-3.5 h-3.5 text-accent-blue" />
            Snapshot Export
          </h4>
          <p className="text-xs text-ink-muted">
            Download your full project ledger, boards, and milestones as a portable JSON file.
          </p>
          <button
            type="button"
            onClick={handleDownload}
            className="px-4 py-2 bg-surface-muted hover:bg-surface-muted text-ink rounded-xl text-xs font-medium border border-border flex items-center gap-2 transition-colors shadow-card"
          >
            <Download className="w-3.5 h-3.5" />
            Download Ledger Backup (.json)
          </button>
        </div>

        {canImport && (
          <form onSubmit={handleImportSubmit} className="space-y-3">
            <h4 className="text-xs font-semibold text-ink uppercase tracking-wider flex items-center gap-2">
              <Upload className="w-3.5 h-3.5 text-accent-green" />
              Snapshot Restore
            </h4>
            <p className="text-xs text-ink-muted">
              Upload a JSON backup or paste raw data directly into the console below. Owner only.
            </p>

            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="block w-full text-xs text-ink-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-surface-muted file:text-ink hover:file:bg-surface-muted cursor-pointer"
            />

            <textarea
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              placeholder="Paste JSON ledger snapshot here..."
              rows={4}
              className="w-full text-xs p-3 rounded-xl border border-border bg-canvas text-ink font-mono placeholder:text-ink-subtle focus:outline-none focus:ring-1 focus:ring-accent-blue/30 resize-y shadow-inner"
            />

            {importStatus === 'error' && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-accent-red text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {importStatus === 'success' && (
              <div className="p-3 rounded-xl bg-accent-green-soft border border-accent-green/20 text-accent-green text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Ledger snapshot successfully applied.</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={handleResetToDemo}
                className="text-xs text-accent-red hover:text-accent-red font-medium"
              >
                Reset to Factory Demo
              </button>

              <button
                type="submit"
                disabled={!importJson.trim()}
                className="px-5 py-2 text-xs font-medium bg-accent-blue hover:opacity-90 text-white rounded-xl disabled:opacity-50 transition-opacity"
              >
                Apply Snapshot
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
