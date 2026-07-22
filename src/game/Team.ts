import type { CharacterAppearance } from './CharacterAppearance.ts'
import type { TeamMember } from './TeamMember.ts'

/**
 * 1:1 port of com.pirkadat.logic.Team.
 *
 * Differences from the original, all mechanical:
 * - Program.mbToUI writes -> the injected toUI bus (member/team selection
 *   events are pushed by TeamMember / GameRound; Team itself stays bus-free)
 * - Vector.<TeamMember> -> TeamMember[]
 */
export class Team {
	static CONTROLLER_HUMAN = 0
	static CONTROLLER_AI = 1

	static AI_EASY = 0
	static AI_NORMAL = 1
	static AI_HARD = 2

	static controllerNames: string[] = ['Human', 'Computer Easy', 'Computer Normal', 'Computer Hard']

	selectedMember: TeamMember | null = null
	selectedMemberIndex = -1
	members: TeamMember[] = []

	name = ''

	isSelected = false
	controller = Team.CONTROLLER_HUMAN
	aiLevel = Team.AI_EASY

	characterAppearance: CharacterAppearance | null = null

	spawnNew(availableCharacterAppearances: CharacterAppearance[]): Team {
		const newTeam = new Team()
		newTeam.name = this.name
		newTeam.controller = this.controller
		newTeam.aiLevel = this.aiLevel
		let lastAvailableCA: CharacterAppearance | null = null
		for (const ca of availableCharacterAppearances) {
			if (!ca.assignedTo) {
				lastAvailableCA = ca
				if (ca.equals(this.characterAppearance!)) break
			}
		}
		if (lastAvailableCA) newTeam.setCharacterAppearance(lastAvailableCA)
		return newTeam
	}

	selectNextMember(reversed = false): void {
		let index = this.selectedMemberIndex
		let aMember: TeamMember

		while (true) {
			if (reversed) {
				index--
				if (index < 0) index = this.members.length - 1
			} else {
				index++
				if (index >= this.members.length) index = 0
			}

			aMember = this.members[index]!
			if (aMember.health > 0) {
				if (this.selectedMember) this.selectedMember.onDeselected()

				this.selectedMember = aMember
				this.selectedMemberIndex = index
				this.selectedMember.onSelected()

				return
			}

			if (index === this.selectedMemberIndex) {
				if (this.selectedMember) this.selectedMember.onDeselected()

				this.selectedMemberIndex = -1
				this.selectedMember = null

				return
			}
		}
	}

	selectMemberByIndex(index: number): void {
		if (this.selectedMember) this.selectedMember.onDeselected()
		this.selectedMemberIndex = index
		this.selectedMember = this.members[this.selectedMemberIndex]!
		this.selectedMember.onSelected()
	}

	selectMember(member: TeamMember): void {
		const index = this.members.indexOf(member)
		if (index === -1) return
		if (member.health <= 0) return

		if (this.selectedMember) this.selectedMember.onDeselected()
		this.selectedMember = member
		this.selectedMemberIndex = index
		this.selectedMember.onSelected()
	}

	onSelected(): void {
		if (!this.selectedMember) this.selectNextMember()
		this.selectedMember!.onSelected()
		this.isSelected = true
		this.setMovedStatus(false)
	}

	onDeselected(): void {
		// NOTE: the original calls selectedMember.onDeselected() unconditionally
		// and relies on selectedMember always being set here; guarded port.
		if (this.selectedMember) this.selectedMember.onDeselected()
		this.isSelected = false
		this.setMovedStatus(true)
	}

	getMembersAliveCount(): number {
		let result = 0
		for (const member of this.members) {
			if (member.health > 0) result++
		}
		return result
	}

	getHealth(): number {
		let health = 0
		for (const member of this.members) {
			if (member.health > 0) health += member.health
		}
		return health
	}

	checkIfAlive(): boolean {
		for (const member of this.members) {
			if (member.health > 0) return true
		}
		return false
	}

	cycleController(): void {
		if (this.controller === Team.CONTROLLER_HUMAN) {
			this.controller = Team.CONTROLLER_AI
			this.aiLevel = Team.AI_EASY
		} else {
			this.aiLevel++
			if (this.aiLevel > Team.AI_HARD) this.controller = Team.CONTROLLER_HUMAN
		}
	}

	protected setMovedStatus(flag: boolean): void {
		for (const member of this.members) {
			if (this.selectedMember !== member) member.hasBeenSelected = flag
		}
	}

	setCharacterAppearance(value: CharacterAppearance): void {
		if (value.assignedTo !== null && value.assignedTo !== this) {
			throw new Error('Character appearance already used.')
		}
		if (this.characterAppearance) this.characterAppearance.assignedTo = null
		value.assignedTo = this
		this.characterAppearance = value
	}
}
