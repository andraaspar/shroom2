import { defineComponent } from '../c-mp/fun/defineComponent'
import { For } from '../c-mp/comp/For'
import { uiState } from './state'
import type { ToProgram } from '../game/events'
import { programBusSymbol } from './StartScreenComp'
import { TeamConfigItemComp } from './TeamConfigItemComp'

const TeamConfigComp = defineComponent('TeamConfigComp', (_props, $) => {
	const programBus = $.getContext(programBusSymbol) as { push: (msg: ToProgram) => void } | undefined

	const onAddTeam = () => {
		programBus?.push({ type: 'addTeamRequested' })
	}

	return (
		<div class='team-config'>
			<div class='team-config-header'>
				<h3>Teams</h3>
				<button class='team-add-btn' onclick={onAddTeam}>+ Add Team</button>
			</div>
			<div class='team-config-list'>
				<For
					debugName='team-list'
					each={() => uiState.setupTeams}
					getKey={(team) => team.id}
					render={({ get, getIndex }) => (
						<TeamConfigItemComp getTeam={get} getIndex={getIndex} />
					)}
				/>
			</div>
		</div>
	)
})

export { TeamConfigComp }