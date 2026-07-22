import { Team } from '../Team.ts'
import { TeamMember } from '../TeamMember.ts'
import { Point } from '../geom/Point.ts'
import { UI_STATE } from '../events.ts'
import type { Game } from '../Game.ts'
import { GameRound } from './GameRound.ts'

/**
 * 1:1 port of com.pirkadat.logic.ShunpoRound.
 *
 * Program.mbToP -> game.commands; Program.mbToUI -> game.toUI;
 * Gui / Console calls -> game.ui.
 */
export class ShunpoRound extends GameRound {
	static STATE_STARTED = 0
	static STATE_WAIT_FOR_TEAM = 1
	static STATE_MOVE = 2
	static STATE_SETTLE = 3

	timeLimit = 0

	teamMembersMoved: TeamMember[] = []

	directions: Point[] = [new Point(-1, -1), new Point(1, -1), new Point(1, 1), new Point(-1, 1)]
	justBelow: Point = new Point(0, 1)

	shunpoOptions: Point[] = []

	aiStep = 0
	aiMembersMoved: TeamMember[] = []
	aiMember: TeamMember | null = null

	constructor(game: Game) {
		super(game)
	}

	setState(value: number): void {
		this.state = value

		if (this.selectedTeam && this.selectedTeam.selectedMember) this.selectedTeam.selectedMember.stopAll()

		switch (this.state) {
			case ShunpoRound.STATE_WAIT_FOR_TEAM:
				this.game.ui.log('Shunpo round: waiting for team.')
				this.timeLimit = this.game.world.currentTime + 2.9
				while (true) {
					this.selectNextTeam()
					if (!this.selectedTeam) {
						this.game.ui.log('Shunpo round: ended.')
						this.setState(GameRound.STATE_ENDED)
						return
					}
					if (this.selectedTeam.checkIfAlive()) break
				}
				if (this.selectedTeam.selectedMember!.health <= 0) this.selectedTeam.selectNextMember()
				this.teamMembersMoved = []

				this.game.toUI.push({ type: 'newState', state: UI_STATE.SHUNPO })
				this.calculateShunpoOptions()
				this.game.toUI.push({ type: 'newMessageBox', text: this.selectedTeam.name + ' is next!', time: -1 })
				this.game.toUI.push({ type: 'newDoneButtonText', text: '' })

				this.game.ui.showTeamWindow()

				// No execute to prevent previous team's commands affecting this team
				break
			case ShunpoRound.STATE_MOVE:
				this.game.ui.log('Shunpo round: team is moving.')

				this.aiStep = 0

				this.game.toUI.push({ type: 'newMessageBox', text: this.selectedTeam!.name + ' is using shunpo!', time: -1 })
				if (this.selectedTeam!.controller === Team.CONTROLLER_HUMAN)
					this.game.toUI.push({ type: 'newDoneButtonText', text: 'FINISHED MOVING' })
				else this.game.toUI.push({ type: 'newDoneButtonText', text: 'I AM BORED' })

				// No execute necessary, it falls through
				break
			case ShunpoRound.STATE_SETTLE:
				this.game.ui.log('Shunpo round: settling.')
				this.game.toUI.push({ type: 'newDoneButtonText', text: '' })
				this.deselectTeam()
			// falls through
			case GameRound.STATE_ENDED:
			case GameRound.STATE_GAME_OVER:
				this.game.ui.removeTeamWindow()
				break
		}
	}

	override execute(): void {
		const mbToP = this.game.commands

		switch (this.state) {
			case ShunpoRound.STATE_STARTED:
				this.game.ui.log('Shunpo round: started.')
				this.teamQueue = this.getSortedTeams(this.game.teams)
				this.game.toUI.push({ type: 'teamQueueUpdated', queue: this.teamQueue.concat() })
				this.game.toUI.push({ type: 'newHelpImage', assetId: 200 })
				this.setState(ShunpoRound.STATE_WAIT_FOR_TEAM)
				break
			case ShunpoRound.STATE_WAIT_FOR_TEAM:
				if (
					this.game.world.currentTime >= this.timeLimit ||
					mbToP.shunpoRequested ||
					mbToP.switchMemberRequested ||
					mbToP.switchMemberReverseRequested ||
					mbToP.newSelectedTeamMember ||
					mbToP.iAmHere ||
					this.selectedTeam!.controller === Team.CONTROLLER_AI
				) {
					this.setState(ShunpoRound.STATE_MOVE)
					// And fall through to move
				} else {
					break
				}
			// falls through
			case ShunpoRound.STATE_MOVE:
				if (!this.selectedTeam!.checkIfAlive()) {
					this.game.ui.log('Shunpo round: selected team died.')
					this.setState(ShunpoRound.STATE_SETTLE)
					return
				}
				if (this.selectedTeam!.selectedMember!.health <= 0) {
					this.game.ui.log('Shunpo round: selected member died.')
					this.selectedTeam!.selectNextMember()
					break
				}

				if (this.selectedTeam!.controller === Team.CONTROLLER_AI) {
					this.doAI()
				}

				if (mbToP.shunpoRequested) {
					this.selectedTeam!.selectedMember!.location = this.selectedTeam!.selectedMember!.location.add(
						mbToP.shunpoRequested,
					)
					this.game.toUI.push({
						type: 'playSound',
						request: {
							assetId: this.game.shunpoPopAssetID,
							location: this.selectedTeam!.selectedMember!.location,
							delay: 0,
							volume: 1,
						},
					})
					this.teamMembersMoved.push(this.selectedTeam!.selectedMember!)
					this.calculateShunpoOptions()
				}
				if (mbToP.switchMemberRequested) {
					this.selectedTeam!.selectNextMember()
					this.calculateShunpoOptions()
				}
				if (mbToP.switchMemberReverseRequested) {
					this.selectedTeam!.selectNextMember(true)
					this.calculateShunpoOptions()
				}
				if (mbToP.newSelectedTeamMember) {
					this.selectedTeam!.selectMember(mbToP.newSelectedTeamMember)
					this.calculateShunpoOptions()
				}
				if (mbToP.endTurnRequested) {
					this.game.ui.log('Shunpo round: user requested end.')
					this.setState(ShunpoRound.STATE_SETTLE)
					return
				}
				break
			case ShunpoRound.STATE_SETTLE:
				if (this.game.world.checkIfSleeping()) {
					if (this.game.checkIfOver()) {
						this.game.ui.log('Shunpo round: game over.')
						this.setState(GameRound.STATE_GAME_OVER)
					} else {
						this.setState(ShunpoRound.STATE_WAIT_FOR_TEAM)
					}
				}
				break
		}
	}

	override getName(): string {
		return 'Shunpo Round'
	}

	protected calculateShunpoOptions(): void {
		const results: Point[] = []
		const offset = new Point()

		const selectedMember = this.selectedTeam!.selectedMember!

		if (this.teamMembersMoved.indexOf(selectedMember) === -1) {
			for (let directionID = 0; directionID < this.directions.length; directionID++) {
				const direction = this.directions[directionID]!

				for (let multiplier = selectedMember.radius * 2; true; multiplier += 0.25) {
					offset.x = direction.x * multiplier
					offset.y = direction.y * multiplier

					const location = selectedMember.location.add(offset)

					if (
						location.x < -selectedMember.radius ||
						location.x > this.game.world.terrain!.width + selectedMember.radius ||
						location.y < -selectedMember.radius ||
						location.y > this.game.world.terrain!.height + selectedMember.radius
					)
						break

					if (!selectedMember.getHitTest(location)) {
						if (selectedMember.getHitTest(location.add(this.justBelow))) {
							results.push(offset.clone())
							multiplier += selectedMember.radius
						}
					}
				}
			}
		}

		this.shunpoOptions = results
		this.game.toUI.push({ type: 'newShunpoOptions', options: results })
	}

	protected doAI(): void {
		const mbToP = this.game.commands

		if (this.aiStep === 0) {
			this.aiMembersMoved = []
			this.aiMember = null
		}

		this.aiStep++

		if (this.aiMember !== this.selectedTeam!.selectedMember) {
			this.aiMember = this.selectedTeam!.selectedMember
		}

		if (this.aiMembersMoved.indexOf(this.aiMember!) !== -1 || mbToP.humanIsBored) {
			mbToP.endTurnRequested = true
			return
		}

		if (this.shunpoOptions.length)
			mbToP.shunpoRequested = this.shunpoOptions[Math.floor(Math.random() * this.shunpoOptions.length)]!
		mbToP.switchMemberRequested = true
		this.aiMembersMoved.push(this.aiMember!)
	}

	override getHelpSectionID(): string {
		return '#shunpo_round'
	}
}
