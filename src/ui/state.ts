import { useState } from '../c-mp/fun/useState'
import type { UIState } from '../game/events'
import type { Team } from '../game/Team'

export interface SetupTeamEntry {
	id: number
	name: string
	memberCount: number
	controller: number
	aiLevel: number
	appearanceName: string
	appearanceColor: number
}

export interface SetupRoundWeightEntry {
	className: string
	displayName: string
	weight: number
	isMoveRound: boolean
}

export interface ModalConfig {
	id: number
	type: 'confirm' | 'yesno' | 'image' | 'progress' | 'prompt' | 'appearance-picker' | 'controller-picker'
	text?: string
	action?: string
	assetId?: number
	labels?: string[]
	values?: number[]
	title?: string
	// For appearance-picker
	teamIndex?: number
	appearances?: Array<{
		characterName: string
		color: number
		colorNumber: number
		isAssigned: boolean
		index: number
	}>
	selectedAppearanceIndex?: number
	// For controller-picker
	currentController?: number
	currentAiLevel?: number
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

	setupTeams: [] as SetupTeamEntry[],
	setupEditedTeamIndex: -1,
	setupMembersPerTeam: 1,
	setupRoundWeights: [] as SetupRoundWeightEntry[],
	setupLevelName: 'Generated Level',
	setupInitialized: false,
	setupAvailableAppearances: [] as Array<{
		characterName: string
		color: number
		colorNumber: number
		index: number
	}>,

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
	teamMembers: [] as Array<{ name: string; health: number }>,
	menuVisible: false,
})