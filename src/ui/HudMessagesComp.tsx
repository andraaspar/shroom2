import { defineComponent } from '../c-mp/fun/defineComponent'
import { useEffect } from '../c-mp/fun/useEffect'
import { mutateState } from '../c-mp/fun/useState'
import { uiState } from './state'

const HudMessagesComp = defineComponent('HudMessagesComp', (_props, $) => {
	const text = uiState.messageBox.text
	const remaining = uiState.messageBox.remaining

	useEffect('message auto-clear:' + text, () => {
		if (!text) return

		const duration = uiState.messageBox.time

		// Persistent messages (time < 0) should never auto-clear
		if (duration < 0) return

		const startTime = performance.now()

		const interval = setInterval(() => {
			const elapsed = performance.now() - startTime
			const newRemaining = Math.max(0, duration - elapsed)
			mutateState('HudMessagesComp', 'update remaining', () => {
				uiState.messageBox.remaining = newRemaining
			})
			if (newRemaining <= 0) {
				clearInterval(interval)
				mutateState('HudMessagesComp', 'clear message', () => {
					uiState.messageBox = { text: '', time: 0, remaining: 0 }
				})
			}
		}, 50)

		return () => clearInterval(interval)
	})

	const isPersistent = uiState.messageBox.time < 0
	const fadeOut = !isPersistent && remaining < 500
	const opacityVal = fadeOut ? remaining / 500 : 1

	return (
		<div class='hud-messages' style={{ opacity: String(opacityVal), display: text ? undefined : 'none' }}>			
<span class='hud-messages-text'>{text}</span>
		</div>
	)
})

export { HudMessagesComp }
