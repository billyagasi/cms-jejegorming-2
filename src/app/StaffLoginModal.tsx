import { useState } from 'react';
import { KeyRound, LogIn } from 'lucide-react';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import { Field, Input } from '../components/ui/Input';
import { useAppStore } from './store';
import { useAppConfig } from '../data-layer/hooks';
import { pushToast } from '../components/ui/toastStore';

interface StaffLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function StaffLoginModal({ isOpen, onClose }: StaffLoginModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { loginStaff } = useAppStore();
  const { data: config } = useAppConfig();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (config && password === config.adminPassword) {
      loginStaff({ username: 'admin', role: 'Administrator' });
      setPassword('');
      useAppStore.getState().setTab('queue');
      onClose();
      pushToast({ tone: 'success', title: 'Selamat datang, Admin', message: 'Sesi backoffice Administrator dimulai.' });
      return;
    }

    const acc = config?.roleAccounts.find((a) => a.password === password);
    if (acc) {
      loginStaff({ username: acc.username, role: acc.role });
      setPassword('');
      useAppStore.getState().setTab('queue');
      onClose();
      pushToast({ tone: 'success', title: `Selamat datang, ${acc.username}`, message: `Sesi ${acc.role} dimulai.` });
      return;
    }

    setError('Password tidak cocok dengan akun manapun. Silakan coba lagi.');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setPassword('');
        setError('');
        onClose();
      }}
      title="Akses BackOffice"
      subtitle="Masuk dengan password akun staf atau admin"
      icon={<KeyRound size={18} />}
      size="sm"
      footer={
        <Button type="submit" form="staff-login-form" size="sm">
          <LogIn size={14} />
          Masuk
        </Button>
      }
    >
      <form id="staff-login-form" onSubmit={handleSubmit} className="space-y-4">
        <Field label="Password" required error={error}>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Masukkan password akun…"
            invalid={!!error}
            autoFocus
          />
        </Field>
        <p className="text-[11px] leading-relaxed text-slate-400">
          Administrator memiliki akses penuh. Akun staf (Senior Groomer, Junior Groomer, Bathing Specialist, Stylist)
          memiliki akses sesuai izin tab yang diatur admin.
        </p>
      </form>
    </Modal>
  );
}
