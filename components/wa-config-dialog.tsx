"use client"

import { useState, useEffect } from "react"
import { Loader2, QrCode, LogOut, CheckCircle2, X } from "lucide-react"
import QRCode from "react-qr-code"

interface WAConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WAConfigDialog({ open, onOpenChange }: WAConfigDialogProps) {
  const [status, setStatus] = useState<{ isConnected: boolean; qr: string | null; isInitializing?: boolean; error?: string | null }>({
    isConnected: false,
    qr: null,
  })
  const [loading, setLoading] = useState(false)

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/wa")
      if (!res.ok) throw new Error("Server error");
      const data = await res.json()
      setStatus(data)
    } catch (error) {
      console.error("Gagal mengambil status WA:", error)
    }
  }

  const connectWA = async () => {
    if (loading || status.isInitializing) return;
    setLoading(true)
    try {
      const res = await fetch("/api/wa", { method: "POST" })
      if (!res.ok) throw new Error("Gagal memulai koneksi");
      const data = await res.json()
      setStatus(data)
    } catch (error) {
      console.error("Gagal inisialisasi WA:", error)
    } finally {
      setLoading(false)
    }
  }

  const resetWA = async () => {
    setLoading(true)
    try {
      await fetch("/api/wa", { method: "DELETE" })
      await fetchStatus()
    } catch (error) {
      console.error("Gagal reset WA:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      fetchStatus()
      const interval = setInterval(fetchStatus, 3000)
      return () => clearInterval(interval)
    }
  }, [open])

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex justify-between items-start mb-2">
            <h2 className="text-xl font-bold text-slate-900">Koneksi WhatsApp</h2>
            <button 
              onClick={() => onOpenChange(false)}
              className="text-slate-400 hover:text-slate-500 hover:bg-slate-100 p-1 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-slate-500 mb-6">
            Hubungkan WhatsApp untuk mengirim slip gaji langsung ke pegawai tanpa membuka tab baru.<br /><br />
            <strong>Peringatan!</strong> Mohon bersabar saat menyiapkan QR code. Gunakan browser yang stabil.
          </p>

        <div className="flex flex-col items-center justify-center py-6">
          {status.error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 w-full text-center">
              {status.error}
            </div>
          )}

          {status.isConnected ? (
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-slate-900">WhatsApp Terhubung</h3>
                <p className="text-sm text-slate-500 max-w-xs mt-1">
                  Aplikasi siap digunakan untuk mengirim pesan slip gaji
                </p>
              </div>
              <button onClick={resetWA} disabled={loading} className="mt-4 px-4 py-2 border border-slate-200 rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 text-sm font-semibold transition-colors flex items-center">
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogOut className="h-4 w-4 mr-2" />}
                Putuskan Koneksi
              </button>
            </div>
          ) : status.qr ? (
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="p-2 border rounded-xl bg-white shadow-sm overflow-hidden">
                <QRCode value={status.qr} size={224} />
              </div>
              <p className="text-sm text-slate-500 max-w-xs">
                Buka WhatsApp di HP Anda, buka menu Perangkat Taut, dan scan QR Code ini.
              </p>
              <div className="flex gap-2">
                <button onClick={connectWA} disabled={loading || status.isInitializing} className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 text-sm font-semibold transition-colors flex items-center">
                   {loading || status.isInitializing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <QrCode className="h-4 w-4 mr-2" />}
                   Muat Ulang QR
                </button>
                <button onClick={resetWA} disabled={loading} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 text-sm font-semibold transition-colors">
                   Reset
                </button>
              </div>
            </div>
          ) : status.isInitializing ? (
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center animate-pulse">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-slate-900">Menyiapkan QR Code...</h3>
                <p className="text-sm text-slate-500 max-w-xs mt-1">
                  Sistem sedang menginisialisasi modul WhatsApp. Mohon tunggu sebentar.
                </p>
              </div>
              <button onClick={resetWA} disabled={loading} className="mt-2 text-xs text-slate-400 hover:text-slate-600 underline">
                Batal & Reset
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="h-16 w-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center">
                <QrCode className="h-8 w-8" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-slate-900">Belum Terhubung</h3>
                <p className="text-sm text-slate-500 max-w-xs mt-1">
                  Klik tombol di bawah untuk menampilkan QR Code
                </p>
              </div>
              <button 
                onClick={connectWA} 
                disabled={loading || status.isInitializing} 
                className="mt-4 px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 text-sm font-bold shadow-lg shadow-slate-200 transition-all active:scale-95 flex items-center disabled:opacity-50"
              >
                {loading || status.isInitializing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <QrCode className="h-4 w-4 mr-2" />}
                Tampilkan QR Code
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
)
}
