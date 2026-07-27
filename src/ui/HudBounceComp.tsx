import { Slot } from '../c-mp/comp/Slot'
import { defineComponent } from '../c-mp/fun/defineComponent'
import type { ToProgram } from '../game/events'
import { programBusSymbol } from './StartScreenComp'
import { uiState } from './state'

const HudBounceComp = defineComponent('HudBounceComp', (_props, $) => {
	const programBus = $.getContext(programBusSymbol) as { push: (msg: ToProgram) => void } | undefined

	const onBounceChange = (value: number) => {
		programBus?.push({ type: 'newBounceCount', value })
	}

	return (
		<div class='hud-bounce' style={() => uiState.bounceWindowVisible ? {} : { display: 'none' }}>
			<button class='hud-bounce-btn' onclick={() => onBounceChange(uiState.bounceCount - 1)}>
				-1
			</button>
			<span class='hud-bounce-value'>
				<Slot get={() => String(uiState.bounceCount)} />
			</span>
			<button class='hud-bounce-btn' onclick={() => onBounceChange(uiState.bounceCount + 1)}>
				+1
			</button>
			<button class='hud-bounce-btn' onclick={() => onBounceChange(0)}>
				0
			</button>
		</div>
	)
})

export { HudBounceComp }