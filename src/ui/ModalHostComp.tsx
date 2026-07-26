import { defineComponent } from '../c-mp/fun/defineComponent'
import { Slot } from '../c-mp/comp/Slot'
import { $when, Show } from '../c-mp/comp/Show'
import { For } from '../c-mp/comp/For'
import { uiState } from './state'
import { mutateState } from '../c-mp/fun/useState'
import { ProgressBarComp } from './ProgressBarComp'
import type { GameUIImpl } from './GameUIImpl'
import type { ToProgram } from '../game/events'
import { programBusSymbol } from './StartScreenComp'
import { AppearancePickerContent } from './AppearancePickerComp'
import { ControllerPickerContent } from './ControllerPickerComp'

export interface ModalHostProps {
	getGameUI: () => GameUIImpl
}

const ConfirmContent = defineComponent('ConfirmContent', (props: { get: () => unknown }, $) => {
	const gameUI = $.getContext(gameUISymbol) as GameUIImpl | undefined
	return (
		<div class='modal-backdrop'>
			<div class='modal-box'>
				<p><Slot get={() => uiState.modal?.text ?? ''} /></p>
				<div class='modal-buttons'>
					<button onclick={() => gameUI?.modalButtonClicked(uiState.modal?.id ?? 0, 'confirm')}>Yes</button>
					<button onclick={() => gameUI?.modalButtonClicked(uiState.modal?.id ?? 0, 'cancel')}>No</button>
				</div>
			</div>
		</div>
	)
})

const YesNoContent = defineComponent('YesNoContent', (_, $) => {
	const gameUI = $.getContext(gameUISymbol) as GameUIImpl | undefined
	return (
		<div class='modal-backdrop'>
			<div class='modal-box'>
				<p><Slot get={() => uiState.modal?.text ?? ''} /></p>
				<div class='modal-buttons'>
					<button onclick={() => gameUI?.modalButtonClicked(uiState.modal?.id ?? 0, 'yes')}>Yes</button>
					<button onclick={() => gameUI?.modalButtonClicked(uiState.modal?.id ?? 0, 'no')}>No</button>
				</div>
			</div>
		</div>
	)
})

const ImageContent = defineComponent('ImageContent', (_, $) => {
	const gameUI = $.getContext(gameUISymbol) as GameUIImpl | undefined
	return (
		<div class='modal-backdrop' onclick={() => gameUI?.modalButtonClicked(0, 'dismiss')}>
			<div class='modal-image'>
				<img src={() => `/assets/${uiState.modal?.assetId}`} alt='Preview' />
			</div>
		</div>
	)
})

const ProgressContent = defineComponent('ProgressContent', (_, $) => {
	const gameUI = $.getContext(gameUISymbol) as GameUIImpl | undefined
	return (
		<div class='modal-backdrop'>
			<div class='modal-box modal-progress'>
				<h3>Loading...</h3>
				<For
					debugName='progress-bars'
					each={() => uiState.modal?.type === 'progress' ? (uiState.modal.labels ?? []) : []}
					getKey={(_, i) => i}
					render={({ get, getIndex }) => (
						<ProgressBarComp
							getLabel={get}
							getValue={() => (uiState.modal?.type === 'progress' ? (uiState.modal.values?.[getIndex()] ?? 0) : 0)}
						/>
					)}
				/>
			</div>
		</div>
	)
})

const PromptContent = defineComponent('PromptContent', (_, $) => {
	const gameUI = $.getContext(gameUISymbol) as GameUIImpl | undefined
	return (
		<div class='modal-backdrop'>
			<div class='modal-box'>
				<Show it={$when(() => uiState.modal?.title, () => <h3><Slot get={() => uiState.modal?.title} /></h3>)} />
				<p><Slot get={() => uiState.modal?.text ?? ''} /></p>
				<div class='modal-buttons'>
					<button onclick={() => gameUI?.modalButtonClicked(uiState.modal?.id ?? 0, 'ok')}>OK</button>
				</div>
			</div>
		</div>
	)
})

const gameUISymbol = Symbol('gameUI')

export const ModalHostComp = defineComponent<ModalHostProps>('ModalHostComp', (props, $) => {
	$.setContext(gameUISymbol, props.getGameUI())

	return (
		<div class='modal-host'>
			<Show it={$when(() => uiState.modal?.type === 'confirm' ? uiState.modal : null, ConfirmContent)} />
			<Show it={$when(() => uiState.modal?.type === 'yesno' ? uiState.modal : null, YesNoContent)} />
			<Show it={$when(() => uiState.modal?.type === 'image' ? uiState.modal : null, ImageContent)} />
			<Show it={$when(() => uiState.modal?.type === 'progress' ? uiState.modal : null, ProgressContent)} />
			<Show it={$when(() => uiState.modal?.type === 'prompt' ? uiState.modal : null, PromptContent)} />
			<Show it={$when(() => uiState.modal?.type === 'appearance-picker' ? uiState.modal : null, AppearancePickerContent)} />
			<Show it={$when(() => uiState.modal?.type === 'controller-picker' ? uiState.modal : null, ControllerPickerContent)} />
		</div>
	)
})