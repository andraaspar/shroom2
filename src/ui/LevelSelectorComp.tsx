import { defineComponent } from '../c-mp/fun/defineComponent'
import { Slot } from '../c-mp/comp/Slot'
import { uiState } from './state'
import type { ToProgram } from '../game/events'
import { programBusSymbol } from './StartScreenComp'

const LevelSelectorComp = defineComponent('LevelSelectorComp', (_props, $) => {
	const programBus = $.getContext(programBusSymbol) as { push: (msg: ToProgram) => void } | undefined

	const onGenerate = () => {
		programBus?.push({ type: 'newRandomLevelRequested' })
	}

	return (
		<div class='level-selector'>
			<h3>Level</h3>
			<div class='level-preview' />
			<div class='level-list'>
				<div class='level-item level-item-selected'>
					<Slot get={() => uiState.setupLevelName} />
				</div>
			</div>
			<button class='level-generate-btn' onclick={onGenerate}>Generate New</button>
		</div>
	)
})

export { LevelSelectorComp }