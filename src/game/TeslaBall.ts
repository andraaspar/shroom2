import { Point } from './geom/Point.ts'
import { Shot } from './Shot.ts'
import { STEP_SECONDS } from './step.ts'
import type { Team } from './Team.ts'
import type { World } from './World.ts'
import { WorldObject } from './WorldObject.ts'

/**
 * 1:1 port of com.pirkadat.logic.TeslaBall (appearance omitted).
 *
 * The original tracks a zapSoundRequest with playbackIsOver to avoid
 * restarting the zap sound; the port emits sound requests through
 * WorldObject.onSoundRequest and throttles them to the damage tick instead.
 */
export class TeslaBall extends Shot {
	effectRadius = 150
	maxDamage = 6
	damageCoords: Point[] = []
	nextDamageTime = 0

	zapSoundAssetID = 18

	constructor(world: World | null = null, team: Team | null = null, owner: WorldObject | null = null) {
		super(world, team, owner)

		this.name = 'Tesla Ball'

		this.punchHoleRadius = 25.5

		this.hitSoundAssetID = 14
		this.inWaterSoundAssetID = 12
		this.explosionSoundAssetID = 19
		this.weaponAssetID = 61

		this.calculateHitSets()
	}

	override notify(currentTime: number): void {
		super.notify(currentTime)

		if (this.hasFinishedWorking || this.nextDamageTime > currentTime) return

		this.nextDamageTime = currentTime + STEP_SECONDS

		if (!this.isGhost) this.damageCoords = []

		for (const object of this.world!.objects) {
			if (object === this.owner || object instanceof TeslaBall || object.hasFinishedWorking) continue
			const objCoords = object.location.subtract(this.location)
			const dist = objCoords.length - this.radius - object.radius - 1
			if (this.isGhost && object.team !== this.team) {
				this.closestEnemyDistance = Math.min(this.closestEnemyDistance, dist)
			}
			let distRatio = (this.effectRadius - dist) / this.effectRadius
			if (distRatio <= 0) continue
			if (distRatio > 1) distRatio = 1
			const damage = Math.min(Math.ceil(this.maxDamage * distRatio), object.health)
			if (damage > 0) {
				if (object.team === this.team) {
					this.friendlyDamage += damage
					if (this.owner) this.owner.friendlyDamage += damage
				} else {
					this.enemyDamage += damage
					if (this.owner) this.owner.enemyDamage += damage
				}
				if (!this.isGhost || object.isGhost) object.damage(damage)
				if (!this.isGhost) this.damageCoords.push(objCoords)
			}
		}

		if (!this.isGhost && this.damageCoords.length) {
			WorldObject.onSoundRequest?.(this.zapSoundAssetID, this.location.clone(), 0, 1)
		}
	}

	override getAssetIDs(): number[] {
		return [
			56,
			57,
			this.hitSoundAssetID,
			this.explosionSoundAssetID,
			this.inWaterSoundAssetID,
			this.zapSoundAssetID,
			this.weaponAssetID,
		]
	}

	override explode(): void {
		this.punchAHole(this.location, 0, this.punchHoleRadius)

		if (!this.isGhost && this.explosionSoundAssetID) {
			WorldObject.onSoundRequest?.(this.explosionSoundAssetID, this.location, 0, 1)
		}
	}
}
