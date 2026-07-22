import { Team } from '../Team.ts'
import { TeamMember } from '../TeamMember.ts'
import type { Shot } from '../Shot.ts'
import type { World } from '../World.ts'
import type { ShotCtor } from '../TeamMember.ts'

/**
 * 1:1 port of com.pirkadat.logic.TestShot.
 *
 * Simulates a single ghost shot to completion and records the damage it
 * would do, for AI aim selection.
 */
export class TestShot {
	aim: number
	facing: number
	powerMultiplier: number
	world: World
	member: TeamMember
	bullet: ShotCtor
	bounceCount: number
	friendlyDamage = 0
	enemyDamage = 0
	damageRatio = 0
	closestEnemyDistance = Infinity
	static count = 0
	id: number
	steps = 0

	constructor(
		aim: number,
		facing: number,
		powerMultiplier: number,
		world: World,
		member: TeamMember,
		bullet: ShotCtor,
		bounceCount: number,
	) {
		this.aim = aim
		this.facing = facing
		this.powerMultiplier = powerMultiplier
		this.world = world
		this.member = member
		this.bullet = bullet
		this.bounceCount = bounceCount

		this.id = TestShot.count++

		this.calculate()
	}

	calculate(): void {
		this.member.isGhost = true

		this.member.aim = this.aim
		this.member.facing = this.facing
		this.member.powerMultiplier = this.powerMultiplier
		this.member.bounceCount = this.bounceCount

		const shot: Shot = this.member.fire()!

		this.member.isGhost = false

		this.steps = 0

		while (true) {
			shot.notify(shot.timeToNotify)
			if (shot.hasFinishedWorking) {
				this.friendlyDamage = shot.friendlyDamage
				this.enemyDamage = shot.enemyDamage
				this.closestEnemyDistance = shot.closestEnemyDistance

				break
			}

			this.steps++
		}

		if (this.friendlyDamage === 0 && this.enemyDamage === 0) this.damageRatio = 0
		else this.damageRatio = this.enemyDamage / this.friendlyDamage
	}

	toString(): string {
		return `[TestShot: id:${this.id} bounceCount:${this.bounceCount} aim:${Math.round((this.aim / Math.PI) * 180)}° facing:${this.facing} powerMultiplier:${this.powerMultiplier} friendlyDamage:${this.friendlyDamage} enemyDamage:${this.enemyDamage} damageRatio:${this.damageRatio}]`
	}
}
