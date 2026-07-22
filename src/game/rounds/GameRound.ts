import { Team } from '../Team.ts'
import type { TeamMember } from '../TeamMember.ts'
import type { Game } from '../Game.ts'

/**
 * 1:1 port of com.pirkadat.logic.GameRound.
 *
 * Program.mbToP / Program.mbToUI static access is replaced by the buses
 * owned by Game (game.toProgram / game.toUI).
 */
export class GameRound {
	game: Game

	teamQueue: Team[] = []
	selectedTeam: Team | null = null

	state = 0

	static STATE_ENDED = 999
	static STATE_GAME_OVER = 1000

	allowsBounceChanges = false

	constructor(game: Game) {
		this.game = game
	}

	execute(): void {}

	protected setStamina(value = 1): void {
		for (const member of this.selectedTeam!.members) {
			member.restoreStaminaTo(value)
		}
	}

	protected fire(): void {
		for (const team of this.game.teams) {
			for (const member of team.members) {
				member.fire()
			}
		}
	}

	protected compareTeams(aTeam: Team, bTeam: Team): number {
		const aMembersCount = aTeam.getMembersAliveCount()
		const bMembersCount = bTeam.getMembersAliveCount()

		if (aMembersCount === bMembersCount) {
			const aHealth = aTeam.getHealth()
			const bHealth = bTeam.getHealth()
			if (aHealth === bHealth) {
				return this.game.teams.indexOf(aTeam) - this.game.teams.indexOf(bTeam)
			}
			return bHealth - aHealth
		}

		return bMembersCount - aMembersCount
	}

	protected selectNextTeam(): void {
		if (this.selectedTeam) this.selectedTeam.onDeselected()

		while (true) {
			this.selectedTeam = this.teamQueue.shift() ?? null
			if (!this.selectedTeam) {
				this.game.toUI.push({ type: 'newController', controller: Team.CONTROLLER_HUMAN })
				return
			}
			if (this.selectedTeam.checkIfAlive()) {
				this.selectedTeam.onSelected()
				this.game.toUI.push({ type: 'teamSelectionChanged', team: this.selectedTeam })
				this.game.toUI.push({ type: 'newController', controller: this.selectedTeam.controller })
				return
			}
		}
	}

	protected deselectTeam(): void {
		if (this.selectedTeam) this.selectedTeam.onDeselected()

		this.selectedTeam = null
		this.game.toUI.push({ type: 'teamSelectionChanged', team: null })
		this.game.toUI.push({ type: 'newController', controller: Team.CONTROLLER_HUMAN })
	}

	protected getSortedTeams(source: Team[]): Team[] {
		const result = source.concat().sort((a, b) => this.compareTeams(a, b))
		for (let i = result.length - 1; i >= 0; i--) {
			const team = result[i]!
			if (!team.checkIfAlive()) result.splice(i, 1)
		}
		return result
	}

	getName(): string {
		return 'Game Round'
	}

	getHelpSectionID(): string {
		return ''
	}
}

/** Constructor type for round classes (replaces AS3 Class references). */
export type RoundCtor = new (game: Game) => GameRound
