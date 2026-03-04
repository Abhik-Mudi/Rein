"use client"
import type { ModifierState } from "@/types"
import type React from "react"
import {
	MousePointer2,
	Mouse,
	Copy,
	ClipboardPaste,
	Keyboard,
	X,
} from "lucide-react"
import { useConnection } from "../../contexts/ConnectionProvider"

interface ControlBarProps {
	scrollMode: boolean
	modifier: ModifierState
	buffer: string
	onToggleScroll: () => void
	onCopy: () => void
	onPaste: () => void
	onLeftClick: () => void
	onRightClick: () => void
	onKeyboardToggle: () => void
	onModifierToggle: () => void
	keyboardOpen: boolean
	extraKeysVisible: boolean
	onExtraKeysToggle: () => void
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
		<div className={`flex items-center justify-center px-2 h-[44px] ${color}`}>
			<span className="text-[10px] font-mono whitespace-nowrap opacity-80">
				{latency}ms
			</span>
		</div>
	)
}

export const ControlBar: React.FC<ControlBarProps> = ({
	scrollMode,
	modifier,
	onToggleScroll,
	onLeftClick,
	onRightClick,
	onCopy,
	onPaste,
	onKeyboardToggle,
	onModifierToggle,
	buffer,
}) => {
	const handleInteraction = (e: React.PointerEvent, action: () => void) => {
		e.preventDefault()
		action()
	}

	const getModifierLabel = () => {
		switch (modifier) {
			case "Active":
				return buffer.length > 0 ? "Press" : "Release"
			case "Hold":
				return "Release"
			case "Release":
				return "Hold"
		}
	}

	const baseButton =
		"flex-1 flex items-center justify-center h-[44px] bg-base-100 hover:bg-base-300 active:scale-[0.97] transition-all duration-100"

	const ModifierButton = () => {
		const isHold = modifier === "Hold"
		const label = getModifierLabel()

		return (
			<button
				type="button"
				className={`flex items-center justify-center w-[54px] h-[44px] transition-all duration-100 ${
					isHold
						? "bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-800"
						: "bg-base-100 hover:bg-base-300"
				}`}
				onPointerDown={(e) => handleInteraction(e, onModifierToggle)}
			>
				{label === "Release" ? (
					<X size={26} strokeWidth={3.5} className="text-red-600" />
				) : (
					<span className="text-xs font-bold">{label}</span>
				)}
			</button>
		)
	}

	return (
		<div className="flex w-full bg-base-200 border-b border-base-300 pr-1">
			<LatencyBadge />

			<button
				type="button"
				className={`${baseButton} ${scrollMode ? "text-primary" : ""}`}
				onPointerDown={(e) => handleInteraction(e, onToggleScroll)}
			>
				<MousePointer2 size={20} />
			</button>

			<button
				type="button"
				className={baseButton}
				onPointerDown={(e) => handleInteraction(e, onLeftClick)}
			>
				<Mouse size={18} />
			</button>

			<button
				type="button"
				className={baseButton}
				onPointerDown={(e) => handleInteraction(e, onRightClick)}
			>
				<Mouse size={18} className="rotate-180" />
			</button>

			<button
				type="button"
				className={baseButton}
				onPointerDown={(e) => handleInteraction(e, onCopy)}
				aria-label="Copy"
			>
				<Copy size={18} />
			</button>

			<button
				type="button"
				className={baseButton}
				onPointerDown={(e) => handleInteraction(e, onPaste)}
				aria-label="Paste"
			>
				<ClipboardPaste size={18} />
			</button>

			<button
				type="button"
				className={baseButton}
				onPointerDown={(e) => handleInteraction(e, onKeyboardToggle)}
			>
				<Keyboard size={20} />
			</button>

			<ModifierButton />
		</div>
	)
}
