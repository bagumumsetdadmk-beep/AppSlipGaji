import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import pino from 'pino';
import * as fs from 'fs';

const AUTH_DIR = '/tmp/wa-auth';

declare global {
  var globalWAClient: ReturnType<typeof makeWASocket> | null;
  var globalWAStatus: { isConnected: boolean, qr: string | null, isInitializing?: boolean, error?: string | null };
}

if (!globalThis.globalWAStatus) {
    globalThis.globalWAStatus = { isConnected: false, qr: null, isInitializing: false, error: null };
}

export const initWA = async (wait: boolean = false) => {
  // If already connected, do nothing
  if (globalThis.globalWAStatus.isConnected && globalThis.globalWAClient) {
     return;
  }

  // If already initializing, wait if requested
  if (globalThis.globalWAStatus.isInitializing) {
    if (wait) {
      let attempts = 0;
      while (globalThis.globalWAStatus.isInitializing && !globalThis.globalWAStatus.qr && attempts < 30) {
        await new Promise(r => setTimeout(r, 1000));
        attempts++;
      }
    }
    return;
  }

  globalThis.globalWAStatus.isInitializing = true;
  globalThis.globalWAStatus.qr = null;
  globalThis.globalWAStatus.error = null;
  console.log("Initializing WhatsApp Client...");

  // Ensure old client is closed
  if (globalThis.globalWAClient) {
      try {
          globalThis.globalWAClient.ev.removeAllListeners('connection.update');
          await globalThis.globalWAClient.end(undefined);
      } catch (e) {
          console.error("Error closing old client:", e);
      }
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
      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
      const { version } = await fetchLatestBaileysVersion();

      const sock = makeWASocket({
          version,
          auth: state,
          printQRInTerminal: false,
          browser: ['WhatsApp SlipGaji', 'Chrome', '114.0.0'],
          logger: pino({ level: 'silent' }),
          connectTimeoutMs: 60000,
          defaultQueryTimeoutMs: 0,
          retryRequestDelayMs: 5000,
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
              globalThis.globalWAStatus.isInitializing = false;
              
              const statusCode = (lastDisconnect?.error as any)?.output?.statusCode || (lastDisconnect?.error as any)?.payload?.statusCode;
              const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
              
              console.log(`Connection closed. Reason: ${statusCode}, Reconnect: ${shouldReconnect}`);

              if (shouldReconnect) {
                  // Only reconnect if we weren't just trying to connect
                  if (!resolved) {
                      globalThis.globalWAStatus.error = "Connection lost. Retrying...";
                  }
                  safeResolve();
                  // Avoid rapid loops: wait longer before retrying
                  setTimeout(() => initWA(), 5000);
              } else {
                 console.log("WA Logged out correctly");
                 globalThis.globalWAStatus.qr = null;
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
              globalThis.globalWAStatus.error = null;
              safeResolve();
          }
      });

      // Killswitch for initialization if it takes too long without any update
      setTimeout(() => {
        if (!resolved) {
            console.log("Initialization timeout reached");
            globalThis.globalWAStatus.isInitializing = false;
            safeResolve();
        }
      }, 30000);

    } catch (error) {
      console.error("Critical initialization error:", error);
      globalThis.globalWAStatus.isInitializing = false;
      globalThis.globalWAStatus.error = "Failed to start client";
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
