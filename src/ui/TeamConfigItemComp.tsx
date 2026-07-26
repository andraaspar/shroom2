import { defineComponent } from '../c-mp/fun/defineComponent'
import { uiState } from './state'
import { mutateState } from '../c-mp/fun/useState'
import type { ToProgram } from '../game/events'
import { programBusSymbol } from './StartScreenComp'
import { Team } from '../game/Team'

export interface TeamConfigItemCompProps {
	getTeam: () => { id: number; name: string; memberCount: number; controller: number; aiLevel: number; appearanceName: string; appearanceColor: number }
	getIndex: () => number
}

const TeamConfigItemComp = defineComponent<TeamConfigItemCompProps>('TeamConfigItemComp', (props, $) => {
	const programBus = $.getContext(programBusSymbol) as { push: (msg: ToProgram) => void } | undefined

	const isEdited = () => props.getIndex() === uiState.setupEditedTeamIndex

	const onNameChange = (e: Event) => {
		const input = e.target as HTMLInputElement
		programBus?.push({ type: 'editTeam', id: props.getIndex(), name: input.value })
	}

	const onMemberDec = () => {
		const current = uiState.setupMembersPerTeam
		programBus?.push({ type: 'membersPerTeam', value: Math.max(1, current - 1) })
	}

	const onMemberInc = () => {
		const current = uiState.setupMembersPerTeam
		programBus?.push({ type: 'membersPerTeam', value: Math.min(99, current + 1) })
	}

	const team = () => props.getTeam()
	const controllerLabel = () => Team.controllerNames[team().controller === Team.CONTROLLER_HUMAN ? 0 : team().aiLevel + 1]

	const onAppearancePicker = () => {
		const currentTeam = team()
		const currentAppearanceIndex = uiState.setupAvailableAppearances.findIndex(
			(a) => a.characterName === currentTeam.appearanceName && a.color === currentTeam.appearanceColor
		)
		const appearances = uiState.setupAvailableAppearances.filter((a) => {
			const isAssigned = uiState.setupTeams.some(
				(t) => t.appearanceName === a.characterName && t.appearanceColor === a.color
			)
			return !isAssigned || (currentTeam.appearanceName === a.characterName && currentTeam.appearanceColor === a.color)
		})
		mutateState('TeamConfigItemComp', 'onAppearancePicker', () => {
			uiState.modal = {
				id: 0,
				type: 'appearance-picker',
				teamIndex: props.getIndex(),
				appearances: appearances.map((a) => ({ ...a, isAssigned: false })),
				selectedAppearanceIndex: currentAppearanceIndex >= 0 ? currentAppearanceIndex : -1,
			}
		})
	}

	const onControllerPicker = () => {
		const currentTeam = team()
		mutateState('TeamConfigItemComp', 'onControllerPicker', () => {
			uiState.modal = {
				id: 0,
				type: 'controller-picker',
				teamIndex: props.getIndex(),
				currentController: currentTeam.controller,
				currentAiLevel: currentTeam.aiLevel,
			}
		})
	}

	const onRemove = () => {
		programBus?.push({ type: 'removeTeamRequested' })
		programBus?.push({ type: 'editTeam', id: 0 })
	}

	return (
		<div class='team-item' class:team-item-selected={isEdited}>
			<input class='team-name-input' value={team().name} oninput={onNameChange} />
			<div class='team-member-count'>
				<button onclick={onMemberDec}>-</button>
				<span>{String(uiState.setupMembersPerTeam)}</span>
				<button onclick={onMemberInc}>+</button>
			</div>
			<a class='team-appearance-link' onclick={onAppearancePicker}>
				{team().appearanceName}
			</a>
			<a class='team-controller-link' onclick={onControllerPicker}>
				{controllerLabel()}
			</a>
			<button class='team-remove-btn' onclick={onRemove}>×</button>
		</div>
	)
})

export { TeamConfigItemComp }