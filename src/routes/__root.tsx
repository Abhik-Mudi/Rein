import {
	HeadContent,
	Link,
	Outlet,
	Scripts,
	createRootRoute,
} from "@tanstack/react-router"
import { useEffect, useRef } from "react"
import { APP_CONFIG, THEMES } from "../config"
import "../styles.css"
import {
	ConnectionProvider,
	useConnection,
} from "../contexts/ConnectionProvider"


export const Route = createRootRoute({
	component: AppWithConnection,
	errorComponent: (props) => {
		return (
			<RootDocument>
				<div>Error: {props.error.message}</div>
			</RootDocument>
		)
	},
	notFoundComponent: () => <div>Not Found</div>,
})

function AppWithConnection() {
	return (
		<ConnectionProvider>
			<RootComponent />
		</ConnectionProvider>
	)
}

function RootComponent() {
	return (
		<RootDocument>
			<DesktopCaptureProvider />
			<Outlet />
			{/* <TanStackRouterDevtools position="bottom-right" /> */}
		</RootDocument>
	)
}

// Initiates screen sharing on the provider (desktop) device.
export function DesktopCaptureProvider() {
    const hasStartedRef = useRef(false)

    useEffect(() => {
        if (hasStartedRef.current) return

		// Detect if this is a mobile device
        const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
		
		// Check if browser supports screen sharing
        const canShare = !!navigator.mediaDevices?.getDisplayMedia

        if (!isMobile && canShare) {
            hasStartedRef.current = true

            const startWebRTC = async () => {
				// Polling intervals for answer and ICE candidates
                let pollInterval: NodeJS.Timeout;
                let icePollInterval: NodeJS.Timeout;

                try {
					// Request user permission to share screen
                    const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 60 } }, audio: false })

					// Create RTCPeerConnection with STUN server for NAT traversal
                    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })

					// Create data channel for receiving input events from consumer (phone)
                    const inputChannel = pc.createDataChannel('rein-input', { ordered: false, maxRetransmits: 0 })
					
					// Listen for input events from the remote consumer
                    inputChannel.onmessage = (event) => {
                        console.log("⚡ INCOMING WAYLAND INPUT FROM PHONE:", JSON.parse(event.data))
						// forward input to input handler
                    }

					// Send ICE candidates(possible network paths to reach the peer) to server as they are discovered
                    pc.onicecandidate = async (event) => {
                        if (event.candidate) {
                            await fetch('/api/webrtc/candidates', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ target: 'client', candidate: event.candidate })
                            })
                        }
                    }

					// Add all screen capture tracks to the peer connection
                    stream.getTracks().forEach(track => pc.addTrack(track, stream))

					// Create and send offer to consumer
                    const offer = await pc.createOffer()
                    await pc.setLocalDescription(offer)

					// Upload offer to server for consumer to retrieve
                    await fetch('/api/webrtc/offer', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ offer: pc.localDescription })
                    })
                    console.log("Host Offer dropped in the API mailbox!")

					// Poll server for consumer's answer
                    pollInterval = setInterval(async () => {
                        try {
                            const res = await fetch('/api/webrtc/answer')
                            const data = await res.json()
                            
                            if (data.answer) {
								// Answer received! Set remote description to complete handshake
                                await pc.setRemoteDescription(new RTCSessionDescription(data.answer))
                                clearInterval(pollInterval)
                                console.log("WebRTC Contract Signed! Host accepted Answer.")

								// Now poll for ICE candidates from consumer
                                icePollInterval = setInterval(async () => {
                                    const iceRes = await fetch('/api/webrtc/candidates?target=host')
                                    const iceData = await iceRes.json()
                                    if (iceData.candidates && iceData.candidates.length > 0) {
										// Add all remote ICE candidates
                                        for (const c of iceData.candidates) {
                                            await pc.addIceCandidate(new RTCIceCandidate(c)).catch(e => console.error("ICE Error", e))
                                        }
                                        clearInterval(icePollInterval)
                                        console.log("ICE Connected. Video should be flowing P2P now!")
                                    }
                                }, 1500)
                            }
                        } catch (err) { console.error("Polling error:", err) }
                    }, 1000)

                    stream.getVideoTracks()[0].onended = () => {
                        clearInterval(pollInterval)
                        clearInterval(icePollInterval)
                        pc.close()
                        hasStartedRef.current = false
                    }

                } catch (err) {
                    console.error("User denied screen share or Wayland blocked it:", err)
                    hasStartedRef.current = false
                }
            }
            startWebRTC()
        }
    }, [])

    return null
}

function ThemeInit() {
	useEffect(() => {
		if (typeof localStorage === "undefined") return
		const saved = localStorage.getItem(APP_CONFIG.THEME_STORAGE_KEY)
		const theme =
			saved === THEMES.LIGHT || saved === THEMES.DARK ? saved : THEMES.DEFAULT
		document.documentElement.setAttribute("data-theme", theme)
	}, [])
	return null
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
				<meta charSet="utf-8" />
				<meta
					name="viewport"
					content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, interactive-widget=resizes-content"
				/>
				<title>Rein Remote</title>
				<link rel="icon" type="image/svg+xml" href="/app_icon/Icon.svg" />
				<link rel="manifest" href="/manifest.json" />
			</head>
			<body className="bg-base-200 text-base-content overflow-hidden overscroll-none">
				<ThemeInit />
				<div className="flex flex-col h-[100dvh]">
					<Navbar />
					<main className="flex-1 overflow-hidden relative">{children}</main>
				</div>
				<Scripts />
			</body>
		</html>
	)
}

function LatencyBadge() {
	const { latency } = useConnection()
	if (latency === null) return null

	const color =
		latency < 50
			? "text-green-400"
			: latency < 150
				? "text-yellow-400"
				: "text-red-400"

	return (
		<div className={`flex items-center gap-1.5 px-2 ${color}`}>
			<div className="w-1.5 h-1.5 rounded-full bg-current shadow-[0_0_8px_rgba(0,0,0,0.3)]" />
			<span className="text-[11px] font-mono font-medium whitespace-nowrap">
				{latency}ms
			</span>
		</div>
	)
}

function Navbar() {
	return (
		<div className="navbar bg-base-100 border-b border-base-300 min-h-12 h-12 z-50 px-4">
			<div className="flex-1">
				<Link to="/trackpad" className="btn btn-ghost text-xl normal-case">
					<img
						src="/app_icon/IconLine.png"
						height={32}
						width={32}
						alt="Rein logo"
					/>
					Rein
				</Link>
			</div>
			<div className="flex-none flex items-center gap-2">
				<LatencyBadge />
				<Link
					to="/trackpad"
					className="btn btn-ghost btn-sm"
					activeProps={{ className: "btn-active bg-base-200" }}
				>
					Trackpad
				</Link>
				<Link
					to="/settings"
					className="btn btn-ghost btn-sm"
					activeProps={{ className: "btn-active bg-base-200" }}
				>
					Settings
				</Link>
			</div>
		</div>
	)
}
