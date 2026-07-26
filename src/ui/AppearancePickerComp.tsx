import { defineComponent } from '../c-mp/fun/defineComponent'
import { For } from '../c-mp/comp/For'
import { uiState } from './state'
import { mutateState } from '../c-mp/fun/useState'
import type { ToProgram } from '../game/events'
import { programBusSymbol } from './StartScreenComp'

function colorToCSS(color: number): string {
	const r = (color >> 16) & 0xff
	const g = (color >> 8) & 0xff
	const b = color & 0xff
	return `rgb(${r},${g},${b})`
}

const AppearancePickerContent = defineComponent('AppearancePickerContent', (_props, $) => {
	const programBus = $.getContext(programBusSymbol) as { push: (msg: ToProgram) => void } | undefined

	const close = () => {
		mutateState('AppearancePickerContent', 'close', () => {
			uiState.modal = null
		})
	}

	const appearances = () => uiState.modal?.type === 'appearance-picker' ? (uiState.modal.appearances ?? []) : []
	const selectedIndex = () => uiState.modal?.type === 'appearance-picker' ? (uiState.modal.selectedAppearanceIndex ?? -1) : -1
	const teamIndex = () => uiState.modal?.type === 'appearance-picker' ? (uiState.modal.teamIndex ?? 0) : 0

	return (
		<div class='modal-backdrop' onclick={close}>
			<div class='modal-box appearance-picker-box' onclick={(e: MouseEvent) => e.stopPropagation()}>
				<h3>Choose Appearance</h3>
				<div class='appearance-picker-grid'>
					<For
						debugName='appearance-picker-grid'
						each={appearances}
						getKey={(_, i) => i}
						render={({ get, getIndex }) => (
							<div
								class='appearance-cell'
								class:selected={getIndex() === selectedIndex()}
								onclick={() => {
									programBus?.push({ type: 'editTeamAppearance', id: teamIndex(), appearanceIndex: get().index })
									close()
								}}
							>
								<div class='appearance-color-swatch' style={{ backgroundColor: colorToCSS(get().color) }} />
								<span>{get().characterName}</span>
							</div>
						)}
					/>
				</div>
				<button onclick={close}>Cancel</button>
			</div>
		</div>
	)
})

export { AppearancePickerContent }