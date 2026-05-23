import { NextRequest, NextResponse } from 'next/server';
import { getWAClient, getWAStatus } from '@/lib/wa';

export async function POST(req: NextRequest) {
  try {
    const { phone, message, imageBase64, pdfBase64, pdfFilename } = await req.json();
    if (!phone) return NextResponse.json({ success: false, error: 'Nomor WhatsApp diperlukan' }, { status: 400 });

    const status = getWAStatus();
    if (!status.isConnected) {
      return NextResponse.json({ success: false, error: 'WhatsApp belum terkoneksi. Silakan scan QR terlebih dahulu.' }, { status: 401 });
    }

    const sock = getWAClient();
    if (!sock) return NextResponse.json({ success: false, error: 'Gagal mendapatkan client WhatsApp' }, { status: 500 });

    let jid = phone.replace(/\D/g, '');
    if (jid.startsWith('0')) jid = '62' + jid.slice(1);
    if (!jid.endsWith('@s.whatsapp.net')) jid += '@s.whatsapp.net';

    if (pdfBase64) {
      const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');
      await sock.sendMessage(jid, { 
        document: buffer, 
        mimetype: 'application/pdf', 
        fileName: pdfFilename || 'Slip_Gaji.pdf', 
        caption: message || '' 
      });
    } else if (imageBase64) {
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');
      await sock.sendMessage(jid, { image: buffer, caption: message || '' });
    } else if (message) {
      await sock.sendMessage(jid, { text: message });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Error sending:', e);
    return NextResponse.json({ success: false, error: e.message || 'Error occurred' }, { status: 500 });
  }
}
