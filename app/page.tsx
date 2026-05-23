"use client";

import React, { useState } from "react";
import Image from "next/image";
import { EmployeeData } from "@/types/employee";
import { parseExcelToEmployees, downloadTemplate } from "@/lib/excel";
import { formatCurrency, calculateSisaGaji } from "@/lib/format";
import { WAConfigDialog } from "@/components/wa-config-dialog";
import { pdf } from "@react-pdf/renderer";
import { SlipPDFDocument } from "@/components/SlipPDF";
import QRCode from "qrcode";
import SlipPreview from "@/components/SlipPreview";
import { 
  FileSpreadsheet, 
  Settings, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  Upload,
  RefreshCw,
  Eye,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { createRoot } from "react-dom/client";

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export default function Page() {
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isWAOpen, setIsWAOpen] = useState(false);
  
  const [sendLogs, setSendLogs] = useState<Array<{ name: string, status: 'success'|'error', error?: string }>>([]);
  const [sending, setSending] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [nextDelay, setNextDelay] = useState(0);
  const [previewEmp, setPreviewEmp] = useState<EmployeeData | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    try {
      const data = await parseExcelToEmployees(file);
      setEmployees(data);
      setSendLogs([]);
    } catch (err: any) {
      setError(err.message || "Gagal membaca file Excel. Pastikan formatnya sesuai.");
    } finally {
      setLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSendAll = async () => {
    if (!employees.length) return;
    
    // Check WA status first
    try {
      const res = await fetch('/api/wa');
      const waStatus = await res.json();
      if (!waStatus.isConnected) {
        setIsWAOpen(true);
        return;
      }
    } catch(e) {
      alert("Gagal mengecek status WA. Pastikan server nyala.");
      return;
    }

    setSending(true);
    setSendLogs([]);

    for (let i = 0; i < employees.length; i++) {
      setCurrentIdx(i);
      const emp = employees[i];
      let status: 'success'|'error' = 'success';
      let errorMsg = '';

      if (!emp.noWa) {
        status = 'error';
        errorMsg = 'Nomor WA kosong';
      } else {
        try {
          // Generate PDF
          const qrText = `Dokumen ini telah ditandatangani secara elektronik oleh:\nNama: WURYANTO, S.M\nNIP: 198206292008011017\nJabatan: Bendahara Gaji Setda Demak\nTahun: ${selectedYear}\nBulan: ${selectedMonth}`;
          const qrDataUrl = await QRCode.toDataURL(qrText);
          
          const asPdf = pdf();
          asPdf.updateContainer(<SlipPDFDocument employee={emp} month={selectedMonth} year={selectedYear} qrCodeDataUrl={qrDataUrl} />);
          const blob = await asPdf.toBlob();

          // Convert blob to base64
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          const pdfBase64 = await new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
          });

          // 4. Send via WA API
          const textMsg = `Berikut adalah rincian gaji Anda untuk bulan *${selectedMonth} ${selectedYear}*\n\nTerima kasih.`;
          
          const sendRes = await fetch('/api/wa/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: emp.noWa,
              message: textMsg,
              pdfBase64,
              pdfFilename: `Slip_Gaji_${emp.nama.replace(/\s+/g, '_')}_${selectedMonth}_${selectedYear}.pdf`
            })
          });

          const sendData = await sendRes.json();
          if (!sendData.success) {
            status = 'error';
            errorMsg = sendData.error || 'Server error';
          }

        } catch (err: any) {
           status = 'error';
           errorMsg = err.message || 'Gagal memproses';
        }
      }

      setSendLogs(curr => [...curr, { name: emp.nama, status, error: errorMsg }]);
      
      // Anti-Ban Security Delay (5-10 seconds randomized)
      if (i < employees.length - 1) {
        const delay = Math.floor(Math.random() * (10000 - 5000 + 1)) + 5000;
        setNextDelay(delay / 1000);
        await new Promise(r => setTimeout(r, delay));
      }
    }

    setSending(false);
    setCurrentIdx(-1);
    setNextDelay(0);
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Header */}
      <nav className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 px-4 md:px-8 py-4 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="relative w-12 h-12 flex-shrink-0 bg-white p-1 rounded-xl shadow-sm border border-slate-100 flex items-center justify-center">
            <Image src="/logo.png" alt="Logo Demak" width={36} height={36} className="object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">
              WhatsApp SlipGaji
            </h1>
            <p className="text-sm text-slate-500 font-medium">Bagian Umum Setda Demak</p>
          </div>
        </div>
        
        <div className="flex gap-3">
           <button onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-sm font-semibold transition-all hover:shadow-sm">
              <Download className="w-4 h-4" />
              <span className="hidden md:inline">Template Excel</span>
           </button>
           <button onClick={() => setIsWAOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black text-white rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg">
              <Settings className="w-4 h-4" />
              <span>Koneksi WA</span>
           </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 mt-8 space-y-6">
        
        {/* Upload Card */}
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200/60 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
           <div className="flex flex-wrap items-end justify-between gap-6 mb-8 relative z-10">
              <div className="space-y-1.5">
                 <h2 className="text-2xl font-bold flex items-center gap-2.5 text-slate-800">
                    <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    Data Pegawai & Gaji
                 </h2>
                 <p className="text-sm text-slate-500 font-medium">Unggah file Excel sesuai format template untuk mulai memproses.</p>
              </div>
           </div>
           
           <div className="grid md:grid-cols-3 gap-6 relative z-10">
             <div className="md:col-span-2">
               <label className="border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 transition-all rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer group">
                  <div className="bg-blue-100 text-blue-600 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform shadow-sm">
                     {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                  </div>
                  <span className="font-bold text-slate-700 text-lg">Pilih File Excel</span>
                  <span className="text-sm text-slate-400 mt-1">Format didukung: .xlsx, .xls</span>
                  <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileUpload} disabled={loading || sending} />
               </label>
               {error && (
                 <div className="mt-4 p-4 bg-red-50 text-red-700 text-sm font-medium rounded-xl flex items-start gap-3 ring-1 ring-inset ring-red-100">
                   <AlertTriangle className="w-5 h-5 shrink-0" />
                   <p>{error}</p>
                 </div>
               )}
             </div>

             <div className="space-y-4">
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-2">Periode Bulan</label>
                   <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} disabled={sending} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors shadow-sm">
                      {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                   </select>
                </div>
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-2">Periode Tahun</label>
                   <input
                     type="number"
                     value={selectedYear}
                     onChange={e => setSelectedYear(e.target.value)}
                     disabled={sending}
                     placeholder="Contoh: 2024"
                     className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors shadow-sm"
                   />
                </div>
             </div>
           </div>
        </div>

        {/* Data & Logs */}
        {employees.length > 0 && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden">
             <div className="p-6 md:p-8 border-b border-slate-100 flex flex-wrap justify-between items-center gap-4 bg-slate-50/50">
                <div>
                   <h3 className="font-extrabold text-xl text-slate-800">Daftar Penerima Slip Gaji ({employees.length})</h3>
                   <p className="text-sm text-slate-500 font-medium mt-1">Pastikan WhatsApp tujuan valid sebelum memproses pengiriman.</p>
                </div>
                <button 
                  onClick={handleSendAll} 
                  disabled={sending}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 active:scale-95 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  {sending ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  {sending ? 'Memproses...' : 'Kirim Semua via WA'}
                </button>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white/50 text-slate-500 text-xs uppercase font-extrabold tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-5">No</th>
                      <th className="px-6 py-5">Nama Pegawai</th>
                      <th className="px-6 py-5">No. WhatsApp</th>
                      <th className="px-6 py-5 text-right w-[180px]">Sisa Diterima</th>
                      <th className="px-6 py-5 w-[160px]">Status Kirim</th>
                      <th className="px-6 py-5 text-center w-[120px]">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {employees.map((emp, i) => {
                       const log = sendLogs.find(l => l.name === emp.nama);
                       return (
                         <tr key={i} className="hover:bg-blue-50/40 transition-colors group">
                           <td className="px-6 py-4 text-slate-500 font-medium">{i + 1}</td>
                           <td className="px-6 py-4 font-bold text-slate-800">{emp.nama}</td>
                           <td className="px-6 py-4 font-mono text-slate-600">{emp.noWa || '-'}</td>
                           <td className="px-6 py-4 font-bold text-slate-800 text-right">{formatCurrency(calculateSisaGaji(emp))}</td>
                           <td className="px-6 py-4">
                              {!log ? (
                                <span className="inline-flex py-1 px-3 rounded-full bg-slate-100 text-slate-600 text-xs font-bold ring-1 ring-inset ring-slate-200">
                                  Menunggu
                                </span>
                              ) : log.status === 'success' ? (
                                <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold ring-1 ring-inset ring-emerald-200">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Berhasil
                                </span>
                              ) : (
                                <span className="inline-flex flex-col gap-1 items-start">
                                  <span className="inline-flex py-1 px-3 rounded-full bg-rose-50 text-rose-700 text-xs font-bold ring-1 ring-inset ring-rose-200">Gagal</span>
                                  <span className="text-[11px] text-rose-600 font-medium max-w-[150px] leading-tight flex-wrap">{log.error}</span>
                                </span>
                              )}
                           </td>
                           <td className="px-6 py-4 text-center">
                              <button 
                                onClick={() => setPreviewEmp(emp)}
                                className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-4 py-2 rounded-xl transition-colors opacity-80 group-hover:opacity-100"
                              >
                                 <Eye className="w-4 h-4" /> Preview
                              </button>
                           </td>
                         </tr>
                       )
                     })}
                  </tbody>
                </table>
             </div>
          </div>
        )}
      </div>

      <WAConfigDialog open={isWAOpen} onOpenChange={setIsWAOpen} />
      
      {/* Preview Dialog */}
      <AnimatePresence>
         {previewEmp && (
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" 
             onClick={() => setPreviewEmp(null)}
           >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white p-6 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200/50" 
                onClick={e => e.stopPropagation()}
              >
                 <div className="flex justify-between items-center mb-5 shrink-0 px-2 mt-2">
                    <h3 className="font-extrabold text-xl text-slate-800">Preview Slip Gaji <span className="text-blue-600">- {previewEmp.nama}</span></h3>
                    <button onClick={() => setPreviewEmp(null)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors">
                       <X className="w-6 h-6" />
                    </button>
                 </div>
                 <div className="overflow-y-auto overflow-x-auto bg-slate-50 border border-slate-100 flex-1 rounded-2xl shadow-inner">
                    <div className="min-w-[600px] p-8">
                       <SlipPreview employee={previewEmp} month={selectedMonth} year={selectedYear} />
                    </div>
                 </div>
              </motion.div>
           </motion.div>
         )}
      </AnimatePresence>

    </main>
  );
}

