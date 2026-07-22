import { Gravity } from '../Gravity.ts'
import { Team } from '../Team.ts'
import { TeamMember } from '../TeamMember.ts'
import { UI_STATE } from '../events.ts'
import type { Game } from '../Game.ts'
import { GameRound } from './GameRound.ts'

/**
 * 1:1 port of com.pirkadat.logic.MoveRound.
 *
 * Program.mbToP -> game.commands (per-frame bag, also written by the AI);
 * Program.mbToUI -> game.toUI; Gui / Console calls -> game.ui.
 */
export class MoveRound extends GameRound {
	static STATE_STARTED = 0
	static STATE_WAIT_FOR_TEAM = 1
	static STATE_MOVE = 2
	static STATE_SETTLE = 3

	static TYPE_NORMAL = 0
	static TYPE_MOONWALK = 1
	static TYPE_DOUBLE = 2

	type = MoveRound.TYPE_NORMAL

	timeLimit = 0

	aiStep = 0
	aiMembersMoved: TeamMember[] = []
	aiMember: TeamMember | null = null
	aiMemberMoveDirection = 0
	aiMemberMinStamina = 0

	constructor(game: Game) {
		super(game)
	}

	setState(value: number): void {
		this.state = value

		if (this.selectedTeam && this.selectedTeam.selectedMember) this.selectedTeam.selectedMember.stopAll()

		switch (this.state) {
			case MoveRound.STATE_WAIT_FOR_TEAM: {
				this.game.ui.log('Move round: waiting for team.')
				this.timeLimit = this.game.world.currentTime + 2.9
				while (true) {
					this.selectNextTeam()
					if (!this.selectedTeam) {
						this.game.ui.log('Move round: ended.')
						this.setState(GameRound.STATE_ENDED)
						Gravity.effect = Gravity.EFFECT_NORMAL
						return
					}
					if (this.selectedTeam.checkIfAlive()) break
				}
				if (this.selectedTeam.selectedMember!.health <= 0) this.selectedTeam.selectNextMember()
				this.setStamina(this.type === MoveRound.TYPE_DOUBLE ? 2 : 1)

				this.game.toUI.push({ type: 'newState', state: UI_STATE.MOVE })
				this.game.toUI.push({ type: 'newMessageBox', text: this.selectedTeam.name + ' is next!', time: -1 })
				this.game.toUI.push({ type: 'newDoneButtonText', text: '' })

				this.game.ui.showTeamWindow()

				// No execute to prevent previous team's commands affecting this team
				break
			}
			case MoveRound.STATE_MOVE: {
				this.game.ui.log('Move round: team is moving.')

				this.aiStep = 0

				let text: string
				switch (this.type) {
					case MoveRound.TYPE_NORMAL:
						text = this.selectedTeam!.name + ' is moving!'
						break
					case MoveRound.TYPE_DOUBLE:
						text = this.selectedTeam!.name + ' is running!'
						break
					case MoveRound.TYPE_MOONWALK:
						text = this.selectedTeam!.name + ' is going on a moonwalk!'
						break
				}
				this.game.toUI.push({ type: 'newMessageBox', text: text!, time: -1 })
				if (this.selectedTeam!.controller === Team.CONTROLLER_HUMAN)
					this.game.toUI.push({ type: 'newDoneButtonText', text: 'FINISHED MOVING' })
				else this.game.toUI.push({ type: 'newDoneButtonText', text: 'I AM BORED' })

				// No execute necessary, it falls through
				break
			}
			case MoveRound.STATE_SETTLE:
				this.game.ui.log('Move round: settling.')
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
			case MoveRound.STATE_STARTED:
				this.game.ui.log('Move round: started.')
				this.teamQueue = this.getSortedTeams(this.game.teams)
				if (this.type === MoveRound.TYPE_MOONWALK) Gravity.effect = Gravity.EFFECT_NORMAL / 2

				this.game.toUI.push({ type: 'teamQueueUpdated', queue: this.teamQueue.concat() })
				this.game.toUI.push({ type: 'newHelpImage', assetId: 200 })
				this.setState(MoveRound.STATE_WAIT_FOR_TEAM)
				break
			case MoveRound.STATE_WAIT_FOR_TEAM:
				if (
					this.game.world.currentTime >= this.timeLimit ||
					mbToP.upStartRequested ||
					mbToP.downStartRequested ||
					mbToP.leftStartRequested ||
					mbToP.rightStartRequested ||
					mbToP.special1StartRequested ||
					mbToP.switchMemberRequested ||
					mbToP.switchMemberReverseRequested ||
					mbToP.newSelectedTeamMember ||
					mbToP.iAmHere ||
					this.selectedTeam!.controller === Team.CONTROLLER_AI
				) {
					this.setState(MoveRound.STATE_MOVE)
					// And fall through to move
				} else {
					break
				}
			// falls through
			case MoveRound.STATE_MOVE:
				if (!this.selectedTeam!.checkIfAlive()) {
					this.game.ui.log('Move round: selected team died.')
					this.setState(MoveRound.STATE_SETTLE)
					return
				}
				if (this.selectedTeam!.selectedMember!.health <= 0) {
					this.game.ui.log('Move round: selected member died.')
					this.selectedTeam!.selectNextMember()
					break
				}

				if (this.selectedTeam!.controller === Team.CONTROLLER_AI) {
					this.doAI()
				}

				if (!isNaN(mbToP.newWalkingSpeedMultiplier))
					this.selectedTeam!.selectedMember!.setSpeedMultiplier(mbToP.newWalkingSpeedMultiplier)
				if (mbToP.upStartRequested) this.selectedTeam!.selectedMember!.startJumping()
				if (mbToP.upStopRequested) this.selectedTeam!.selectedMember!.stopJumping()

				if (mbToP.leftStartRequested) this.selectedTeam!.selectedMember!.startWalking(-1)
				if (mbToP.rightStartRequested) this.selectedTeam!.selectedMember!.startWalking(1)
				if (
					(mbToP.leftStopRequested && this.selectedTeam!.selectedMember!.facing === -1) ||
					(mbToP.rightStopRequested && this.selectedTeam!.selectedMember!.facing === 1)
				)
					this.selectedTeam!.selectedMember!.stopWalking()

				if (mbToP.switchMemberRequested) this.selectedTeam!.selectNextMember()
				if (mbToP.switchMemberReverseRequested) this.selectedTeam!.selectNextMember(true)
				if (mbToP.newSelectedTeamMember) this.selectedTeam!.selectMember(mbToP.newSelectedTeamMember)
				if (mbToP.endTurnRequested) {
					this.game.ui.log('Move round: user requested end.')
					this.setState(MoveRound.STATE_SETTLE)
					return
				}
				break
			case MoveRound.STATE_SETTLE:
				if (this.game.world.checkIfSleeping()) {
					if (this.game.checkIfOver()) {
						this.game.ui.log('Move round: game over.')
						this.setState(GameRound.STATE_GAME_OVER)
						Gravity.effect = Gravity.EFFECT_NORMAL
					} else {
						this.setState(MoveRound.STATE_WAIT_FOR_TEAM)
					}
				}
				break
		}
	}

	override getName(): string {
		return 'Moving Round'
	}

	protected doAI(): void {
		const mbToP = this.game.commands

		if (this.aiStep === 0) {
			this.aiMembersMoved = []
			this.aiMember = null
		}

		this.aiStep++

		let firstStep = false

		if (this.selectedTeam!.selectedMember !== this.aiMember) {
			this.aiMember = this.selectedTeam!.selectedMember
			firstStep = true

			this.aiMemberMinStamina = Math.random() < 0.5 ? 0 : 0.5
			this.aiMemberMoveDirection = Math.random() < 0.5 ? -1 : 1
		}

		const aiMember = this.aiMember!

		if (this.aiMembersMoved.indexOf(aiMember) !== -1) {
			mbToP.endTurnRequested = true
			return
		}

		if (aiMember.hasBeenFlying) {
			mbToP.upStopRequested = true
			if (aiMember.isWalking && aiMember.wayPoints.length) {
				if (this.aiMemberMoveDirection === 1) mbToP.rightStopRequested = true
				else mbToP.leftStopRequested = true
			}

			if (mbToP.humanIsBored) {
				if (this.aiMemberMoveDirection === 1) mbToP.rightStopRequested = true
				else mbToP.leftStopRequested = true

				this.aiMembersMoved.push(aiMember)
				mbToP.switchMemberRequested = true
			}
			return
		} else {
			const walker = aiMember.clone() as TeamMember
			walker.isGhost = true

			if (!walker.isWalking) {
				walker.startWalking(this.aiMemberMoveDirection)
			}

			let nextFrameWorldTime = aiMember.world!.currentTime + 0.04

			while (walker.timeToNotify < nextFrameWorldTime && !walker.hasFinishedWorking) {
				walker.notify(walker.timeToNotify)
			}

			let movedInTheRightDirection = (walker.location.x - aiMember.location.x) * this.aiMemberMoveDirection > 0
			let isAlive = !walker.hasFinishedWorking
			const isFalling = !walker.testIfLanded()

			const mayWalk = movedInTheRightDirection && isAlive && !isFalling

			let mayFall = false
			if (isFalling) {
				while (!walker.hasFinishedWorking) {
					if (walker.timeToNotify > nextFrameWorldTime) {
						if (!walker.hasBeenFlying && walker.testIfLanded()) break

						if (walker.isWalking && walker.wayPoints.length) {
							walker.stopWalking()
						}

						nextFrameWorldTime += 0.04
					}
					walker.notify(walker.timeToNotify)
				}

				isAlive = !walker.hasFinishedWorking
				const hasTakenDamage = walker.health < aiMember.health

				mayFall = isAlive && !hasTakenDamage
			}

			const jumper = aiMember.clone() as TeamMember
			jumper.isGhost = true

			if (!jumper.isWalking) {
				jumper.startWalking(this.aiMemberMoveDirection)
			}

			jumper.startJumping()
			jumper.notify(jumper.timeToNotify)
			jumper.stopJumping()

			nextFrameWorldTime = aiMember.world!.currentTime + 0.04

			while (!jumper.hasFinishedWorking) {
				if (jumper.timeToNotify > nextFrameWorldTime) {
					if (!jumper.hasBeenFlying && jumper.testIfLanded()) break

					if (jumper.isWalking && jumper.wayPoints.length) {
						jumper.stopWalking()
					}

					nextFrameWorldTime += 0.04
				}
				jumper.notify(jumper.timeToNotify)
			}

			isAlive = !jumper.hasFinishedWorking
			const hasTakenDamage = jumper.health < aiMember.health
			movedInTheRightDirection =
				(jumper.location.x - aiMember.location.x) * this.aiMemberMoveDirection >=
				aiMember.staminaBurnPerJump / aiMember.staminaBurnPerPixel
			const gotHigher =
				jumper.location.y < aiMember.location.y - aiMember.staminaBurnPerJump / aiMember.staminaBurnPerPixel / 4

			const mayJump = isAlive && (movedInTheRightDirection || gotHigher) && !hasTakenDamage

			if (aiMember.stamina <= this.aiMemberMinStamina || (!mayWalk && !mayFall && !mayJump) || mbToP.humanIsBored) {
				if (this.aiMemberMoveDirection === 1) mbToP.rightStopRequested = true
				else mbToP.leftStopRequested = true

				if (aiMember.stamina && firstStep) {
					this.aiMemberMoveDirection = -this.aiMemberMoveDirection

					return
				}

				this.aiMembersMoved.push(aiMember)
				mbToP.switchMemberRequested = true

				return
			}

			if (!aiMember.isWalking) {
				if (this.aiMemberMoveDirection === 1) mbToP.rightStartRequested = true
				else mbToP.leftStartRequested = true
			}

			if (mayJump) {
				mbToP.upStartRequested = true
			}
		}
	}

	override getHelpSectionID(): string {
		if (this.type === MoveRound.TYPE_NORMAL) return '#moving_round'
		return ''
	}
}
