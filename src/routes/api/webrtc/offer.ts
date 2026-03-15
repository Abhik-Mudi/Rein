import { createFileRoute } from '@tanstack/react-router'

declare global {
    var webrtcSession: {
        offer: any;
        answer: any;
        hostCandidates: any[];
        clientCandidates: any[];
    };
}
globalThis.webrtcSession = globalThis.webrtcSession || { offer: null, answer: null, hostCandidates: [], clientCandidates: [] };

export const Route = createFileRoute('/api/webrtc/offer')({
  server: {
    handlers: {
      // The host(PC) uploads its WebRTC capabilities
      POST: async ({ request }) => {
        const body = await request.json()
        globalThis.webrtcSession.offer = body.offer
        globalThis.webrtcSession.answer = null 
        globalThis.webrtcSession.hostCandidates = []
        globalThis.webrtcSession.clientCandidates = []
        return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
      },
      // The client(Phone) downloads the Host's offer
      GET: async () => {
        return new Response(JSON.stringify({ offer: globalThis.webrtcSession.offer }), { headers: { 'Content-Type': 'application/json' } })
      }
    }
  }
})