import { initWA } from './lib/wa';
console.log('starting');
initWA().then(() => console.log('initWA returned')).catch(console.error);

setTimeout(() => {
    console.log('closing process');
    process.exit(0);
}, 10000);
