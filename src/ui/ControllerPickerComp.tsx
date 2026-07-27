import { defineComponent } from '../c-mp/fun/defineComponent'
import { For } from '../c-mp/comp/For'
import { uiState } from './state'
import { mutateState } from '../c-mp/fun/useState'
import type { ToProgram } from '../game/events'
import { programBusSymbol } from './StartScreenComp'
import { Team } from '../game/Team'

const controllerOptions = [
	{ label: 'Human', controller: Team.CONTROLLER_HUMAN, aiLevel: Team.AI_EASY },
	{ label: 'Computer Easy', controller: Team.CONTROLLER_AI, aiLevel: Team.AI_EASY },
	{ label: 'Computer Normal', controller: Team.CONTROLLER_AI, aiLevel: Team.AI_NORMAL },
	{ label: 'Computer Hard', controller: Team.CONTROLLER_AI, aiLevel: Team.AI_HARD },
]

const ControllerPickerContent = defineComponent('ControllerPickerContent', (_props, $) => {
	const programBus = $.getContext(programBusSymbol) as { push: (msg: ToProgram) => void } | undefined

	const close = () => {
		mutateState('ControllerPickerContent', 'close', () => {
			uiState.modal = null
		})
	}

	const currentController = () => uiState.modal?.type === 'controller-picker' ? (uiState.modal.currentController ?? Team.CONTROLLER_HUMAN) : Team.CONTROLLER_HUMAN
	const currentAiLevel = () => uiState.modal?.type === 'controller-picker' ? (uiState.modal.currentAiLevel ?? Team.AI_EASY) : Team.AI_EASY
	const teamIndex = () => uiState.modal?.type === 'controller-picker' ? (uiState.modal.teamIndex ?? 0) : 0

	return (
		<div class='modal-backdrop' onclick={close}>
			<div class='modal-box controller-picker-box' onclick={(e: MouseEvent) => e.stopPropagation()}>
				<h3>Choose Controller</h3>
				<div class='controller-picker-list'>
					<For
						debugName='controller-picker-list'
						each={() => controllerOptions}
						getKey={(_, i) => i}
						render={({ get }) => {
							const opt = get()
							const isSelected = opt.controller === currentController() && opt.aiLevel === currentAiLevel()
							return (
								<div
									class={'controller-option' + (isSelected ? ' selected' : '')}
									onclick={() => {
										programBus?.push({
											type: 'editTeam',
											id: teamIndex(),
											controller: opt.controller,
											aiLevel: opt.aiLevel,
										})
										close()
									}}
								>
									{opt.label}
								</div>
							)
						}}
					/>
				</div>
				<button onclick={close}>Cancel</button>
			</div>
		</div>
	)
})

export { ControllerPickerContent }