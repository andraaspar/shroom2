import { Team } from '../Team.ts'
import { TeamMember } from '../TeamMember.ts'
import { ShootingStar } from '../ShootingStar.ts'
import { DawnBall } from '../DawnBall.ts'
import { Doughnut } from '../Doughnut.ts'
import { TeslaBall } from '../TeslaBall.ts'
import { UI_STATE } from '../events.ts'
import type { Game } from '../Game.ts'
import { GameRound } from './GameRound.ts'
import { TestShot } from './TestShot.ts'

/**
 * 1:1 port of com.pirkadat.logic.ShootRound.
 *
 * Program.mbToP -> game.commands; Program.mbToUI -> game.toUI;
 * Gui / Console calls -> game.ui. The AI aim FakeThread is ported as a
 * generator stepped once per execute() (aimGenerator).
 */
export class ShootRound extends GameRound {
	static STATE_STARTED = 0
	static STATE_WAIT_FOR_TEAM = 1
	static STATE_AIM = 2
	static STATE_PREPARE = 3
	static STATE_SETTLE = 4
	static STATE_WAIT = 5

	static TYPE_NORMAL = 0
	static TYPE_DAWN = 1
	static TYPE_DOUGHNUT = 2
	static TYPE_TESLA = 3

	type = ShootRound.TYPE_NORMAL

	timeLimit = 0

	step = 0
	membersMoved: TeamMember[] = []
	member: TeamMember | null = null

	memberIsOnLeft = false
	aim = 0
	facing = 0
	powerMultiplier = 0
	bounceCount = 0
	bestShot: TestShot | null = null
	aimStep = 0
	powerStep = 0
	maxBounces = 0
	angleRandomness = 0
	powerRandomness = 0
	waitForMemberSwitch = false

	private aimGenerator: Generator<void> | null = null

	constructor(game: Game) {
		super(game)

		this.allowsBounceChanges = true
	}

	protected setState(value: number): void {
		this.state = value

		if (this.selectedTeam && this.selectedTeam.selectedMember) this.selectedTeam.selectedMember.stopAll()

		switch (this.state) {
			case ShootRound.STATE_WAIT_FOR_TEAM:
				this.game.ui.log('Shoot round: waiting for team.')
				this.timeLimit = this.game.world.currentTime + 2.9
				while (true) {
					this.selectNextTeam()
					if (!this.selectedTeam) {
						this.setState(ShootRound.STATE_PREPARE)
						return
					}
					if (this.selectedTeam.checkIfAlive()) break
				}
				if (this.selectedTeam.selectedMember!.health <= 0) this.selectedTeam.selectNextMember()

				this.game.toUI.push({ type: 'newState', state: UI_STATE.AIM })
				this.game.toUI.push({ type: 'newMessageBox', text: this.selectedTeam.name + ' is next!', time: -1 })
				this.game.toUI.push({ type: 'newDoneButtonText', text: '' })

				this.game.ui.showTeamWindow()
				if (this.allowsBounceChanges) this.game.ui.showBounceWindow()

				// No execute to prevent previous team's commands affecting this team
				break
			case ShootRound.STATE_AIM: {
				this.game.ui.log('Shoot round: team is aiming.')

				this.step = 0

				let text = this.selectedTeam!.name + ' is aiming their '
				switch (this.type) {
					case ShootRound.TYPE_NORMAL:
						text += 'Shooting Stars!'
						break
					case ShootRound.TYPE_DAWN:
						text += 'Dawn Guns!'
						break
					case ShootRound.TYPE_DOUGHNUT:
						text += 'Doughnuts!'
						break
					case ShootRound.TYPE_TESLA:
						text += 'Tesla Balls!'
						break
				}
				this.game.toUI.push({ type: 'newMessageBox', text, time: -1 })
				if (this.selectedTeam!.controller === Team.CONTROLLER_HUMAN)
					this.game.toUI.push({ type: 'newDoneButtonText', text: 'READY TO SHOOT' })
				else this.game.toUI.push({ type: 'newDoneButtonText', text: 'I AM BORED' })
				break
			}
			case ShootRound.STATE_PREPARE:
				this.game.ui.log('Shoot round: preparing.')
				this.timeLimit = this.game.world.currentTime + 2.9
				this.game.toUI.push({ type: 'newDoneButtonText', text: '' })
				this.game.toUI.push({ type: 'clearCanvas' })
				this.game.toUI.push({ type: 'newState', state: UI_STATE.FOCUS })
				this.game.ui.removeTeamWindow()
				this.game.ui.removeBounceWindow()
				this.deselectTeam()
				break
			case ShootRound.STATE_SETTLE:
				this.game.ui.log('Shoot round: shooting, settling.')
				this.game.toUI.push({
					type: 'playSound',
					request: { assetId: this.game.gongSoundAssetID, location: null, delay: 0, volume: 1 },
				})
				this.game.toUI.push({ type: 'newMessageBox', text: 'Fire!!!', time: 75 })
				this.game.toUI.push({ type: 'newState', state: UI_STATE.SHOOT })

				this.fire()
				break
			case ShootRound.STATE_WAIT:
				this.game.toUI.push({
					type: 'newMessageBox',
					text: "Take a look around, and press NEXT ROUND when you're ready!",
					time: -1,
				})
				this.game.toUI.push({ type: 'newDoneButtonText', text: 'NEXT ROUND' })
				this.game.toUI.push({ type: 'newState', state: UI_STATE.OVERVIEW })
				break
			case GameRound.STATE_ENDED:
			case GameRound.STATE_GAME_OVER:
				this.game.ui.removeTeamWindow()
				this.game.ui.removeBounceWindow()
				break
		}
	}

	override execute(): void {
		const mbToP = this.game.commands

		switch (this.state) {
			case ShootRound.STATE_STARTED:
				this.game.ui.log('Shoot round: started.')
				this.teamQueue = this.getSortedTeams(this.game.teams)
				switch (this.type) {
					case ShootRound.TYPE_NORMAL:
						TeamMember.bullet = ShootingStar
						break
					case ShootRound.TYPE_DAWN:
						TeamMember.bullet = DawnBall
						break
					case ShootRound.TYPE_DOUGHNUT:
						TeamMember.bullet = Doughnut
						break
					case ShootRound.TYPE_TESLA:
						TeamMember.bullet = TeslaBall
						break
				}

				this.game.toUI.push({ type: 'newBulletSelected' })
				this.game.toUI.push({ type: 'teamQueueUpdated', queue: this.teamQueue.concat() })
				this.setState(ShootRound.STATE_WAIT_FOR_TEAM)
				break
			case ShootRound.STATE_WAIT_FOR_TEAM:
				if (
					this.game.world.currentTime >= this.timeLimit ||
					mbToP.upStartRequested ||
					mbToP.downStartRequested ||
					mbToP.fire1StartRequested ||
					mbToP.leftStartRequested ||
					mbToP.rightStartRequested ||
					mbToP.switchMemberRequested ||
					mbToP.switchMemberReverseRequested ||
					mbToP.newSelectedTeamMember ||
					!isNaN(mbToP.newAim) ||
					mbToP.iAmHere ||
					!isNaN(mbToP.newBounceCount) ||
					this.selectedTeam!.controller === Team.CONTROLLER_AI
				) {
					this.setState(ShootRound.STATE_AIM)
					// And fall through to aim
				} else {
					break
				}
			// falls through
			case ShootRound.STATE_AIM:
				if (this.selectedTeam!.controller === Team.CONTROLLER_AI) this.doAI()

				if (mbToP.upStartRequested) this.selectedTeam!.selectedMember!.startAimingUp()
				if (mbToP.upStopRequested) this.selectedTeam!.selectedMember!.stopAimingUp()
				if (mbToP.downStartRequested) this.selectedTeam!.selectedMember!.startAimingDown()
				if (mbToP.downStopRequested) this.selectedTeam!.selectedMember!.stopAimingDown()
				if (
					this.allowsBounceChanges &&
					!isNaN(mbToP.newBounceCount) &&
					mbToP.newBounceCount <= 3 &&
					mbToP.newBounceCount >= 0
				) {
					this.selectedTeam!.selectedMember!.bounceCount = mbToP.newBounceCount
					this.game.toUI.push({ type: 'newBounceCount', value: this.selectedTeam!.selectedMember!.bounceCount })
				}
				if (mbToP.fire1StartRequested) {
					this.selectedTeam!.selectedMember!.powerMultiplier = 0
					this.selectedTeam!.selectedMember!.startPoweringUp()
				}
				if (mbToP.fire1StopRequested) this.selectedTeam!.selectedMember!.stopPoweringUp()

				if (mbToP.leftStartRequested) this.selectedTeam!.selectedMember!.facing = -1
				if (mbToP.rightStartRequested) this.selectedTeam!.selectedMember!.facing = 1

				if (!isNaN(mbToP.newAim)) {
					this.selectedTeam!.selectedMember!.aim = mbToP.newAim
					this.selectedTeam!.selectedMember!.facing = mbToP.newFacing
					// Apply power only when a real value was provided (AI writes it
					// with newAim; the human crosshair always pushes it together).
					if (!isNaN(mbToP.newPowerMultiplier)) {
						this.selectedTeam!.selectedMember!.powerMultiplier = mbToP.newPowerMultiplier
					}
				}

				if (mbToP.switchMemberRequested) {
					this.selectedTeam!.selectNextMember()
				}
				if (mbToP.switchMemberReverseRequested) {
					this.selectedTeam!.selectNextMember(true)
				}
				if (mbToP.newSelectedTeamMember) {
					this.selectedTeam!.selectMember(mbToP.newSelectedTeamMember)
				}
				if (mbToP.endTurnRequested) {
					this.game.ui.log('Shoot round: user requested end.')
					this.setState(ShootRound.STATE_WAIT_FOR_TEAM)
					return
				}
				break
			case ShootRound.STATE_PREPARE:
				this.game.toUI.push({
					type: 'newMessageBox',
					text: 'Firing in... ' + Math.trunc(this.timeLimit - this.game.world.currentTime + 1),
					time: -1,
				})

				if (this.game.world.currentTime >= this.timeLimit) this.setState(ShootRound.STATE_SETTLE)
				break
			case ShootRound.STATE_SETTLE:
				if (this.game.checkIfDrawn()) {
					this.game.ui.log('Shoot round: game over.')
					this.setState(GameRound.STATE_GAME_OVER)
					return
				}
				if (this.game.world.checkIfSleeping()) {
					if (this.game.checkIfOver()) {
						this.game.ui.log('Shoot round: game over.')
						this.setState(GameRound.STATE_GAME_OVER)
						return
					} else {
						this.setState(ShootRound.STATE_WAIT)
						return
					}
				}
				break
			case ShootRound.STATE_WAIT:
				if (mbToP.endTurnRequested) {
					this.setState(GameRound.STATE_ENDED)
				}
				break
		}
	}

	override getName(): string {
		return 'Shooting Star Round'
	}

	protected doAI(): void {
		if (this.step === 0) {
			this.membersMoved = []
			this.member = null

			switch (this.selectedTeam!.aiLevel) {
				case Team.AI_EASY:
					this.aimStep = (Math.PI / 180) * 20
					this.powerStep = 0.5
					this.maxBounces = 0
					this.angleRandomness = (Math.PI / 180) * 5
					this.powerRandomness = 0.1
					break
				case Team.AI_NORMAL:
					this.aimStep = (Math.PI / 180) * 10
					this.powerStep = 0.2
					this.maxBounces = this.allowsBounceChanges ? 1 : 0
					this.angleRandomness = (Math.PI / 180) * 1
					this.powerRandomness = 0.02
					break
				case Team.AI_HARD:
					this.aimStep = (Math.PI / 180) * 5
					this.powerStep = 0.2
					this.maxBounces = this.allowsBounceChanges ? 1 : 0
					this.angleRandomness = 0
					this.powerRandomness = 0
					break
			}

			this.bounceCount = 0
			this.powerMultiplier = this.powerStep
			this.aim = -Math.PI / 2

			this.waitForMemberSwitch = true

			this.aimGenerator = this.aimThread()
		}

		this.step++

		if (this.aimGenerator) {
			// The original registers aimThread with Program's FakeThread,
			// which advances it once per frame *before* command consumption
			// (Program.as:71), so a switchMemberRequested it sets is consumed by
			// that same frame's STATE_AIM block. Mirror that exactly: step the
			// generator once per doAI() call, never spinning on it.
			const result = this.aimGenerator.next()
			if (result.done) {
				this.aimGenerator = null
				this.aimThreadCallBack()
			}
		}
	}

	/**
	 * 1:1 port of the original aimThread FakeThread closure, as a generator
	 * stepped once per doAI() call.
	 *
	 * NOTE: this generator lives across many frames (Program allocates a fresh
	 * FrameCommands bag each step and reassigns game.commands), so it must
	 * read the command bag freshly via this.game.commands on every resumption
	 * rather than capturing it once.
	 */
	private *aimThread(): Generator<void> {
		while (true) {
			// Wait for member switch check

			if (this.waitForMemberSwitch) {
				if (this.game.commands.switchMemberRequested) {
					yield
					continue
				} else {
					this.waitForMemberSwitch = false

					// Member loop end check

					this.member = this.selectedTeam!.selectedMember
					if (this.membersMoved.indexOf(this.member!) !== -1) {
						// Member loop ended.
						return
					}

					this.memberIsOnLeft = this.member!.location.x < this.member!.world!.terrain!.width / 2
					this.facing = this.memberIsOnLeft ? 1 : -1
				}
			}

			// Facing loop end check

			if (
				(this.memberIsOnLeft && this.facing < -1) ||
				(!this.memberIsOnLeft && this.facing > 1) ||
				this.game.commands.humanIsBored
			) {
				// Facing loop ended.

				if (this.bestShot) {
					this.bestShot.aim += Math.random() * this.angleRandomness * 2 - this.angleRandomness
					if (this.bestShot.aim > Math.PI / 2) this.bestShot.aim = Math.PI / 2
					if (this.bestShot.aim < -Math.PI / 2) this.bestShot.aim = -Math.PI / 2

					this.bestShot.powerMultiplier += Math.random() * this.powerRandomness * 2 - this.powerRandomness
					if (this.bestShot.powerMultiplier > 1) this.bestShot.powerMultiplier = 1
					if (this.bestShot.powerMultiplier < 0) this.bestShot.powerMultiplier = 0

					this.game.commands.newAim = this.bestShot.aim
					this.game.commands.newFacing = this.bestShot.facing
					this.game.commands.newBounceCount = this.bestShot.bounceCount
					if (!this.bestShot.damageRatio && this.bestShot.friendlyDamage)
						this.game.commands.newPowerMultiplier = 0
					else this.game.commands.newPowerMultiplier = this.bestShot.powerMultiplier

					this.game.ui.log(this.member!.name, this.bestShot)
				} else {
					this.game.commands.newPowerMultiplier = 0
				}

				this.membersMoved.push(this.member!)
				this.game.commands.switchMemberRequested = true

				this.bestShot = null
				this.waitForMemberSwitch = true

				yield
				continue
			}

			// Bounce loop end check

			if (this.bounceCount > this.maxBounces) {
				this.facing += this.memberIsOnLeft ? -2 : 2
				this.bounceCount = 0

				yield
				continue
			}

			// PowerMultiplier loop end check

			if (this.powerMultiplier > 1) {
				this.bounceCount++
				this.powerMultiplier = this.powerStep

				yield
				continue
			}

			// Aim loop end check

			if (this.aim > Math.PI / 2) {
				this.powerMultiplier += this.powerStep
				this.aim = -Math.PI / 2

				yield
				continue
			}

			// Aim loop body

			const testShot = new TestShot(
				this.aim,
				this.facing,
				this.powerMultiplier,
				this.game.world,
				this.member!,
				ShootingStar,
				this.bounceCount,
			)
			if (this.bestShot) {
				if (testShot.damageRatio > this.bestShot.damageRatio) {
					this.bestShot = testShot
				} else if (testShot.damageRatio === this.bestShot.damageRatio) {
					if (testShot.enemyDamage > this.bestShot.enemyDamage) {
						this.bestShot = testShot
					} else if (testShot.enemyDamage === this.bestShot.enemyDamage) {
						if (testShot.friendlyDamage < this.bestShot.friendlyDamage) {
							this.bestShot = testShot
						} else if (testShot.friendlyDamage === this.bestShot.friendlyDamage) {
							if (testShot.enemyDamage) {
								if (testShot.steps < this.bestShot.steps) {
									this.bestShot = testShot
								}
							} else {
								if (testShot.closestEnemyDistance < this.bestShot.closestEnemyDistance) {
									this.bestShot = testShot
								}
							}
						}
					}
				}
			} else {
				this.bestShot = testShot
			}

			// Aim loop tail

			this.aim += this.aimStep

			yield
		}
	}

	private aimThreadCallBack(): void {
		this.game.commands.endTurnRequested = true
	}

	override getHelpSectionID(): string {
		if (this.type === ShootRound.TYPE_NORMAL) return '#shooting_star_round'
		return ''
	}
}
