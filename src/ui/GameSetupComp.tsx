import { defineComponent } from '../c-mp/fun/defineComponent'
import { uiState } from './state'
import type { ToProgram } from '../game/events'
import { programBusSymbol } from './StartScreenComp'
import { LevelSelectorComp } from './LevelSelectorComp'
import { TeamConfigComp } from './TeamConfigComp'
import { RoundWeightConfigComp } from './RoundWeightConfigComp'

const GameSetupComp = defineComponent('GameSetupComp', (_props, $) => {
	const programBus = $.getContext(programBusSymbol) as { push: (msg: ToProgram) => void } | undefined

	const onStartGame = () => {
		programBus?.push({ type: 'gameStartRequested' })
	}

	return (
		<div class='setup-screen'>
			<div class='setup-panels'>
				<div class='setup-panel setup-panel-left'>
					<LevelSelectorComp />
				</div>
				<div class='setup-panel setup-panel-center'>
					<TeamConfigComp />
				</div>
				<div class='setup-panel setup-panel-right'>
					<RoundWeightConfigComp />
				</div>
			</div>
			<div class='setup-footer'>
				<button class='setup-start-btn' onclick={onStartGame}>Start Game</button>
			</div>
		</div>
	)
})

export { GameSetupComp }