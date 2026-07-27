import { For } from '../c-mp/comp/For'
import { defineComponent } from '../c-mp/fun/defineComponent'
import { uiState } from './state'

const HudRoundsComp = defineComponent('HudRoundsComp', (_props, $) => {
	return (
		<div class='hud-rounds'>
			<For
				debugName='hud-rounds'
				each={() => uiState.gameRounds}
				getKey={(_, i) => i}
				render={({ get, getIndex }) => {
					const round = get()
					const idx = getIndex()
					const name = (round as any).getName?.() ?? `Round ${idx}`
					const isCurrent = idx === 0
					return (
						<button
							class={'hud-round-btn' + (isCurrent ? ' hud-round-btn-current' : '')}
							disabled
						>
							{name}
						</button>
					)
				}}
			/>
		</div>
	)
})

export { HudRoundsComp }
