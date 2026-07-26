import type { Point } from './geom/Point.ts'
import type { Team } from './Team.ts'
import type { TeamMember } from './TeamMember.ts'

/**
 * Typed replacement for the original MBToP / MBToUI per-frame message bags.
 *
 * The AS3 code used two bags of nullable public vars, recreated each frame:
 * - MBToP: commands flowing UI -> Program
 * - MBToUI: events flowing Program -> UI
 *
 * Here both directions are discriminated unions, so producers and consumers
 * are checked at compile time and stale per-frame flags are impossible.
 */

// ---------------------------------------------------------------------------
// UI -> Program (replaces MBToP)
// ---------------------------------------------------------------------------

export type ToProgram =
	| { type: 'newGameRequested' }
	| { type: 'newQuickGameRequested' }
	| { type: 'gameDestroyRequested' }
	| { type: 'gameStartRequested' }
	| { type: 'leftChanged'; active: boolean }
	| { type: 'rightChanged'; active: boolean }
	| { type: 'upChanged'; active: boolean }
	| { type: 'downChanged'; active: boolean }
	| { type: 'special1Changed'; active: boolean }
	| { type: 'fire1Changed'; active: boolean }
	| { type: 'newBounceCount'; value: number }
	| { type: 'switchMemberRequested' }
	| { type: 'switchMemberReverseRequested' }
	| { type: 'endTurnRequested' }
	| { type: 'humanIsBored' }
	| { type: 'iAmHere' }
	| { type: 'shunpoRequested'; at: Point }
	| { type: 'newAim'; angle: number; facing: 1 | -1 }
	| { type: 'newPowerMultiplier'; value: number }
	| { type: 'newSelectedLevel'; levelId: number }
	| { type: 'newRandomLevelRequested' }
	| { type: 'weightModifyRound'; roundClass: string; newWeight: number }
	| { type: 'addTeamRequested' }
	| { type: 'editTeam'; id: number; name?: string; controller?: number; aiLevel?: number }
	| { type: 'removeTeamRequested' }
	| { type: 'addTeamMemberRequested' }
	| { type: 'editTeamMember'; id: number }
	| { type: 'removeTeamMemberRequested' }
	| { type: 'newWalkingSpeedMultiplier'; value: number }
	| { type: 'membersPerTeam'; value: number }
	| { type: 'helpRequested' }
	| { type: 'allAssetsDownloaded' }
	| { type: 'newSelectedTeamMember'; member: TeamMember }
	| { type: 'newEditTeamID'; id: number }
	| { type: 'newEditTeamName'; name: string }
	| { type: 'newTeamController'; controller: number }
	| { type: 'newTeamAILevel'; aiLevel: number }
	| { type: 'editTeamAppearance'; id: number; appearanceIndex: number }

// ---------------------------------------------------------------------------
// Program -> UI (replaces MBToUI)
// ---------------------------------------------------------------------------

export const UI_STATE = {
	OVERVIEW: 1,
	MOVE: 2,
	AIM: 3,
	FOCUS: 4,
	SHUNPO: 5,
	SHOOT: 6,
} as const
export type UIState = (typeof UI_STATE)[keyof typeof UI_STATE]

export interface SoundRequest {
	assetId: number
	/** World position of the sound source, if any. */
	location: Point | null
	delay: number
	volume: number
}

export type ToUI =
	| { type: 'newLevel' }
	| { type: 'showStartingPage' }
	| { type: 'clearCanvas' }
	| { type: 'newMessageBox'; text: string; time: number }
	| { type: 'newState'; state: UIState }
	| { type: 'newBounceCount'; value: number }
	| { type: 'memberSelectionChanged'; member: TeamMember | null }
	| { type: 'teamSelectionChanged'; team: Team | null }
	| { type: 'newDoneButtonText'; text: string }
	| { type: 'notSafeToDragMember' }
	| { type: 'objectPlacement'; total: number; remaining: number }
	| { type: 'newController'; controller: number }
	| { type: 'membersPerTeam'; value: number }
	| { type: 'playSound'; request: SoundRequest }
	| { type: 'newPreviewAsset'; assetId: number }
	| { type: 'allAssetsDownloaded' }
	| { type: 'levelPreviewDownloaded' }
	| { type: 'winner'; team: Team }
	| { type: 'teamQueueUpdated'; queue: Team[] }
	| { type: 'gameRoundsUpdated'; rounds: unknown[] }
	| { type: 'newHelpImage'; assetId: number }
	| { type: 'newShunpoOptions'; options: Point[] }
	| { type: 'newBulletSelected' }
	| { type: 'roundWeightsUpdated' }
	| { type: 'setupStateChanged' }

// ---------------------------------------------------------------------------
// Bus
// ---------------------------------------------------------------------------

export type AnyMessage = ToProgram | ToUI

/**
 * Minimal per-frame message bus. Producers push messages during a frame;
 * the consumer drains the queue at the appropriate point in the frame,
 * matching the original "recreate the bags every frame" semantics.
 */
export class MessageBus<T> {
	private queue: T[] = []

	push(message: T): void {
		this.queue.push(message)
	}

	/** Drains the queue, invoking handler for each message in FIFO order. */
	drain(handler: (message: T) => void): void {
		for (const message of this.queue) handler(message)
		this.queue.length = 0
	}

	get isEmpty(): boolean {
		return this.queue.length === 0
	}

	clear(): void {
		this.queue.length = 0
	}
}
