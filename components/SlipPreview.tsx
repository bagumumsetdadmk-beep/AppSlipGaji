import React from 'react';
import { EmployeeData } from '@/types/employee';
import { calculateTotalPotongan, calculateSisaGaji, formatCurrency } from '@/lib/format';

type Props = {
  employee: EmployeeData;
  month: string;
  year: string;
};

export default function SlipPreview({ employee: emp, month, year }: Props) {
  const isZero = (v: number) => !v || v === 0;

  return (
    <div className="w-full max-w-lg mx-auto text-xs sm:text-sm font-mono text-slate-800">
      <div className="text-center border-b-2 border-slate-100 pb-6 mb-6">
        <h2 className="font-black text-sm sm:text-base uppercase tracking-tight">RINCIAN GAJI BULAN {month.toUpperCase()} {year}</h2>
        <h3 className="font-bold text-[10px] sm:text-xs text-slate-400">BAGIAN UMUM SETDA KAB. DEMAK</h3>
      </div>

      <div className="bg-slate-50 p-4 rounded-xl mb-6">
        <div className="flex mb-2">
          <span className="w-20 font-bold text-slate-500">NOMOR</span>
          <span className="mr-2 text-slate-400">:</span>
          <span className="font-black text-slate-700">{emp.nomor}</span>
        </div>
        <div className="flex">
          <span className="w-20 font-bold text-slate-500">NAMA</span>
          <span className="mr-2 text-slate-400">:</span>
          <span className="font-black text-slate-900">{emp.nama}</span>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
        <span className="font-black uppercase text-slate-500">GAJI POKOK</span>
        <span className="font-black text-base">{formatCurrency(emp.gaji)}</span>
      </div>

      <div className="mb-3 mt-6">
        <span className="font-black uppercase text-[10px] sm:text-xs text-slate-400 tracking-widest">POTONGAN / ANGSURAN IURAN :</span>
      </div>

      <div className="flex flex-col gap-1.5 pl-0 text-[11px] sm:text-xs text-slate-600">
        <Row label="B.P.D." value={emp.bpd} note={emp.bpdKeDr} show={true} />
        <Row label="ZAKAT PROFESI" value={emp.zakatProfesi} show={true} />
        <Row label="KOPERASI MAS" value={emp.koperasiMas} note={emp.koperasiKeDr} show={true} />
        <Row label="DANA KORPRI" value={emp.danaKorpri} show={true} />
        <Row label="KESETIAKAWANAN" value={emp.kesetiakawanan} show={true} />
        <Row label="DWP IURAN ANGGOTA" value={emp.dwpIuranAnggota} show={true} />
        <Row label="DWP ARISAN" value={emp.dwpArisan} show={true} />
        <Row label="DWP TAB SETDA" value={emp.dwpTabSetda} show={true} />
        <Row label="DWP TAB BAG UMUM" value={emp.dwpTabBagUmum} show={true} />
        <Row label="DWP KAS UNSUR PIMPINAN" value={emp.dwpKasUnsurPimpinan} show={true} />
        <Row label="DWP GNOTA" value={emp.dwpGnota} show={true} />
        <Row label="TAB LEBARAN (BU SITI)" value={emp.tabLebaran} show={true} />
        <Row label="GNOTA" value={emp.gnota} show={true} />
        <Row label="PMI" value={emp.pmi} show={true} />
      </div>

      <div className="flex justify-between items-center mt-4 border-t-2 border-slate-100 pt-4 mb-8 text-slate-500">
        <span className="font-bold">JUMLAH POTONGAN</span>
        <span className="font-black">{formatCurrency(calculateTotalPotongan(emp))}</span>
      </div>

      <div className="bg-emerald-500 rounded-xl p-5 text-white flex justify-between items-center mb-8 shadow-lg shadow-emerald-500/20 mt-6">
        <span className="font-bold uppercase tracking-wider text-[10px] sm:text-xs opacity-90 text-left">SISA BERSIH DITERIMA</span>
        <span className="font-black text-lg sm:text-xl">{formatCurrency(calculateSisaGaji(emp))}</span>
      </div>

      <div className="flex justify-end text-center mt-8">
        <div className="text-slate-600">
          <p className="mb-14 text-xs font-medium">Bendahara Gaji</p>
          <p className="font-black underline underline-offset-4 decoration-2 decoration-slate-300 text-slate-800">WURYANTO, S.M</p>
          <p className="text-[10px] mt-1 font-bold text-slate-400">NIP 198206292008011017</p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, note, show }: { label: string; value: number; note?: string; show: boolean }) {
  if (!show) return null;
  // If we should always render the row even if 0, then we do it. PDF shows "-" for 0.
  return (
    <div className="flex items-center">
      <span className="w-48">{label}</span>
      <span className="mr-4">:</span>
      <span className="w-24 text-right">{value === 0 ? '-' : formatCurrency(value)}</span>
      {note && (
        <span className="ml-4 whitespace-nowrap">KE/DR : <span className="ml-2">{note}</span></span>
      )}
    </div>
  );
}
