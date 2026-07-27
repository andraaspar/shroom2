import { For } from '../c-mp/comp/For'
import { Slot } from '../c-mp/comp/Slot'
import { defineComponent } from '../c-mp/fun/defineComponent'
import { uiState } from './state'

const HudTeamWindowComp = defineComponent('HudTeamWindowComp', (_props, $) => {
	return (
		<div class='hud-team-window' style={() => uiState.teamWindowVisible ? {} : { display: 'none' }}>
			<h3 class='hud-team-window-title'><Slot get={() => uiState.currentTeamName} /></h3>
			<div class='hud-team-window-members'>
				<For
					debugName='hud-team-members'
					each={() => uiState.teamMembers}
					getKey={(m) => m.name}
					render={({ get }) => (
						<div
							class={() => {
								const member = get()
								return 'hud-team-member' + (member.name === uiState.currentMemberName ? ' hud-team-member-selected' : '')
							}}
						>
							<span class='hud-team-member-name'><Slot get={() => get().name} /></span>
							<div class='hud-team-member-health-bar'>
								<div
									class='hud-team-member-health-fill'
									style={() => {
										const member = get()
										return { width: Math.max(0, Math.min(100, member.health)) + '%' }
									}}
								/>
							</div>
							<span class='hud-team-member-health-text'><Slot get={() => String(Math.round(Math.max(0, Math.min(100, get().health))))} /></span>
						</div>
					)}
				/>
			</div>
		</div>
	)
})

export { HudTeamWindowComp }