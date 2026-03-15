import { createFileRoute } from '@tanstack/react-router'

declare global {
    var webrtcSession: { offer: any; answer: any; hostCandidates: any[]; clientCandidates: any[]; };
}

export const Route = createFileRoute('/api/webrtc/candidates')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json()
        globalThis.webrtcSession = globalThis.webrtcSession || { offer: null, answer: null, hostCandidates: [], clientCandidates: [] }
        if (body.target === 'client') {
            globalThis.webrtcSession.hostCandidates.push(body.candidate)
        } else {
            globalThis.webrtcSession.clientCandidates.push(body.candidate)
        }
        return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
      },
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const target = url.searchParams.get('target')
        globalThis.webrtcSession = globalThis.webrtcSession || { offer: null, answer: null, hostCandidates: [], clientCandidates: [] }
        const candidates = target === 'host' ? globalThis.webrtcSession.clientCandidates : globalThis.webrtcSession.hostCandidates
        return new Response(JSON.stringify({ candidates }), { headers: { 'Content-Type': 'application/json' } })
      }
    }
  }
})