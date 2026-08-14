import { Point } from './geom/Point.ts'
import { drawHitMapDoughnut, WorldObject } from './WorldObject.ts'
import type { Team } from './Team.ts'
import type { World } from './World.ts'

/**
 * 1:1 port of com.pirkadat.logic.Shot.
 *
 * Differences from the original, all mechanical:
 * - BitmapData hole maps -> Uint8Array masks via Terrain.subtractMap
 * - Program.mbToUI.newSounds -> WorldObject.onSoundRequest
 * - hitMaps static Dictionary keyed by "min:max" -> Map<string, Uint8Array>
 *   (separate from WorldObject.hitMaps which is keyed by radius)
 */
export class Shot extends WorldObject {
	pushDamageStrength = 100
	punchHoleRadius = 100

	bounceCount = 0

	explosionSoundAssetID = 0
	weaponAssetID = 59

	/** Cache: "min:max" -> doughnut hole map (separate from WorldObject.hitMaps keyed by radius). */
	static doughnutHitMaps = new Map<string, Uint8Array>()

	constructor(world: World | null = null, team: Team | null = null, owner: WorldObject | null = null, id = NaN) {
		super(world, team, owner, id)

		this.mass = 0.46
		this.bounciness = 0.6
		this.minVelocityForFlying = 0
		this.health = 1
		this.radius = 10.5
	}

	protected override onDeath(): void {
		if (this.location.y < this.world!.terrain!.height) this.explode()
	}

	protected override onLanded(): void {
		this.damage(this.health)
	}

	protected override onCollidedWithObject(_object: WorldObject, _angle: number, _speed: number): void {
		if (--this.bounceCount < 0) this.damage(this.health)

		this.wayPoints.push(this.location.clone())
	}

	protected override onCollidedWithTerrain(_angle: number, speed: number): void {
		if (--this.bounceCount < 0) this.damage(this.health)

		this.wayPoints.push(this.location.clone())

		if (!this.isGhost && this.hitSoundAssetID) {
			WorldObject.onSoundRequest?.(
				this.hitSoundAssetID,
				this.location,
				0,
				Math.min(1, speed / this.damageResistance),
			)
		}
	}

	explode(): void {
		this.punchAHole(this.location, 0, this.punchHoleRadius)
		this.pushAndDamageObjects(this.location, this.pushDamageStrength)

		if (!this.isGhost && this.explosionSoundAssetID) {
			WorldObject.onSoundRequest?.(this.explosionSoundAssetID, this.location, 0, 1)
		}
	}

	pushAndDamageObjects(center: Point, effectRadius: number): void {
		for (const object of this.world!.objects) {
			if (object.hasFinishedWorking) continue

			const distPt = object.location.subtract(center)
			const dist = distPt.length - object.radius - this.radius - 1 // -1 adjusts for direct impact, which could never be 0 dist
			if (this.isGhost && object.team !== this.team) {
				this.closestEnemyDistance = Math.min(this.closestEnemyDistance, dist)
			}

			let distRatio = (effectRadius - dist) / effectRadius // Between 0 and 1
			if (distRatio < 0) distRatio = 0
			if (distRatio > 1) distRatio = 1

			if (!this.isGhost || object.isGhost) {
				object.velocity.x += distPt.x * distRatio * (effectRadius / 10)
				object.velocity.y += distPt.y * distRatio * (effectRadius / 10)
			}

			let damage = effectRadius * distRatio
			damage = Math.min(object.health, damage)
			if (damage > 0) {
				if (object.team === this.team) {
					// AS3 friendlyDamage/enemyDamage are int; every += truncates.
					this.friendlyDamage = Math.trunc(this.friendlyDamage + damage)
					if (this.owner) this.owner.friendlyDamage = Math.trunc(this.owner.friendlyDamage + damage)
				} else {
					this.enemyDamage = Math.trunc(this.enemyDamage + damage)
					if (this.owner) this.owner.enemyDamage = Math.trunc(this.owner.enemyDamage + damage)
				}
				if (!this.isGhost || object.isGhost) object.damage(damage)
			}
		}
	}

	punchAHole(location: Point, minRadius: number, maxRadius: number): void {
		if (this.isGhost) return

		const ref = minRadius + ':' + maxRadius
		let hitMap = Shot.doughnutHitMaps.get(ref)
		if (!hitMap) {
			hitMap = drawHitMapDoughnut(minRadius, maxRadius)
			Shot.doughnutHitMaps.set(ref, hitMap)
		}

		this.world!.terrain!.subtractMap(hitMap, maxRadius * 2, location.x - maxRadius, location.y - maxRadius)
	}

	doDoughnutDamageAndPush(effectRadius = 100, doughnutRadius = 40, maxDamage = 100, maxPush = 300): void {
		for (const object of this.world!.objects) {
			if (object.hasFinishedWorking) continue

			const distPt = object.location.subtract(this.location)
			const dist = distPt.length - effectRadius
			if (this.isGhost && object.team !== this.team) {
				this.closestEnemyDistance = Math.min(this.closestEnemyDistance, dist)
			}

			let distRatio = (doughnutRadius - Math.abs(dist)) / doughnutRadius // Between 0 and 1
			if (distRatio < 0) distRatio = 0
			if (distRatio > 1) distRatio = 1

			if (!this.isGhost || object.isGhost) {
				if (dist > 0) distPt.normalize(1)
				else distPt.normalize(-1)
				object.velocity.x += distPt.x * maxPush * distRatio
				object.velocity.y += distPt.y * maxPush * distRatio
			}

			let damage = maxDamage * distRatio
			damage = Math.min(object.health, damage)
			if (damage > 0) {
				if (object.team === this.team) {
					// AS3 friendlyDamage/enemyDamage are int; every += truncates.
					this.friendlyDamage = Math.trunc(this.friendlyDamage + damage)
					if (this.owner) this.owner.friendlyDamage = Math.trunc(this.owner.friendlyDamage + damage)
				} else {
					this.enemyDamage = Math.trunc(this.enemyDamage + damage)
					if (this.owner) this.owner.enemyDamage = Math.trunc(this.owner.enemyDamage + damage)
				}
				if (!this.isGhost || object.isGhost) object.damage(damage)
			}
		}
	}
}
