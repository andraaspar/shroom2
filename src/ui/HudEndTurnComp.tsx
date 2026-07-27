import { defineComponent } from '../c-mp/fun/defineComponent'
import type { ToProgram } from '../game/events'
import { programBusSymbol } from './StartScreenComp'
import { uiState } from './state'

const HudEndTurnComp = defineComponent('HudEndTurnComp', (_props, $) => {
	const programBus = $.getContext(programBusSymbol) as { push: (msg: ToProgram) => void } | undefined

	const text = uiState.doneButtonText || 'End Turn'

	const onClick = () => {
		programBus?.push({ type: 'endTurnRequested' })
	}

	return (
		<div class='hud-end-turn'>
			<button class='hud-end-turn-btn' onclick={onClick}>
				{text}
			</button>
		</div>
	)
})

export { HudEndTurnComp }
