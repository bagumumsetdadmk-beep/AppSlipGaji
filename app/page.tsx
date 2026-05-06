'use client';

import React, { useState, useRef, useEffect } from 'react';
import { parseExcelToEmployees, downloadTemplate } from '@/lib/excel';
import { EmployeeData } from '@/types/employee';
import SlipPreview from '@/components/SlipPreview';
import { generateWhatsAppLink, calculateSisaGaji } from '@/lib/format';
import { UploadCloud, FileDown, MessageCircle, FileText, Search, AlertCircle, X, Users, QrCode, Send, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { WAConfigDialog } from '@/components/wa-config-dialog';

export default function Home() {
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [month, setMonth] = useState<string>(format(new Date(), 'MMMM', { locale: id }));
  const [year, setYear] = useState<string>(format(new Date(), 'yyyy'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedEmp, setSelectedEmp] = useState<EmployeeData | null>(null);
  
  // WA variables
  const [waConfigOpen, setWaConfigOpen] = useState(false);
  const [waStatus, setWaStatus] = useState({ isConnected: false });
  const [empToRender, setEmpToRender] = useState<EmployeeData | null>(null);
  const hiddenSlipRef = useRef<HTMLDivElement>(null);
  const [sendingState, setSendingState] = useState<{ isSending: boolean, targets: EmployeeData[], currentIdx: number, success: number, fail: number }>({
    isSending: false,
    targets: [],
    currentIdx: 0,
    success: 0,
    fail: 0
  });

  useEffect(() => {
    fetch('/api/wa').then(r => r.json()).then(d => setWaStatus(d)).catch(() => {});
  }, [waConfigOpen]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');
    
    try {
      const data = await parseExcelToEmployees(file);
      setEmployees(data);
      if (data.length === 0) {
        setError('Data kosong atau format tidak sesuai. Silakan gunakan template.');
      }
    } catch (err) {
      console.error(err);
      setError('Gagal membaca file Excel. Pastikan menggunakan template yang disediakan.');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const startMassSend = async () => {
    const targets = employees.filter(e => e.noWa);
    if(targets.length === 0) return alert("Tidak ada data dengan nomor WA yang valid.");
    
    const st = await fetch('/api/wa').then(r => r.json());
    if(!st.isConnected) {
        alert("WhatsApp belum terhubung. Silahkan scan QR Code terlebih dahulu.");
        setWaConfigOpen(true);
        return;
    }

    if (!confirm(`Anda akan mengirim ${targets.length} slip gaji via WhatsApp. Lanjutkan?`)) return;

    setSendingState({ isSending: true, targets, currentIdx: 0, success: 0, fail: 0 });
  };

  const handleSingleSendApi = async (emp: EmployeeData) => {
    const st = await fetch('/api/wa').then(r => r.json());
    if(!st.isConnected) {
        setWaConfigOpen(true);
        return;
    }
    
    setEmpToRender(emp);
    
    setTimeout(async () => {
        try {
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(hiddenSlipRef.current!, { scale: 1.5, useCORS: true, logging: false });
            const imageBase64 = canvas.toDataURL('image/jpeg');
            
            const res = await fetch('/api/wa/send', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({
                  phone: emp.noWa,
                  message: `Slip Gaji ${month} ${year}\n\nNama: ${emp.nama}\nNo: ${emp.nomor}\n\nPesan otomatis dari SIP GAJI.`,
                  imageBase64
              })
            });
            const data = await res.json();
            if(!data.success) throw new Error(data.error);
            alert("Pesan berhasil dikirim!");
        } catch(e: any) {
            alert("Gagal mengirim pesan: " + e.message);
        } finally {
            setEmpToRender(null);
        }
    }, 500);
  };

  useEffect(() => {
    if (sendingState.isSending && sendingState.currentIdx < sendingState.targets.length) {
        const emp = sendingState.targets[sendingState.currentIdx];
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setEmpToRender(emp);
        
        const timer = setTimeout(async () => {
            try {
                const html2canvas = (await import('html2canvas')).default;
                const canvas = await html2canvas(hiddenSlipRef.current!, { scale: 1.5, useCORS: true, logging: false });
                const imageBase64 = canvas.toDataURL('image/jpeg');
                
                const res = await fetch('/api/wa/send', {
                   method: 'POST',
                   headers: {'Content-Type': 'application/json'},
                   body: JSON.stringify({
                       phone: emp.noWa,
                       message: `Slip Gaji ${month} ${year}\n\nNama: ${emp.nama}\nNo: ${emp.nomor}\n\nPesan otomatis dari SIP GAJI.`,
                       imageBase64
                   })
                });
                const data = await res.json();
                if(!data.success) throw new Error(data.error);
                
                setSendingState(prev => ({ ...prev, success: prev.success + 1, currentIdx: prev.currentIdx + 1 }));
            } catch(e) {
                console.error(e);
                setSendingState(prev => ({ ...prev, fail: prev.fail + 1, currentIdx: prev.currentIdx + 1 }));
            }
        }, 800); 
        return () => clearTimeout(timer);
    } else if (sendingState.isSending && sendingState.currentIdx >= sendingState.targets.length) {
        alert(`Pengiriman selesai! Berhasil: ${sendingState.success}, Gagal: ${sendingState.fail}`);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSendingState(prev => ({ ...prev, isSending: false, currentIdx: 0 }));
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setEmpToRender(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendingState.currentIdx, sendingState.isSending, sendingState.targets, month, year]);

  const filtered = employees.filter(e => 
    e.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.nomor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.noWa.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-800 font-sans p-4 sm:p-6 lg:p-8">
      
      <div className="max-w-7xl mx-auto space-y-4 flex flex-col">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/20">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Manajemen Slip Gaji</h1>
              <p className="text-xs text-slate-500 font-medium">Bagian Umum Setda Kab. Demak</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button 
              onClick={() => setWaConfigOpen(true)}
              className={`inline-flex items-center gap-2 px-4 py-2 border-2 ${waStatus.isConnected ? 'border-green-200 text-green-600 bg-green-50' : 'border-slate-100 bg-white text-slate-600'} hover:border-green-300 hover:text-green-700 rounded-xl text-xs font-bold transition-colors`}
            >
              <QrCode className="w-4 h-4" />
              {waStatus.isConnected ? 'WA Terhubung' : 'Koneksi WA'}
            </button>
            <button 
              onClick={downloadTemplate}
              className="inline-flex items-center gap-2 px-4 py-2 border-2 border-slate-100 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-600 rounded-xl text-xs font-bold transition-colors"
            >
              <FileDown className="w-4 h-4" />
              Download Template
            </button>
          </div>
        </header>

        {sendingState.isSending && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    <div>
                        <p className="text-sm font-bold text-blue-900">Mengirim Slip Gaji ({sendingState.currentIdx} / {sendingState.targets.length})</p>
                        <p className="text-xs text-blue-700">Berhasil: {sendingState.success} | Gagal: {sendingState.fail}</p>
                    </div>
                </div>
            </div>
        )}

        {/* Top Controls Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
          
          {/* Form Settings */}
          <section className="lg:col-span-4 flex flex-col gap-4">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col gap-5 shadow-sm">
              <h2 className="font-bold text-sm text-slate-500 uppercase tracking-widest">Periode Gaji</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Bulan</label>
                  <input 
                    type="text" 
                    value={month} 
                    onChange={(e) => setMonth(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:border-slate-300 focus:border-emerald-500 focus:bg-white focus:outline-none transition-colors"
                    placeholder="Misal: MEI"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tahun</label>
                  <input 
                    type="text" 
                    value={year} 
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:border-slate-300 focus:border-emerald-500 focus:bg-white focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border-2 border-dashed border-slate-300 p-6 sm:p-8 flex flex-col items-center justify-center gap-4 hover:border-emerald-400 transition-colors bg-gradient-to-br from-white to-slate-50 text-center relative overflow-hidden group min-h-[200px]">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                {loading ? (
                  <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <UploadCloud className="w-8 h-8 text-emerald-600" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-1">Upload Data Gaji</h2>
                <p className="text-xs text-slate-500 max-w-[200px] mx-auto">
                  Seret file Excel (.xlsx) atau <span className="text-emerald-600 font-semibold">klik untuk telusuri</span>
                </p>
              </div>
              <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".xlsx, .xls" onChange={handleFileUpload} />
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-700 text-xs font-semibold rounded-2xl flex items-start gap-3 border border-red-100">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}
          </section>

          {/* List Area */}
          <section className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 flex flex-col overflow-hidden h-[36rem] shadow-sm">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white z-10 relative">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-slate-800">Daftar Pegawai</h3>
                {employees.length > 0 && (
                  <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">{employees.length} Total</span>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Cari nama / WA..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:border-slate-300 focus:border-emerald-500 focus:bg-white focus:outline-none transition-colors"
                  />
                </div>
                {employees.length > 0 && (
                  <button
                    onClick={startMassSend}
                    disabled={sendingState.isSending}
                    className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Send className="w-4 h-4" />
                    Kirim Semua
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-white custom-scrollbar px-6 relative">
              {employees.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                     <Users className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-sm font-bold text-slate-500">Belum ada data pegawai.</p>
                  <p className="text-xs mt-1 text-slate-400">Upload file Excel untuk memuat data.</p>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead className="text-[10px] text-slate-400 uppercase font-bold border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
                    <tr>
                      <th className="py-3 px-2">Nama Pegawai & No</th>
                      <th className="py-3 px-2">WhatsApp</th>
                      <th className="py-3 px-2 text-right">Sisa Gaji</th>
                      <th className="py-3 px-2 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {filtered.map((emp, i) => (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors group">
                        <td className="py-4 px-2">
                          <p className="font-bold text-slate-800">{emp.nama}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5 font-medium">#{emp.nomor}</p>
                        </td>
                        <td className="py-4 px-2">
                          {emp.noWa ? (
                            <span className="inline-flex items-center gap-1 text-slate-600 font-medium bg-slate-100 px-2 py-1 rounded-md text-[10px]">
                              {emp.noWa}
                            </span>
                          ) : (
                            <span className="text-red-400 text-[10px] font-bold">Kosong</span>
                          )}
                        </td>
                        <td className="py-4 px-2 text-right">
                          <span className="font-mono font-bold text-slate-700">Rp {calculateSisaGaji(emp).toLocaleString('id-ID')}</span>
                        </td>
                        <td className="py-4 px-2">
                          <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setSelectedEmp(emp)}
                              className="px-3 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl text-[10px] font-bold transition-colors"
                            >
                              Preview
                            </button>
                            <button
                              onClick={() => handleSingleSendApi(emp)}
                              disabled={!emp.noWa}
                              className="px-3 py-2 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-[10px] font-bold transition-colors flex items-center gap-1.5"
                            >
                              <MessageCircle className="w-3 h-3" />
                              Kirim
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-slate-500 font-medium text-xs">
                          Pencarian &quot;{searchTerm}&quot; tidak ditemukan
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Preview Modal */}
      {selectedEmp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          <div className="bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-full flex flex-col animate-in fade-in zoom-in-95 duration-200 relative p-4 sm:p-6">
            
            <div className="flex justify-between items-center mb-6 px-2">
               <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                 Preview Live
               </span>
               <button 
                onClick={() => setSelectedEmp(null)}
                className="text-white/40 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-2 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 bg-white rounded-2xl overflow-y-auto custom-scrollbar shadow-inner relative flex flex-col">
               <div className="p-6 pb-20">
                 <SlipPreview employee={selectedEmp} month={month} year={year} />
               </div>

               {/* Absolute bottom actions bar */}
               <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent flex justify-end gap-3 pointer-events-none">
                 <div className="pointer-events-auto flex gap-3">
                  <button 
                    onClick={() => setSelectedEmp(null)}
                    className="px-5 py-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl text-xs font-bold transition-colors shadow-sm"
                  >
                    Tutup
                  </button>
                  <button 
                    onClick={() => handleSingleSendApi(selectedEmp)}
                    disabled={!selectedEmp.noWa}
                    className="px-5 py-2.5 bg-[#25D366] hover:bg-[#20BE5A] disabled:bg-slate-300 disabled:text-slate-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-lg shadow-[#25D366]/30"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Kirim via WhatsApp
                  </button>
                 </div>
               </div>
            </div>

          </div>
        </div>
      )}

      {/* Hidden Div for rendering the Slip for html2canvas */}
      {empToRender && (
        <div style={{ position: 'fixed', top: '-9999px', left: '-9999px', zIndex: -100 }}>
          <div ref={hiddenSlipRef} style={{ width: '800px', backgroundColor: '#fff', padding: '16px' }}>
            <SlipPreview employee={empToRender} month={month} year={year} />
          </div>
        </div>
      )}

      <WAConfigDialog open={waConfigOpen} onOpenChange={setWaConfigOpen} />

    </div>
  );
}
