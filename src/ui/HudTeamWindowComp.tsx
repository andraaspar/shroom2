import { For } from '../c-mp/comp/For'
import { defineComponent } from '../c-mp/fun/defineComponent'
import { uiState } from './state'

const HudTeamWindowComp = defineComponent('HudTeamWindowComp', (_props, $) => {
	return (
		<div class='hud-team-window' style={() => uiState.teamWindowVisible ? {} : { display: 'none' }}>
			<h3 class='hud-team-window-title'>{uiState.currentTeamName}</h3>
			<div class='hud-team-window-members'>
				<For
					debugName='hud-team-members'
					each={() => uiState.teamMembers}
					getKey={(m) => m.name}
					render={({ get }) => {
						const member = get()
						const isSelected = member.name === uiState.currentMemberName
						const healthPct = Math.max(0, Math.min(100, member.health))
						return (
							<div
								class={'hud-team-member' + (isSelected ? ' hud-team-member-selected' : '')}
							>
								<span class='hud-team-member-name'>{member.name}</span>
								<div class='hud-team-member-health-bar'>
									<div
										class='hud-team-member-health-fill'
										style={{ width: healthPct + '%' }}
									/>
								</div>
								<span class='hud-team-member-health-text'>{String(Math.round(healthPct))}</span>
							</div>
						)
					}}
				/>
			</div>
		</div>
	)
})

export { HudTeamWindowComp }
