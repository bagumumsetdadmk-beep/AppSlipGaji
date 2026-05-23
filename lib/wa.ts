import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import pino from 'pino';
import * as fs from 'fs';
import qrcode from 'qrcode';

const AUTH_DIR = '/tmp/wa-auth';

declare global {
  var globalWAClient: ReturnType<typeof makeWASocket> | null;
  var globalWAStatus: { isConnected: boolean, qr: string | null };
}

if (!globalThis.globalWAStatus) {
    globalThis.globalWAStatus = { isConnected: false, qr: null };
}

export const initWA = async () => {
  if (globalThis.globalWAStatus.isConnected && globalThis.globalWAClient) {
     return;
  }

  // Clear existing client if broken
  if (globalThis.globalWAClient) {
      try {
          await globalThis.globalWAClient.end(undefined);
      } catch (e) {}
      globalThis.globalWAClient = null;
  }

  if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  
  const { version, isLatest } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      browser: ['SIP GAJI', 'Chrome', '1.0.0'],
      logger: pino({ level: 'silent' }),
  });

  globalThis.globalWAClient = sock;

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
         try {
             console.log("QR update received");
             globalThis.globalWAStatus.qr = qr;
         } catch (e) {
             console.error("QR generating error", e);
         }
      }

      if (connection === 'close') {
          globalThis.globalWAStatus.isConnected = false;
          globalThis.globalWAStatus.qr = null;
          
          const errorOutput = (lastDisconnect?.error as any)?.output;
          const shouldReconnect = errorOutput?.statusCode !== DisconnectReason.loggedOut;
          
          if (shouldReconnect) {
              setTimeout(initWA, 2000);
          } else {
             if (fs.existsSync(AUTH_DIR)) {
                 fs.rmSync(AUTH_DIR, { recursive: true, force: true });
             }
             globalThis.globalWAClient = null;
          }
      } else if (connection === 'open') {
          globalThis.globalWAStatus.isConnected = true;
          globalThis.globalWAStatus.qr = null;
      }
  });
};

export const getWAClient = () => globalThis.globalWAClient;
export const getWAStatus = () => globalThis.globalWAStatus;
export const logoutWA = async () => {
   if (globalThis.globalWAClient) {
       try {
           await globalThis.globalWAClient.logout();
       } catch (e) {}
   }
   if (fs.existsSync(AUTH_DIR)) {
       try {
           fs.rmSync(AUTH_DIR, { recursive: true, force: true });
       } catch (e) {}
   }
   globalThis.globalWAStatus = { isConnected: false, qr: null };
   globalThis.globalWAClient = null;
}
