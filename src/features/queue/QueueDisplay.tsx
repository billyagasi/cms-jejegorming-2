import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Clock3,
  Expand,
  HeartPulse,
  LogOut,
  Megaphone,
  PawPrint,
  Stethoscope,
  UsersRound,
} from 'lucide-react';
import { useAppStore } from '../../app/store';
import { queryKeys, useAppointments, useAppConfig } from '../../data-layer/hooks';
import { formatDayDateID, todayISO } from '../../lib/format';
import type { Appointment } from '../../types';

type DoctorState = 'Melayani' | 'Siap Memeriksa' | 'Jadwal Berikutnya';

export default function QueueDisplay() {
  const { data: appointments = [] } = useAppointments();
  const { data: config } = useAppConfig();
  const queryClient = useQueryClient();
  const setTab = useAppStore((state) => state.setTab);
  const [now, setNow] = useState(() => new Date());
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));

  useEffect(() => {
    const clock = window.setInterval(() => setNow(new Date()), 1_000);
    const refresh = window.setInterval(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments });
    }, 5_000);
    const handleStorage = () => queryClient.invalidateQueries({ queryKey: queryKeys.appointments });
    const handleFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    window.addEventListener('storage', handleStorage);
    document.addEventListener('fullscreenchange', handleFullscreen);
    return () => {
      window.clearInterval(clock);
      window.clearInterval(refresh);
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('fullscreenchange', handleFullscreen);
    };
  }, [queryClient]);

  const today = todayISO();
  const todayAppointments = useMemo(
    () =>
      appointments
        .filter((item) => item.date === today && item.status !== 'Cancelled')
        .sort(compareQueue),
    [appointments, today]
  );

  const serving = todayAppointments.filter(
    (item) => item.status === 'In_Progress' && Boolean(item.checkedInAt && item.calledAt)
  );
  const waiting = todayAppointments.filter(
    (item) => item.status === 'In_Progress' && Boolean(item.checkedInAt) && !item.calledAt
  );
  const scheduled = todayAppointments.filter(
    (item) => item.status !== 'Completed' && !item.checkedInAt
  );
  const completed = todayAppointments.filter((item) => item.status === 'Completed').length;
  const remaining = serving.length + waiting.length + scheduled.length;

  const doctorCards = useMemo(() => {
    const assigned = new Set(todayAppointments.map((item) => item.doctorName).filter(Boolean));
    const doctors = (config?.doctors ?? []).filter((doctor) => assigned.has(doctor));

    return doctors.map((doctor) => {
      const doctorAppointments = todayAppointments.filter((item) => item.doctorName === doctor);
      const current = doctorAppointments.find(
        (item) => item.status === 'In_Progress' && Boolean(item.checkedInAt && item.calledAt)
      );
      const readyCount = doctorAppointments.filter(
        (item) => item.status === 'In_Progress' && Boolean(item.checkedInAt) && !item.calledAt
      ).length;
      const state: DoctorState = current ? 'Melayani' : readyCount > 0 ? 'Siap Memeriksa' : 'Jadwal Berikutnya';
      const next = current ?? doctorAppointments.find((item) => item.status !== 'Completed' && item.status !== 'Cancelled');
      return { name: doctor, state, current: next, readyCount };
    });
  }, [config?.doctors, todayAppointments]);

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  };

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#071a25] text-white">
      <div className="pointer-events-none absolute -top-52 -right-40 h-[34rem] w-[34rem] rounded-full bg-teal-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-64 -left-40 h-[38rem] w-[38rem] rounded-full bg-sky-500/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1920px] flex-col px-6 py-5 lg:px-10 lg:py-7">
        <header className="flex items-center justify-between gap-6 border-b border-white/10 pb-5">
          <div className="flex items-center gap-4">
            <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-teal-400 text-[#07212a] shadow-lg shadow-teal-500/20">
              <PawPrint size={27} strokeWidth={2.4} />
            </div>
            <div>
              <p className="text-xs font-bold tracking-[0.22em] text-teal-300 uppercase">Jeje Pet Care</p>
              <h1 className="font-display text-2xl font-extrabold tracking-tight lg:text-3xl">Antrean Klinik Hari Ini</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-300">{formatDayDateID(today)}</p>
              <p className="font-mono text-3xl font-bold tracking-tight text-white">
                {now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':')}
              </p>
            </div>
            <button type="button" onClick={toggleFullscreen} className="rounded-xl border border-white/10 bg-white/5 p-3 text-slate-300 transition hover:bg-white/10 hover:text-white" aria-label={isFullscreen ? 'Keluar layar penuh' : 'Buka layar penuh'}>
              <Expand size={20} />
            </button>
            <button type="button" onClick={() => setTab('queue')} className="rounded-xl border border-white/10 bg-white/5 p-3 text-slate-300 transition hover:bg-white/10 hover:text-white" aria-label="Kembali ke Command Center">
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <div className="grid flex-1 gap-5 py-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,.6fr)]">
          <div className="flex min-h-0 flex-col gap-5">
            <div className="grid grid-cols-3 gap-4">
              <Metric label="Total hari ini" value={todayAppointments.length} icon={<UsersRound size={22} />} tone="sky" />
              <Metric label="Sisa antrean" value={remaining} icon={<Clock3 size={22} />} tone="amber" />
              <Metric label="Sudah selesai" value={completed} icon={<HeartPulse size={22} />} tone="teal" />
            </div>

            <div className="flex min-h-[310px] flex-1 flex-col rounded-[2rem] border border-teal-300/20 bg-gradient-to-br from-teal-400/15 via-white/[0.06] to-white/[0.03] p-6 shadow-2xl shadow-black/20 lg:p-8">
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-400 text-[#062029]"><Megaphone size={21} /></span>
                <div><p className="text-xs font-bold tracking-[0.18em] text-teal-300 uppercase">Sedang Dipanggil</p><p className="text-sm text-slate-400">Silakan menuju ruang pemeriksaan</p></div>
              </div>

              {serving.length > 0 ? (
                <div className={`grid flex-1 gap-4 ${serving.length > 1 ? 'md:grid-cols-2' : ''}`}>
                  {serving.map((item) => <NowServing key={item.id} appointment={item} />)}
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-black/10 px-6 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5 text-slate-400"><Clock3 size={30} /></div>
                  <p className="font-display text-2xl font-bold text-white">Belum ada antrean dipanggil</p>
                  <p className="mt-2 max-w-md text-sm text-slate-400">Nomor antrean akan tampil otomatis setelah dipanggil oleh petugas.</p>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div><p className="font-display text-lg font-bold">Antrean Berikutnya</p><p className="text-xs text-slate-400">{waiting.length} pasien sudah check-in</p></div>
                <span className="rounded-full bg-amber-400/15 px-3 py-1.5 text-xs font-bold text-amber-300">Menunggu {waiting.length}</span>
              </div>
              {waiting.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {waiting.slice(0, 4).map((item) => <QueueChip key={item.id} appointment={item} />)}
                </div>
              ) : (
                <p className="rounded-2xl bg-white/[0.035] px-4 py-5 text-center text-sm text-slate-500">Belum ada pasien yang menunggu setelah check-in.</p>
              )}
            </div>
          </div>

          <aside className="flex min-h-0 flex-col gap-5">
            <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div><p className="font-display text-lg font-bold">Dokter Jaga</p><p className="text-xs text-slate-400">Berdasarkan jadwal klinik hari ini</p></div>
                <Stethoscope size={22} className="text-teal-300" />
              </div>
              <div className="space-y-3">
                {doctorCards.length > 0 ? doctorCards.map((doctor) => <DoctorCard key={doctor.name} {...doctor} />) : (
                  <p className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-500">Belum ada jadwal dokter hari ini.</p>
                )}
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col rounded-3xl border border-white/10 bg-white/[0.045] p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div><p className="font-display text-lg font-bold">Jadwal Kedatangan</p><p className="text-xs text-slate-400">Pasien belum check-in</p></div>
                <span className="rounded-full bg-sky-400/15 px-3 py-1.5 text-xs font-bold text-sky-300">{scheduled.length} terjadwal</span>
              </div>
              <div className="custom-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                {scheduled.length > 0 ? scheduled.map((item) => <ScheduleRow key={item.id} appointment={item} />) : (
                  <p className="rounded-2xl bg-white/[0.035] px-4 py-8 text-center text-sm text-slate-500">Tidak ada jadwal berikutnya.</p>
                )}
              </div>
            </div>
          </aside>
        </div>

        <footer className="flex items-center justify-between gap-4 border-t border-white/10 pt-4 text-xs text-slate-500">
          <p>Mohon menunggu hingga nomor antrean Anda dipanggil.</p>
          <p className="flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-teal-400" /> Diperbarui otomatis</p>
        </footer>
      </div>
    </section>
  );
}

function Metric({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: 'sky' | 'amber' | 'teal' }) {
  const tones = { sky: 'bg-sky-400/15 text-sky-300', amber: 'bg-amber-400/15 text-amber-300', teal: 'bg-teal-400/15 text-teal-300' };
  return <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.045] p-4"><div><p className="text-xs font-semibold text-slate-400">{label}</p><p className="mt-1 font-mono text-3xl font-extrabold">{String(value).padStart(2, '0')}</p></div><span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</span></div>;
}

function NowServing({ appointment }: { appointment: Appointment }) {
  return <div className="flex flex-col items-center justify-center rounded-3xl bg-white px-6 py-8 text-center text-[#08202a] shadow-xl"><p className="text-xs font-extrabold tracking-[0.22em] text-teal-700 uppercase">Nomor Antrean</p><p className="my-3 font-mono text-7xl font-black tracking-tighter lg:text-8xl">{appointment.queueNumber || '—'}</p><p className="font-display text-xl font-bold">{petNames(appointment)}</p><p className="mt-2 text-sm font-semibold text-slate-500">{appointment.doctorName || 'Dokter jaga'} · {appointment.service?.name || 'Pemeriksaan klinik'}</p></div>;
}

function QueueChip({ appointment }: { appointment: Appointment }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"><p className="font-mono text-2xl font-black text-amber-300">{appointment.queueNumber || '—'}</p><p className="mt-1 truncate text-sm font-bold">{petNames(appointment)}</p><p className="truncate text-[11px] text-slate-500">{appointment.doctorName || 'Dokter jaga'}</p></div>;
}

function DoctorCard({ name, state, current, readyCount }: { name: string; state: DoctorState; current?: Appointment; readyCount: number }) {
  const active = state === 'Melayani';
  return <div className={`rounded-2xl border p-4 ${active ? 'border-teal-300/30 bg-teal-400/10' : 'border-white/10 bg-white/[0.035]'}`}><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-teal-400 text-[#07212a]' : 'bg-white/10 text-slate-300'}`}><Stethoscope size={19} /></span><div className="min-w-0"><p className="truncate font-display text-sm font-bold">{name}</p><p className="mt-0.5 truncate text-[11px] text-slate-400">{current ? `${current.timeSlot} · ${current.service?.name || 'Klinik'}` : 'Tidak ada pasien aktif'}</p></div></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${active ? 'bg-teal-400 text-[#062029]' : state === 'Siap Memeriksa' ? 'bg-amber-400/15 text-amber-300' : 'bg-sky-400/15 text-sky-300'}`}>{state}</span></div>{readyCount > 0 && <p className="mt-3 border-t border-white/10 pt-3 text-[11px] text-slate-400">{readyCount} pasien menunggu dokter ini</p>}</div>;
}

function ScheduleRow({ appointment }: { appointment: Appointment }) {
  return <div className="flex items-center gap-3 rounded-2xl bg-white/[0.035] p-3"><span className="rounded-lg bg-sky-400/10 px-2.5 py-2 font-mono text-xs font-bold text-sky-300">{appointment.timeSlot.split(' ')[0]}</span><div className="min-w-0"><p className="truncate text-sm font-bold">{petNames(appointment)}</p><p className="truncate text-[11px] text-slate-500">{appointment.doctorName || 'Dokter ditentukan klinik'}</p></div></div>;
}

function petNames(appointment: Appointment): string {
  return appointment.pets.map((pet) => pet.petName).join(' & ');
}

function compareQueue(a: Appointment, b: Appointment): number {
  if (a.queueNumber && b.queueNumber) return a.queueNumber.localeCompare(b.queueNumber);
  if (a.queueNumber) return -1;
  if (b.queueNumber) return 1;
  return a.timeSlot.localeCompare(b.timeSlot);
}
