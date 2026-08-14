import type { Point } from './geom/Point.ts'
import type { ToProgram } from './events.ts'
import type { TeamMember } from './TeamMember.ts'
import type { CharacterAppearance } from './CharacterAppearance.ts'
import type { RoundCtor } from './rounds/GameRound.ts'

/**
 * Per-frame command bag: the 1:1 equivalent of MBToP. The ToProgram message
 * bus is drained into this structure at the top of each frame; game logic
 * (Game, rounds, AI) then reads AND writes these fields freely within the
 * frame, exactly like the original reads/writes Program.mbToP.
 */
export class FrameCommands {
	newGameRequested = false
	newQuickGameRequested = false
	gameDestroyRequested = false

	gameStartRequested = false

	allAssetsDownloaded = false

	leftStartRequested = false
	leftStopRequested = false
	rightStartRequested = false
	rightStopRequested = false
	upStartRequested = false
	upStopRequested = false
	downStartRequested = false
	downStopRequested = false
	special1StartRequested = false
	special1StopRequested = false
	newBounceCount = NaN
	fire1StartRequested = false
	fire1StopRequested = false
	switchMemberRequested = false
	switchMemberReverseRequested = false
	endTurnRequested = false
	humanIsBored = false
	iAmHere = false
	shunpoRequested: Point | null = null

	newAim = NaN
	newFacing = 0
	newPowerMultiplier = NaN

	newSelectedLevel: number | null = null
	newRandomLevelRequested = false

	weightModifyRound: RoundCtor | null = null
	newRoundWeight = 0

	addTeamRequested = false
	newEditTeamID = NaN
	newEditTeamName: string | null = null
	removeTeamRequested = false
	removeTeamRequestedID = NaN
	newTeamController = NaN
	newTeamAILevel = NaN

	addTeamMemberRequested = false
	newEditTeamMemberID = NaN
	removeTeamMemberRequested = false
	newSelectedTeamMember: TeamMember | null = null

	newWalkingSpeedMultiplier = NaN

	membersPerTeam = 0

	newTeamAppearance: CharacterAppearance | null = null

	helpRequested = false

	editTeamAppearanceId = NaN
	editTeamAppearanceIndex = NaN

	/** Folds one bus message into the bag. */
	apply(message: ToProgram): void {
		switch (message.type) {
			case 'newGameRequested':
				this.newGameRequested = true
				break
			case 'newQuickGameRequested':
				this.newQuickGameRequested = true
				break
			case 'gameDestroyRequested':
				this.gameDestroyRequested = true
				break
			case 'gameStartRequested':
				this.gameStartRequested = true
				break
			case 'leftChanged':
				if (message.active) this.leftStartRequested = true
				else this.leftStopRequested = true
				break
			case 'rightChanged':
				if (message.active) this.rightStartRequested = true
				else this.rightStopRequested = true
				break
			case 'upChanged':
				if (message.active) this.upStartRequested = true
				else this.upStopRequested = true
				break
			case 'downChanged':
				if (message.active) this.downStartRequested = true
				else this.downStopRequested = true
				break
			case 'special1Changed':
				if (message.active) this.special1StartRequested = true
				else this.special1StopRequested = true
				break
			case 'fire1Changed':
				if (message.active) this.fire1StartRequested = true
				else this.fire1StopRequested = true
				break
			case 'newBounceCount':
				this.newBounceCount = message.value
				break
			case 'switchMemberRequested':
				this.switchMemberRequested = true
				break
			case 'switchMemberReverseRequested':
				this.switchMemberReverseRequested = true
				break
			case 'endTurnRequested':
				this.endTurnRequested = true
				break
			case 'humanIsBored':
				this.humanIsBored = true
				break
			case 'iAmHere':
				this.iAmHere = true
				break
			case 'shunpoRequested':
				this.shunpoRequested = message.at
				break
			case 'newAim':
				this.newAim = message.angle
				this.newFacing = message.facing
				break
			case 'newPowerMultiplier':
				this.newPowerMultiplier = message.value
				break
			case 'newSelectedLevel':
				this.newSelectedLevel = message.levelId
				break
			case 'newRandomLevelRequested':
				this.newRandomLevelRequested = true
				break
			case 'weightModifyRound':
				// Resolved to a RoundCtor by Game, which knows the classes.
				break
			case 'addTeamRequested':
				this.addTeamRequested = true
				break
			case 'editTeam':
				this.newEditTeamID = message.id
				if (message.name !== undefined) this.newEditTeamName = message.name
				if (message.controller !== undefined) this.newTeamController = message.controller
				if (message.aiLevel !== undefined) this.newTeamAILevel = message.aiLevel
				break
			case 'removeTeamRequested':
				this.removeTeamRequested = true
				this.removeTeamRequestedID = message.id
				break
			case 'addTeamMemberRequested':
				this.addTeamMemberRequested = true
				break
			case 'editTeamMember':
				this.newEditTeamMemberID = message.id
				break
			case 'removeTeamMemberRequested':
				this.removeTeamMemberRequested = true
				break
			case 'newWalkingSpeedMultiplier':
				this.newWalkingSpeedMultiplier = message.value
				break
			case 'membersPerTeam':
				this.membersPerTeam = message.value
				break
			case 'helpRequested':
				this.helpRequested = true
				break
			case 'allAssetsDownloaded':
				this.allAssetsDownloaded = true
				break
			case 'newSelectedTeamMember':
				this.newSelectedTeamMember = message.member
				break
			case 'editTeamAppearance':
				this.editTeamAppearanceId = message.id
				this.editTeamAppearanceIndex = message.appearanceIndex
				break
		}
	}
}
