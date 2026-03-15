import { createFileRoute } from '@tanstack/react-router'
import { networkInterfaces } from 'node:os'

export const Route = createFileRoute('/api/ip')({
  server: {
    handlers: {
      // Scans the Host operating system's network interfaces
      GET: async () => {
         const nets = networkInterfaces();
         let ip = "127.0.0.1";
         for (const name of Object.keys(nets)) {
             for (const net of nets[name] || []) {
                 if (net.family === 'IPv4' && !net.internal) ip = net.address;
             }
         }
         return new Response(JSON.stringify({ ip }), { headers: { 'Content-Type': 'application/json' }})
      }
    }
  }
})