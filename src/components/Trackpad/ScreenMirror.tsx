"use client"

import type React from "react"
import { useRef, useEffect, useState } from "react"

interface ScreenMirrorProps {
    scrollMode: boolean
    isTracking: boolean
    handlers: React.HTMLAttributes<HTMLDivElement>
    onDataChannelReady?: (channel: RTCDataChannel) => void 
}

const TEXTS = {
    WAITING: "Waiting for screen...",
    AUTOMATIC: "Mirroring will start automatically via WebRTC",
}

export const ScreenMirror = ({ scrollMode, isTracking, handlers, onDataChannelReady }: ScreenMirrorProps) => {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [hasStream, setHasStream] = useState(false)
    const hasStartedRef = useRef(false)

    useEffect(() => {
        if (hasStartedRef.current) return
        hasStartedRef.current = true

        let offerPollInterval: NodeJS.Timeout
        let icePollInterval: NodeJS.Timeout

        const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] })

        pc.ontrack = (event) => {
            console.log("🎥 Incoming Video Stream Detected!")
            if (videoRef.current && event.streams[0]) {
                videoRef.current.srcObject = event.streams[0]
                setHasStream(true)
            }
        }

        pc.ondatachannel = (event) => {
            console.log("⚡ UDP Input Channel Connected!")
            if (onDataChannelReady) {
                onDataChannelReady(event.channel)
            }
        }

        pc.onicecandidate = async (event) => {
            if (event.candidate) {
                await fetch('/api/webrtc/candidates', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ target: 'host', candidate: event.candidate })
                })
            }
        }

        console.log("👀 Client waiting for Host Offer...")
        offerPollInterval = setInterval(async () => {
            try {
                const res = await fetch('/api/webrtc/offer')
                const data = await res.json()

                if (data.offer) {
                    clearInterval(offerPollInterval)
                    console.log("📥 Host Offer received! Signing contract...")

                    await pc.setRemoteDescription(new RTCSessionDescription(data.offer))
                    const answer = await pc.createAnswer()
                    await pc.setLocalDescription(answer)

                    await fetch('/api/webrtc/answer', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ answer: pc.localDescription })
                    })
                    console.log("📤 Client Answer dropped in the API mailbox!")

                    icePollInterval = setInterval(async () => {
                        const iceRes = await fetch('/api/webrtc/candidates?target=client')
                        const iceData = await iceRes.json()
                        
                        if (iceData.candidates && iceData.candidates.length > 0) {
                            for (const c of iceData.candidates) {
                                await pc.addIceCandidate(new RTCIceCandidate(c)).catch(e => console.error("ICE Error", e))
                            }
                            clearInterval(icePollInterval)
                            console.log("🛰️ Client ICE Connected. Video should flow!")
                        }
                    }, 1500)
                }
            } catch (e) {
                // Fails silently if server isn't ready
            }
        }, 1000)

        return () => {
            clearInterval(offerPollInterval)
            clearInterval(icePollInterval)
            pc.close()
        }
    }, [onDataChannelReady])

    return (
        <div className="absolute inset-0 flex items-center justify-center bg-black overflow-hidden select-none touch-none">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-contain transition-opacity duration-500 ${hasStream ? "opacity-100" : "opacity-0"}`}
            />
            {!hasStream && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-4">
                    <div className="loading loading-spinner loading-lg text-primary" />
                    <div className="text-center px-6">
                        <p className="font-semibold text-lg">{TEXTS.WAITING}</p>
                        <p className="text-sm opacity-60">{TEXTS.AUTOMATIC}</p>
                    </div>
                </div>
            )}
            <div
                className="absolute inset-0 z-10"
                {...handlers}
                style={{ cursor: scrollMode ? "ns-resize" : isTracking ? "none" : "default" }}
            />
        </div>
    )
}