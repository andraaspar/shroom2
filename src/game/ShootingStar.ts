import { Shot } from './Shot.ts'
import type { Team } from './Team.ts'
import type { World } from './World.ts'
import type { WorldObject } from './WorldObject.ts'

/** 1:1 port of com.pirkadat.logic.ShootingStar (appearance omitted). */
export class ShootingStar extends Shot {
	constructor(world: World | null = null, team: Team | null = null, owner: WorldObject | null = null) {
		super(world, team, owner)

		this.name = 'Shooting Star'
		this.punchHoleRadius = 100
		this.pushDamageStrength = 100

		this.hitSoundAssetID = 14
		this.inWaterSoundAssetID = 12
		this.explosionSoundAssetID = 10

		this.calculateHitSets()
	}

	override getAssetIDs(): number[] {
		return [51, 50, this.hitSoundAssetID, this.explosionSoundAssetID, this.inWaterSoundAssetID, this.weaponAssetID]
	}
}
