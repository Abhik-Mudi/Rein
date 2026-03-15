import { createFileRoute } from '@tanstack/react-router'
import { generateToken, getActiveToken, storeToken } from '../../../server/tokenStore' 

export const Route = createFileRoute('/api/token/generate')({
  server: {
    handlers: {
      POST: async () => {
         // Get the real active token or make a real new one
         let token = getActiveToken();
         if (!token) {
             token = generateToken();
             storeToken(token);
         }
         return new Response(JSON.stringify({ token }), { 
             headers: { 'Content-Type': 'application/json' }
         })
      }
    }
  }
})