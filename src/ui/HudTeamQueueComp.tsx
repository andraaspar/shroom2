import { For } from '../c-mp/comp/For'
import { Slot } from '../c-mp/comp/Slot'
import { defineComponent } from '../c-mp/fun/defineComponent'
import { uiState } from './state'

const HudTeamQueueComp = defineComponent('HudTeamQueueComp', (_props, $) => {
	return (
		<div class='hud-team-queue'>
			<For
				debugName='hud-team-queue'
				each={() => uiState.teamQueue}
				getKey={(team) => team.name}
				render={({ get }) => (
					<button
						class={() => {
							const team = get()
							return 'hud-team-queue-btn' + (team.name === uiState.currentTeamName ? ' hud-team-queue-btn-current' : '')
						}}
						disabled
					>
						<span
							class='hud-team-queue-indicator'
							style={() => {
								const team = get()
								const color = team.characterAppearance?.color ?? 0x999999
								return { backgroundColor: '#' + color.toString(16).padStart(6, '0') }
							}}
						/>
						<span class='hud-team-queue-name'><Slot get={() => get().name} /></span>
					</button>
				)}
			/>
		</div>
	)
})

export { HudTeamQueueComp }