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

export const initWA = async (wait: boolean = false) => {
  if (globalThis.globalWAStatus.isInitializing) {
    if (wait) {
      // Wait for initialization to finish or QR to appear
      let attempts = 0;
      while (globalThis.globalWAStatus.isInitializing && !globalThis.globalWAStatus.qr && attempts < 20) {
        await new Promise(r => setTimeout(r, 500));
        attempts++;
      }
    }
    return;
  }

  if (globalThis.globalWAStatus.isConnected && globalThis.globalWAClient) {
     return;
  }

  globalThis.globalWAStatus.isInitializing = true;
  globalThis.globalWAStatus.qr = null;
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

  return new Promise<void>(async (resolve) => {
    let resolved = false;
    const safeResolve = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };

    try {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
      const { version } = await fetchLatestBaileysVersion();

      const sock = makeWASocket({
          version,
          auth: state,
          printQRInTerminal: false,
          browser: ['WhatsApp SlipGaji', 'Chrome', '1.0.0'],
          logger: pino({ level: 'silent' }),
          connectTimeoutMs: 60000,
          defaultQueryTimeoutMs: 0,
          keepAliveIntervalMs: 10000,
      });

      globalThis.globalWAClient = sock;

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('connection.update', async (update) => {
          const { connection, lastDisconnect, qr } = update;
          
          if (qr) {
             console.log("QR update received");
             globalThis.globalWAStatus.qr = qr;
             globalThis.globalWAStatus.isInitializing = false;
             safeResolve();
          }

          if (connection === 'close') {
              globalThis.globalWAStatus.isConnected = false;
              
              const errorOutput = (lastDisconnect?.error as any)?.output;
              const statusCode = errorOutput?.statusCode || (lastDisconnect?.error as any)?.payload?.statusCode;
              const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
              
              if (shouldReconnect) {
                  console.log("WA Connection closed, reconnecting...");
                  globalThis.globalWAStatus.isInitializing = false;
                  safeResolve();
                  setTimeout(() => initWA(), 3000);
              } else {
                 console.log("WA Logged out");
                 globalThis.globalWAStatus.qr = null;
                 globalThis.globalWAStatus.isInitializing = false;
                 if (fs.existsSync(AUTH_DIR)) {
                     fs.rmSync(AUTH_DIR, { recursive: true, force: true });
                 }
                 globalThis.globalWAClient = null;
                 safeResolve();
              }
          } else if (connection === 'open') {
              console.log("WA Connected successfully");
              globalThis.globalWAStatus.isConnected = true;
              globalThis.globalWAStatus.qr = null;
              globalThis.globalWAStatus.isInitializing = false;
              safeResolve();
          }
      });

      // Timeout for initial connection setup
      setTimeout(safeResolve, 15000);

    } catch (error) {
      console.error("Gagal inisialisasi WA:", error);
      globalThis.globalWAStatus.isInitializing = false;
      safeResolve();
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
   globalThis.globalWAStatus = { isConnected: false, qr: null, isInitializing: false };
   globalThis.globalWAClient = null;
}
