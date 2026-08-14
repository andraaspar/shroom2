import { Slot } from '../c-mp/comp/Slot'
import { defineComponent } from '../c-mp/fun/defineComponent'
import type { ToProgram } from '../game/events'
import { Team } from '../game/Team'
import { programBusSymbol } from './StartScreenComp'
import { uiState } from './state'

const HudEndTurnComp = defineComponent('HudEndTurnComp', (_props, $) => {
	const programBus = $.getContext(programBusSymbol) as { push: (msg: ToProgram) => void } | undefined

	const onClick = () => {
		if (uiState.controller !== Team.CONTROLLER_HUMAN) {
			// 'I AM BORED' — hurry the AI along, don't end its turn.
			programBus?.push({ type: 'humanIsBored' })
		} else {
			programBus?.push({ type: 'endTurnRequested' })
		}
	}

	return (
		<div class='hud-end-turn'>
			<button class='hud-end-turn-btn' onclick={onClick}>
				<Slot get={() => uiState.doneButtonText || 'End Turn'} />
			</button>
		</div>
	)
})

export { HudEndTurnComp }