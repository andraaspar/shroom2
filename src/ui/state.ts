import { useState } from '../c-mp/fun/useState'
import type { UIState } from '../game/events'
import type { Team } from '../game/Team'
import type { TeamMember } from '../game/TeamMember'

export interface ModalConfig {
	id: number
	type: 'confirm' | 'yesno' | 'image' | 'progress' | 'prompt'
	text?: string
	action?: string
	assetId?: number
	labels?: string[]
	values?: number[]
	title?: string
}

export interface MessageBoxState {
	text: string
	time: number
	remaining: number
}

export const uiState = useState('uiState', {
	screen: 'start' as 'start' | 'setup' | 'game',
	showCanvas: false,

	modal: null as ModalConfig | null,
	modalIdCounter: 0,

	teamWindowVisible: false,
	bounceWindowVisible: false,
	teamQueueVisible: false,

	progressHandle: null as { id: number } | null,

	messageBox: { text: '', time: 0, remaining: 0 } as MessageBoxState,
	doneButtonText: '',
	bounceCount: 0,
	uiState: 0 as UIState,
	currentTeamName: '',
	currentMemberName: '',
	teamQueue: [] as Team[],
	gameRounds: [] as unknown[],
})