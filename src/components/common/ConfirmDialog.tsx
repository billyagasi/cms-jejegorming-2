import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Input } from '../ui/Input';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  /** Jika diisi, user harus mengetik kata ini persis sebelum tombol konfirmasi aktif */
  confirmWord?: string;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Konfirmasi',
  cancelLabel = 'Batal',
  tone = 'danger',
  confirmWord,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('');

  const canConfirm = !confirmWord || typed === confirmWord;

  const handleClose = () => {
    setTyped('');
    onClose();
  };

  const handleConfirm = () => {
    if (!canConfirm) return;
    setTyped('');
    onConfirm();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      icon={tone === 'danger' ? <AlertTriangle size={18} /> : undefined}
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={handleClose}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            size="sm"
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm text-slate-600 dark:text-slate-300">
        {message}
        {confirmWord && (
          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Ketik <span className="font-mono font-bold text-rose-600">{confirmWord}</span> untuk mengonfirmasi
            </label>
            <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={confirmWord} autoFocus />
          </div>
        )}
      </div>
    </Modal>
  );
}
