import { createFileRoute } from '@tanstack/react-router'
import fs from 'node:fs'

export const Route = createFileRoute('/api/config')({
  server: {
    handlers: {
      // Receives updated configuration settings from the React client.
      POST: async ({ request }) => {
        try {
          const config = await request.json()
          
          // Validate the payload
          if (!config || typeof config !== "object" || Array.isArray(config)) {
            return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400 })
          }

          // Read existing config or default to empty object
          const configPath = "./src/server-config.json"
          const current = fs.existsSync(configPath)
              ? JSON.parse(fs.readFileSync(configPath, "utf-8"))
              : {}
          
          // Merge and save
          const newConfig = { ...current, ...config }
          fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2))

          return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
          })
        } catch (e) {
          return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
        }
      }
    }
  }
})