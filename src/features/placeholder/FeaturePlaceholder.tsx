import { Construction } from 'lucide-react';
import Card from '../../components/ui/Card';

export default function FeaturePlaceholder({ title }: { title: string }) {
  return (
    <Card className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 dark:bg-amber-950/50">
        <Construction size={24} />
      </div>
      <h3 className="font-display text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
        Modul ini sedang dalam pengerjaan ulang dan akan tersedia pada milestone berikutnya.
      </p>
    </Card>
  );
}
