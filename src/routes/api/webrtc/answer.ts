import { createFileRoute } from '@tanstack/react-router'

declare global {
    var webrtcSession: { offer: any; answer: any; hostCandidates: any[]; clientCandidates: any[]; };
}

export const Route = createFileRoute('/api/webrtc/answer')({
  server: {
    handlers: {
      // The client sends its answer
      POST: async ({ request }) => {
        const body = await request.json()
        globalThis.webrtcSession = globalThis.webrtcSession || { offer: null, answer: null, hostCandidates: [], clientCandidates: [] }
        globalThis.webrtcSession.answer = body.answer
        return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
      },
      // The host gets the response from the client 
      GET: async () => {
        const answer = globalThis.webrtcSession?.answer || null
        return new Response(JSON.stringify({ answer }), { headers: { 'Content-Type': 'application/json' } })
      }
    }
  }
})