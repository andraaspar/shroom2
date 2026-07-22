import { Shot } from './Shot.ts'
import type { Team } from './Team.ts'
import type { World } from './World.ts'
import { WorldObject } from './WorldObject.ts'

/** 1:1 port of com.pirkadat.logic.Doughnut (appearance omitted). */
export class Doughnut extends Shot {
	effectRadius = 100
	doughnutRadius = 40
	maxDamage = 120
	maxPush = 300

	constructor(world: World | null = null, team: Team | null = null, owner: WorldObject | null = null) {
		super(world, team, owner)

		this.name = 'Doughnut'

		this.punchHoleRadius = 25.5

		this.hitSoundAssetID = 15
		this.inWaterSoundAssetID = 12
		this.explosionSoundAssetID = 17
		this.weaponAssetID = 60

		this.calculateHitSets()
	}

	override getAssetIDs(): number[] {
		return [53, 54, this.hitSoundAssetID, this.explosionSoundAssetID, this.inWaterSoundAssetID, this.weaponAssetID]
	}

	override explode(): void {
		this.doDoughnutDamageAndPush(this.effectRadius, this.doughnutRadius, this.maxDamage, this.maxPush)
		this.punchAHole(this.location, this.effectRadius - this.doughnutRadius, this.effectRadius + this.doughnutRadius)
		this.punchAHole(this.location, 0, this.punchHoleRadius)

		if (!this.isGhost && this.explosionSoundAssetID) {
			WorldObject.onSoundRequest?.(this.explosionSoundAssetID, this.location, 0, 1)
		}
	}
}
