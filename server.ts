import express from 'express';
import next from 'next';
import { parse } from 'url';
import { initWA, getWAStatus, logoutWA, getWAClient } from './lib/wa';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();
  server.use(express.json({ limit: '50mb' }));

  server.get('/api/wa', (req, res) => {
    res.json(getWAStatus());
  });

  server.post('/api/wa', async (req, res) => {
    await initWA(true);
    res.json({ success: true, ...getWAStatus() });
  });

  server.delete('/api/wa', async (req, res) => {
    await logoutWA();
    res.json({ success: true });
  });

  server.post('/api/wa/send', async (req, res) => {
    try {
      const { phone, message, imageBase64, pdfBase64, pdfFilename } = req.body;
      if (!phone) return res.status(400).json({ success: false, error: 'Nomor WhatsApp diperlukan' });

      const status = getWAStatus();
      if (!status.isConnected) {
        return res.status(401).json({ success: false, error: 'WhatsApp belum terkoneksi. Silakan scan QR terlebih dahulu.' });
      }

      const sock = getWAClient();
      if (!sock) return res.status(500).json({ success: false, error: 'Gagal mendapatkan client WhatsApp' });

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

      res.json({ success: true });
    } catch (e: any) {
      console.error('Error sending:', e);
      res.status(500).json({ success: false, error: e.message || 'Error occurred' });
    }
  });

  server.all(/.*/, (req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
}).catch(console.error);
