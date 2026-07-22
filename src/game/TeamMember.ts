import type { MessageBus, ToUI } from './events.ts'
import { HALF_PI, Point } from './geom/Point.ts'
import type { Shot } from './Shot.ts'
import type { Team } from './Team.ts'
import { WorldObject } from './WorldObject.ts'
import type { World } from './World.ts'

/** Constructor type for shot classes (replaces AS3 `Class` references). */
export type ShotCtor = new (world?: World | null, team?: Team | null, owner?: WorldObject | null) => Shot

/**
 * 1:1 port of com.pirkadat.logic.TeamMember.
 *
 * Differences from the original, all mechanical:
 * - Program.mbToUI.memberSelectionChanged -> injected toUI bus message
 * - static bullet:Class -> static bullet:ShotCtor
 * - createAppearance / traceStatus omitted (render layer)
 */
export class TeamMember extends WorldObject {
	maxWalkingSpeed = 150

	aim = 0
	power = 800
	powerMultiplier = 0
	poweringSpeed = 0.5
	bounceCount = 0

	isAimingUp = false
	isAimingDown = false
	isPoweringUp = false
	isPoweringDown = false
	aimingSpeed: number = HALF_PI

	isSelected = false

	aniAssetID = 0
	colourAssetID = 0

	hasBeenSelected = true

	static bullet: ShotCtor | null = null

	/** Replaces Program.mbToUI for selection events. */
	static toUI: MessageBus<ToUI> | null = null

	constructor(world: World | null = null, team: Team | null = null, owner: WorldObject | null = null, id = NaN) {
		super(world, team, owner, id)

		this.name = 'Team Member ' + this.id

		this.health = 100

		this.walkingSpeed = this.maxWalkingSpeed

		this.calculateHitSets()

		this.aniAssetID = team!.characterAppearance!.animationAssetID
		this.colourAssetID = team!.characterAppearance!.colorAssetID
		this.inWaterSoundAssetID = team!.characterAppearance!.inWaterSoundAssetID
		this.hitSoundAssetID = team!.characterAppearance!.hitSoundAssetID
	}

	onSelected(): void {
		this.isSelected = true
		TeamMember.toUI?.push({ type: 'memberSelectionChanged', member: this })

		this.hasBeenSelected = true
	}

	onDeselected(): void {
		this.isSelected = false
		TeamMember.toUI?.push({ type: 'memberSelectionChanged', member: null })

		this.stopWalking()
		this.stopJumping()
	}

	fire(): Shot | null {
		if (this.health <= 0 || this.powerMultiplier <= 0) {
			this.bounceCount = 0
			return null
		}

		const shot = new TeamMember.bullet!(this.world, this.team, this)

		if (this.isGhost) shot.isGhost = true
		else this.world!.addWorldObject(shot)

		let offset = Point.polar(this.radius + shot.radius + 1, this.aim)
		offset.x *= this.facing
		shot.location = this.location.add(offset)

		offset = Point.polar(this.power * this.powerMultiplier, this.aim)
		offset.x *= this.facing

		shot.velocity = this.velocity.add(offset)
		shot.bounceCount = this.bounceCount

		this.bounceCount = 0

		return shot
	}

	startAimingUp(): void {
		this.isAimingUp = true
		this.isAimingDown = false
	}

	stopAimingUp(): void {
		this.isAimingUp = false
	}

	startAimingDown(): void {
		this.isAimingDown = true
		this.isAimingUp = false
	}

	stopAimingDown(): void {
		this.isAimingDown = false
	}

	startPoweringUp(): void {
		this.isPoweringUp = true
	}

	stopPoweringUp(): void {
		this.isPoweringUp = false
	}

	startPoweringDown(): void {
		this.isPoweringDown = true
	}

	stopPoweringDown(): void {
		this.isPoweringDown = false
	}

	stopAll(): void {
		this.isAimingUp = false
		this.isAimingDown = false
		this.isPoweringUp = false
		this.isPoweringDown = false

		this.stopWalking()
		this.stopJumping()
	}

	override notify(currentTime: number): void {
		super.notify(currentTime)

		if (this.isAimingUp) {
			this.aim -= this.aimingSpeed * this.timeDelta
			if (this.aim < -HALF_PI) {
				this.aim = -HALF_PI
			}
		} else if (this.isAimingDown) {
			this.aim += this.aimingSpeed * this.timeDelta
			if (this.aim > HALF_PI) {
				this.aim = HALF_PI
			}
		}

		if (this.isPoweringUp) {
			this.powerMultiplier += this.poweringSpeed * this.timeDelta
			if (this.powerMultiplier > 1) this.powerMultiplier = 1
		} else if (this.isPoweringDown) {
			this.powerMultiplier -= this.poweringSpeed * this.timeDelta
			if (this.powerMultiplier < 0) this.powerMultiplier = 0
		}
	}

	override canHit(object: WorldObject): boolean {
		if (!super.canHit(object)) return false
		if (object instanceof TeamMember) return false

		return true
	}

	setSpeedMultiplier(value: number): void {
		this.walkingSpeed = (this.maxWalkingSpeed / 25) * value
		if (this.walkingSpeed <= 0) this.walkingSpeed = 1
		this.walkingSpeed *= 25
	}

	override clone(c: WorldObject | null = null): WorldObject {
		if (!c) c = new TeamMember(this.world, this.team)
		const cc = super.clone(c) as TeamMember
		cc.maxWalkingSpeed = this.maxWalkingSpeed
		cc.aim = this.aim
		cc.power = this.power
		cc.powerMultiplier = this.powerMultiplier
		cc.poweringSpeed = this.poweringSpeed
		cc.bounceCount = this.bounceCount
		cc.isAimingUp = this.isAimingUp
		cc.isAimingDown = this.isAimingDown
		cc.isPoweringUp = this.isPoweringUp
		cc.isPoweringDown = this.isPoweringDown
		cc.aimingSpeed = this.aimingSpeed
		cc.isSelected = this.isSelected
		cc.aniAssetID = this.aniAssetID
		cc.colourAssetID = this.colourAssetID
		cc.hasBeenSelected = this.hasBeenSelected
		return cc
	}

	override getAssetIDs(): number[] {
		return [this.aniAssetID, this.colourAssetID, this.inWaterSoundAssetID, this.hitSoundAssetID]
	}
}
