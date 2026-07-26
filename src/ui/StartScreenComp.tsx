import { defineComponent } from '../c-mp/fun/defineComponent'
import { mutateState } from '../c-mp/fun/useState'
import { uiState } from './state'
import type { ToProgram } from '../game/events'

export const programBusSymbol = Symbol('programBus')

const StartScreenComp = defineComponent('StartScreenComp', (_props, $) => {
	const programBus = $.getContext(programBusSymbol) as { push: (msg: ToProgram) => void } | undefined

	const onQuickGame = () => {
		programBus?.push({ type: 'gameStartRequested' })
	}

	const onConfigure = () => {
		mutateState('StartScreenComp', 'onConfigure', () => {
			uiState.screen = 'setup'
		})
	}

	return (
		<div class='start-screen'>
			<div class='start-screen-content'>
				<h1 class='start-screen-title'>Shroom</h1>
				<p class='start-screen-subtitle'>Artillery Game</p>

				<button class='start-screen-btn start-screen-btn-primary' onclick={onQuickGame}>
					Quick Game
				</button>

				<button class='start-screen-btn' onclick={onConfigure}>
					Configure & Start
				</button>

				<a class='start-screen-link' onclick={() => window.open('help.html', '_blank')}>
					Help
				</a>

				<p class='start-screen-credits'>
					Ported from AS3 by ... | Uses c-mp framework
				</p>
			</div>
		</div>
	)
})

export { StartScreenComp }