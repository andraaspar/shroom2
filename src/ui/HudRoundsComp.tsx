import { For } from '../c-mp/comp/For'
import { Slot } from '../c-mp/comp/Slot'
import { defineComponent } from '../c-mp/fun/defineComponent'
import { uiState } from './state'

const HudRoundsComp = defineComponent('HudRoundsComp', (_props, $) => {
	return (
		<div class='hud-rounds'>
			<For
				debugName='hud-rounds'
				each={() => uiState.gameRounds}
				getKey={(_, i) => i}
				render={({ get, getIndex }) => (
					<button
						class={() => {
							const idx = getIndex()
							return 'hud-round-btn' + (idx === 0 ? ' hud-round-btn-current' : '')
						}}
						disabled
					>
						<Slot get={() => {
							const round = get()
							const idx = getIndex()
							return (round as any).getName?.() ?? `Round ${idx}`
						}} />
					</button>
				)}
			/>
		</div>
	)
})

export { HudRoundsComp }