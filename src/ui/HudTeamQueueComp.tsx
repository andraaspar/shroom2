import { For } from '../c-mp/comp/For'
import { defineComponent } from '../c-mp/fun/defineComponent'
import { uiState } from './state'

const HudTeamQueueComp = defineComponent('HudTeamQueueComp', (_props, $) => {
	return (
		<div class='hud-team-queue'>
			<For
				debugName='hud-team-queue'
				each={() => uiState.teamQueue}
				getKey={(team) => team.name}
				render={({ get }) => {
					const team = get()
					const isCurrent = team.name === uiState.currentTeamName
					const color = team.characterAppearance?.color ?? 0x999999
					const hexColor = '#' + color.toString(16).padStart(6, '0')
					return (
						<button
							class={'hud-team-queue-btn' + (isCurrent ? ' hud-team-queue-btn-current' : '')}
							disabled
						>
							<span class='hud-team-queue-indicator' style={{ backgroundColor: hexColor }} />
							<span class='hud-team-queue-name'>{team.name}</span>
						</button>
					)
				}}
			/>
		</div>
	)
})

export { HudTeamQueueComp }
