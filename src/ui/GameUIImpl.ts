import type { GameUI, ProgressHandle } from '../game/GameUI'
import { mutateState } from '../c-mp/fun/useState'
import { uiState, type ModalConfig } from './state'

export class GameUIImpl implements GameUI {
	private confirmCallback: (() => void) | null = null
	private cancelCallback: (() => void) | null = null
	private yesCallback: (() => void) | null = null
	private noCallback: (() => void) | null = null
	private promptCallback: (() => void) | null = null
	private progressIdCounter = 0

	showStartWindow(): void {
		mutateState('GameUIImpl', 'showStartWindow', () => {
			uiState.screen = 'start'
			uiState.showCanvas = false
		})
	}

	removeAllWindows(): void {
		mutateState('GameUIImpl', 'removeAllWindows', () => {
			uiState.teamWindowVisible = false
			uiState.bounceWindowVisible = false
			uiState.teamQueueVisible = false
			uiState.modal = null
			uiState.progressHandle = null
		})
	}

	showWorldWindow(): void {
		mutateState('GameUIImpl', 'showWorldWindow', () => {
			uiState.screen = 'game'
			uiState.showCanvas = true
			uiState.setupInitialized = false
		})
	}

	showTeamWindow(): void {
		mutateState('GameUIImpl', 'showTeamWindow', () => {
			uiState.teamWindowVisible = true
		})
	}

	removeTeamWindow(): void {
		mutateState('GameUIImpl', 'removeTeamWindow', () => {
			uiState.teamWindowVisible = false
		})
	}

	showBounceWindow(): void {
		mutateState('GameUIImpl', 'showBounceWindow', () => {
			uiState.bounceWindowVisible = true
		})
	}

	removeBounceWindow(): void {
		mutateState('GameUIImpl', 'removeBounceWindow', () => {
			uiState.bounceWindowVisible = false
		})
	}

	showTeamQueueWindow(): void {
		mutateState('GameUIImpl', 'showTeamQueueWindow', () => {
			uiState.teamQueueVisible = true
		})
	}

	showProgressWindow(labels: string[]): ProgressHandle {
		const id = ++this.progressIdCounter
		const values = labels.map(() => 0)
		mutateState('GameUIImpl', 'showProgressWindow', () => {
			uiState.modal = {
				id,
				type: 'progress',
				labels,
				values,
			}
			uiState.progressHandle = { id }
		})
		return {
			setProgress: (index: number, value: number) => {
				mutateState('GameUIImpl', 'setProgress', () => {
					if (uiState.modal?.type === 'progress' && uiState.progressHandle?.id === id && uiState.modal.values) {
						uiState.modal.values[index] = Math.max(0, Math.min(1, value))
					}
				})
			},
		}
	}

	removeProgressWindow(_handle: ProgressHandle): void {
		mutateState('GameUIImpl', 'removeProgressWindow', () => {
			uiState.modal = null
			uiState.progressHandle = null
		})
	}

	prompt(text: string): void {
		const id = ++this.progressIdCounter
		this.promptCallback = () => {}
		mutateState('GameUIImpl', 'prompt', () => {
			uiState.modal = { id, type: 'prompt', text, title: 'Prompt' }
		})
	}

	log(...args: unknown[]): void {
		console.log(...args)
	}

	showConfirm(action: string, onConfirm: () => void, onCancel?: () => void): void {
		const id = ++this.progressIdCounter
		this.confirmCallback = onConfirm
		this.cancelCallback = onCancel ?? null
		mutateState('GameUIImpl', 'showConfirm', () => {
			uiState.modal = { id, type: 'confirm', action, text: `Are you sure you want to ${action}?` }
		})
	}

	showYesNo(question: string, onYes: () => void, onNo?: () => void): void {
		const id = ++this.progressIdCounter
		this.yesCallback = onYes
		this.noCallback = onNo ?? null
		mutateState('GameUIImpl', 'showYesNo', () => {
			uiState.modal = { id, type: 'yesno', text: question }
		})
	}

	modalButtonClicked(_id: number, button: 'confirm' | 'cancel' | 'yes' | 'no' | 'ok' | 'dismiss'): void {
		if (button === 'confirm') {
			this.confirmCallback?.()
		} else if (button === 'cancel') {
			this.cancelCallback?.()
		} else if (button === 'yes') {
			this.yesCallback?.()
		} else if (button === 'no') {
			this.noCallback?.()
		} else if (button === 'ok' || button === 'dismiss') {
			this.promptCallback?.()
		}
		this.confirmCallback = null
		this.cancelCallback = null
		this.yesCallback = null
		this.noCallback = null
		this.promptCallback = null
		mutateState('GameUIImpl', 'modalButtonClicked', () => {
			uiState.modal = null
		})
	}
}