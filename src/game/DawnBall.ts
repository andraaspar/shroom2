import { Point } from './geom/Point.ts'
import { Shot } from './Shot.ts'
import type { Team } from './Team.ts'
import type { World } from './World.ts'
import { WorldObject } from './WorldObject.ts'

/**
 * 1:1 port of com.pirkadat.logic.DawnBall (appearance omitted).
 *
 * The original checks line of sight by rasterizing a 1px line from the
 * explosion to each object into a BitmapData and hit-testing it against the
 * terrain. The port samples the line directly against the terrain mask,
 * which is equivalent: a hit means no solid terrain pixel lies on the line.
 */
export class DawnBall extends Shot {
	damageCoords: Point[] = []
	maxDamage = 25
	effectRadius = 4000

	constructor(world: World | null = null, team: Team | null = null, owner: WorldObject | null = null, id = NaN) {
		super(world, team, owner, id)

		this.name = 'Dawn Ball'

		this.punchHoleRadius = 25.5

		this.hitSoundAssetID = 14
		this.inWaterSoundAssetID = 12
		this.explosionSoundAssetID = 20
		this.weaponAssetID = 62

		this.calculateHitSets()
	}

	override getAssetIDs(): number[] {
		return [55, 58, this.hitSoundAssetID, this.explosionSoundAssetID, this.inWaterSoundAssetID, this.weaponAssetID]
	}

	override explode(): void {
		this.punchAHole(this.location, 0, this.punchHoleRadius)

		if (!this.isGhost && this.explosionSoundAssetID) {
			WorldObject.onSoundRequest?.(this.explosionSoundAssetID, this.location, 0, 1)
		}

		for (const object of this.world!.objects) {
			if (object instanceof DawnBall || object.hasFinishedWorking) continue
			const objCoords = object.location.subtract(this.location)
			const dist = objCoords.length
			if (this.isGhost && object.team !== this.team) {
				this.closestEnemyDistance = Math.min(this.closestEnemyDistance, dist)
			}
			if (dist > this.effectRadius) continue

			if (!this.hasLineOfSight(objCoords)) continue

			if (object.team === this.team) {
				this.friendlyDamage += this.maxDamage
				if (this.owner) this.owner.friendlyDamage += this.maxDamage
			} else {
				this.enemyDamage += this.maxDamage
				if (this.owner) this.owner.enemyDamage += this.maxDamage
			}
			if (!this.isGhost || object.isGhost) {
				object.damage(this.maxDamage)
				const pushPt = objCoords.clone()
				pushPt.normalize(300)
				object.velocity = object.velocity.add(pushPt)
				object.wake()
			}
			if (!this.isGhost) this.damageCoords.push(objCoords)
		}
	}

	/**
	 * Samples the line from this shot to (this.location + offset) against the
	 * terrain mask. Returns true when no solid terrain pixel blocks the line.
	 */
	private hasLineOfSight(offset: Point): boolean {
		const terrain = this.world!.terrain!
		const steps = Math.max(1, Math.ceil(Math.max(Math.abs(offset.x), Math.abs(offset.y))))
		for (let i = 0; i <= steps; i++) {
			const t = i / steps
			if (terrain.isSolid(this.location.x + offset.x * t, this.location.y + offset.y * t)) return false
		}
		return true
	}
}
