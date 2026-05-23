import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import pino from 'pino';
import * as fs from 'fs';

const AUTH_DIR = '/tmp/wa-auth';

declare global {
  var globalWAClient: ReturnType<typeof makeWASocket> | null;
  var globalWAStatus: { isConnected: boolean, qr: string | null, isInitializing?: boolean };
}

if (!globalThis.globalWAStatus) {
    globalThis.globalWAStatus = { isConnected: false, qr: null, isInitializing: false };
}

export const initWA = async () => {
  if (globalThis.globalWAStatus.isInitializing) return;
  if (globalThis.globalWAStatus.isConnected && globalThis.globalWAClient) {
     return;
  }

  globalThis.globalWAStatus.isInitializing = true;
  console.log("Initializing WhatsApp Client...");

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

  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

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
           console.log("QR update received");
           globalThis.globalWAStatus.qr = qr;
           globalThis.globalWAStatus.isInitializing = false;
        }

        if (connection === 'close') {
            globalThis.globalWAStatus.isConnected = false;
            
            const errorOutput = (lastDisconnect?.error as any)?.output;
            const statusCode = errorOutput?.statusCode || (lastDisconnect?.error as any)?.payload?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            
            if (shouldReconnect) {
                console.log("WA Connection closed, reconnecting...");
                globalThis.globalWAStatus.isInitializing = false;
                setTimeout(initWA, 3000);
            } else {
               console.log("WA Logged out");
               globalThis.globalWAStatus.qr = null;
               globalThis.globalWAStatus.isInitializing = false;
               if (fs.existsSync(AUTH_DIR)) {
                   fs.rmSync(AUTH_DIR, { recursive: true, force: true });
               }
               globalThis.globalWAClient = null;
            }
        } else if (connection === 'open') {
            console.log("WA Connected successfully");
            globalThis.globalWAStatus.isConnected = true;
            globalThis.globalWAStatus.qr = null;
            globalThis.globalWAStatus.isInitializing = false;
        }
    });
  } catch (error) {
    console.error("Gagal inisialisasi WA:", error);
    globalThis.globalWAStatus.isInitializing = false;
  }
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
   globalThis.globalWAStatus = { isConnected: false, qr: null, isInitializing: false };
   globalThis.globalWAClient = null;
}
