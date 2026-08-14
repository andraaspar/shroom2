import { defineComponent } from '../c-mp/fun/defineComponent'
import type { ToProgram } from '../game/events'
import { programBusSymbol } from './StartScreenComp'

const GameMenuComp = defineComponent('GameMenuComp', (_props, $) => {
	const programBus = $.getContext(programBusSymbol) as { push: (msg: ToProgram) => void } | undefined

	const onExitGame = () => {
		programBus?.push({ type: 'gameDestroyRequested' })
	}

	return (
		<div class='hud-game-menu'>
			<div class='hud-game-menu-content'>
				<button class='hud-game-menu-exit-btn' onclick={onExitGame}>
					Exit Game
				</button>
			</div>
		</div>
	)
})

export { GameMenuComp }
