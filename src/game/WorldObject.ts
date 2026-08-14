import { AirWalkForce } from './AirWalkForce.ts'
import { DOUBLE_PI, HALF_PI, PI, Point } from './geom/Point.ts'
import type { Team } from './Team.ts'
import type { World } from './World.ts'
import type { WorldForce } from './WorldForce.ts'

/**
 * 1:1 port of com.pirkadat.logic.WorldObject.
 *
 * Differences from the original, all mechanical:
 * - flash.geom.Point -> ./geom/Point
 * - BitmapData hit maps -> Uint8Array masks (0 = empty, 255 = solid)
 * - Program.mbToUI.newSounds -> onSoundRequest callback
 * - Team/TeamMember/SoundRequest references -> minimal interfaces/callbacks
 *   (those classes are ported later; the physics does not depend on them)
 */
export class WorldObject {
	readonly PI = PI
	readonly HALF_PI = HALF_PI
	readonly DOUBLE_PI = DOUBLE_PI

	// PHYSICAL ATTRIBUTES

	radius = 15.5

	location = new Point()
	wayPoints: Point[] = []
	wayPointsClearedTime = 0

	velocity = new Point()

	mass = 1
	bounciness = 0.2
	minVelocityForFlying = 75
	damageResistance = 500

	// PHYSICS ENGINE

	/** Cache: radius -> per-slice hit maps. */
	static hitMapSets = new Map<number, Uint8Array[]>()
	hitMapSet!: Uint8Array[]

	static hitAngleSets = new Map<number, Point[]>()
	hitAngleSet!: Point[]

	static hitMaps = new Map<number, Uint8Array>()
	hitMap!: Uint8Array

	lastHitWallAngle: Point | null = null

	lastTimeNotified = NaN
	timeDelta = NaN
	timeToNotify = 0

	stepsPerSecond = 0

	hasBeenFlying = true

	forces: WorldForce[] = []

	activeAirWalkForce: AirWalkForce | null = null

	isJumping = false
	jumpStrengthY = 300
	jumpCoolOff = 1
	lastJumpTime = -Infinity

	walkingSpeed = 150
	runningSpeedLimit = 75
	walkability = 5
	facing = 1
	isWalking = false

	stamina = 1
	staminaBurnPerPixel = 0.002
	staminaBurnPerJump = 0.25

	hasBeenNotified = false
	hasFinishedWorking = false

	// MISC

	world: World | null

	name = ''

	health = 0

	moveCount = 0

	isGhost = false
	enemyDamage = 0
	friendlyDamage = 0
	closestEnemyDistance = Infinity

	team: Team | null = null
	owner: WorldObject | null = null

	static idCounter = 0
	id: number

	inWaterSoundAssetID = 0
	hitSoundAssetID = 0

	/** Replaces Program.mbToUI.newSounds.push(new SoundRequest(...)). */
	static onSoundRequest:
		| ((assetId: number, location: Point, delay: number, volume: number) => void)
		| null = null

	constructor(world: World | null = null, team: Team | null = null, owner: WorldObject | null = null, id = NaN) {
		if (isNaN(id)) this.id = WorldObject.idCounter++
		else this.id = id
		this.world = world
		this.team = team
		this.owner = owner
		// NOTE: subclasses must call calculateHitSets() after setting radius,
		// exactly like the original (TeamMember, ShootingStar, ... do this).
	}

	notify(currentTime: number): void {
		if (this.hasFinishedWorking) return

		if (!this.hasBeenNotified) {
			this.wayPoints.push(this.location.clone())
			this.wayPointsClearedTime = currentTime
			this.hasBeenNotified = true
		} else if (this.wayPointsClearedTime + 0.04 < currentTime) {
			this.wayPoints = []
			this.wayPointsClearedTime = currentTime
		}

		if (isNaN(this.lastTimeNotified)) {
			this.lastTimeNotified = currentTime
			return
		}

		this.timeDelta = currentTime - this.lastTimeNotified
		this.lastTimeNotified = currentTime

		if (this.isWalking && this.stamina <= 0) this.stopWalking()

		this.moveCount = 0
		while (this.move()) {
			this.moveCount++
		}

		if (this.location.y > this.world!.terrain!.height) {
			this.damage(this.health)

			if (!this.isGhost && this.inWaterSoundAssetID) {
				WorldObject.onSoundRequest?.(this.inWaterSoundAssetID, this.location, 0, 1)
			}
		}

		if (this.hasFinishedWorking) return

		// Apply forces

		if (this.hasBeenFlying) {
			for (let i = this.world!.forces.length - 1; i >= 0; i--) {
				if (!this.world!.forces[i]!.applyTo(this, this.timeDelta, this.lastTimeNotified) && !this.isGhost) {
					this.world!.forces.splice(i, 1)
				}
			}

			for (let i = this.forces.length - 1; i >= 0; i--) {
				if (!this.forces[i]!.applyTo(this, this.timeDelta, this.lastTimeNotified) && !this.isGhost) {
					this.forces.splice(i, 1)
				}
			}
		}

		// Time to notify

		if (this.hasBeenFlying) {
			this.stepsPerSecond = Math.max(25, Math.abs(this.velocity.x), Math.abs(this.velocity.y))
		} else {
			if (this.isWalking) this.stepsPerSecond = this.walkingSpeed
			else this.stepsPerSecond = 25
		}

		let timeTillNotify = 1 / this.stepsPerSecond
		if (timeTillNotify >= 0.04) timeTillNotify = 0.03999
		this.timeToNotify = this.lastTimeNotified + timeTillNotify
	}

	protected move(): boolean {
		if (this.hasFinishedWorking) return false

		if (this.moveCount > 20 && this.getHitTest()) {
			while (true) {
				this.location.y--
				if (!this.getHitTest()) break
			}
		}

		if (this.testIfLanded()) {
			// Landed
			if (this.hasBeenFlying) {
				this.hasBeenFlying = false
				this.onLanded()
			}

			return this.moveOnTerrain()
		} else {
			// In the air
			if (!this.hasBeenFlying) {
				this.hasBeenFlying = true
			}

			return this.moveInAir()
		}
	}

	testIfLanded(): boolean {
		if (this.hasFinishedWorking) return true

		const justBelow = this.location.clone()
		justBelow.y += 1

		if (
			this.velocity.length <= this.minVelocityForFlying &&
			(this.hitTestObjects(justBelow) || this.hitTestTerrain(justBelow))
		) {
			return true
		}
		return false
	}

	protected moveInAir(): boolean {
		const stepVelocity = this.velocity.clone()
		stepVelocity.x *= this.timeDelta
		stepVelocity.y *= this.timeDelta

		const newLocation = this.location.add(stepVelocity)

		const objectHit = this.hitTestObjects(newLocation)

		if (objectHit) {
			return this.collideWithObject(objectHit)
		}

		if (this.hitTestTerrain(newLocation)) {
			// Hit
			return this.collideWithWall(this.calculateHitWallAngle(newLocation)!)
		}

		this.location = newLocation

		return false
	}

	protected moveOnTerrain(): boolean {
		this.velocity.x = this.velocity.y = 0

		if (this.isJumping && this.jump()) {
			return true // Switch to flying move
		}

		if (!this.isWalking) return false

		const xStep = this.facing * this.walkingSpeed * Math.min(this.timeDelta, 0.04)

		const usableFloors = this.findUsableFloors(
			this.location.x + xStep,
			this.location.y - this.walkability,
			this.location.y + this.walkability + 1,
			true,
		)

		if (!usableFloors.length) {
			// Can't walk further
			return false
		}

		if (usableFloors.length > 1) {
			// Can fall
			this.location.x += xStep
			this.velocity.x = this.walkingSpeed * this.facing
			if (this.walkingSpeed > this.runningSpeedLimit) {
				this.location.y += this.walkability
				this.velocity.y = this.walkability
			}
		} else {
			// Can walk
			this.location.x += xStep
			this.location.y = usableFloors[0]!
		}

		this.stamina -= this.staminaBurnPerPixel * this.walkingSpeed * this.timeDelta

		return false
	}

	protected jump(): boolean {
		if (this.lastJumpTime + this.jumpCoolOff > this.lastTimeNotified || this.stamina < this.staminaBurnPerJump) {
			return false
		}

		if (this.isWalking) this.velocity.x = this.walkingSpeed * this.facing
		this.velocity.y -= this.jumpStrengthY
		this.stamina -= this.staminaBurnPerJump
		this.lastJumpTime = this.lastTimeNotified

		return true
	}

	findUsableFloors(xToCheck: number, firstYToCheck: number, lastYToCheck: number, getFirstOnly: boolean): number[] {
		const results: number[] = []

		if (lastYToCheck > this.world!.terrain!.height) lastYToCheck = this.world!.terrain!.height
		let prevWasAvailable = false
		let canFall = false

		const toCheck = new Point(xToCheck, firstYToCheck)
		for (; toCheck.y <= lastYToCheck; toCheck.y++) {
			if (this.hitTestTerrain(toCheck) || this.hitTestObjects(toCheck)) {
				// Hit
				if (prevWasAvailable) {
					results.push(toCheck.y - 1)
					if (getFirstOnly) break
				}
				prevWasAvailable = false
			} else {
				// No hit
				prevWasAvailable = true
				canFall = true
			}
		}

		if (!results.length && canFall) {
			results.push(0, 0)
		}

		return results
	}

	calculateHitSets(sliceCount = 8): void {
		let mapSet = WorldObject.hitMapSets.get(this.radius)
		let angleSet = WorldObject.hitAngleSets.get(this.radius)
		if (!mapSet || !angleSet) {
			mapSet = new Array<Uint8Array>(sliceCount)
			angleSet = new Array<Point>(sliceCount)

			const sliceAngleRad = DOUBLE_PI / sliceCount
			for (let i = 0; i < sliceCount; i++) {
				mapSet[i] = drawHitMapAngle(
					this.radius,
					-PI - sliceAngleRad / 2 + i * sliceAngleRad,
					-PI - sliceAngleRad / 2 + (i + 1) * sliceAngleRad,
				)
				angleSet[i] = Point.polar(100, -PI + i * sliceAngleRad)
			}

			WorldObject.hitMapSets.set(this.radius, mapSet)
			WorldObject.hitAngleSets.set(this.radius, angleSet)
		}
		this.hitMapSet = mapSet
		this.hitAngleSet = angleSet

		let map = WorldObject.hitMaps.get(this.radius)
		if (!map) {
			map = drawHitMap(this.radius)
			WorldObject.hitMaps.set(this.radius, map)
		}
		this.hitMap = map
	}

	getHitTest(location: Point | null = null): boolean {
		if (this.hasFinishedWorking) return false

		if (!location) location = this.location

		return this.hitTestTerrain(location) || !!this.hitTestObjects(location)
	}

	protected hitTestTerrain(location: Point): boolean {
		const terrain = this.world!.terrain!
		return terrain.hitTestMap(this.hitMap, this.radius * 2, location.x - this.radius, location.y - this.radius)
	}

	protected hitTestObjects(location: Point): WorldObject | null {
		for (const object of this.world!.objects) {
			if (
				object === this ||
				object.hasFinishedWorking ||
				!this.canHit(object) ||
				!object.canHit(this)
			) {
				continue
			}

			if (Point.distance(location, object.location) < this.radius + object.radius) {
				return object
			}
		}

		return null
	}

	calculateHitWallAngle(location: Point): Point | null {
		const objectX = location.x - this.radius
		const objectY = location.y - this.radius
		let lastHitWallAngle: Point | null = null

		for (let i = 0; i < this.hitMapSet.length; i++) {
			if (this.world!.terrain!.hitTestMap(this.hitMapSet[i]!, this.radius * 2, objectX, objectY)) {
				if (lastHitWallAngle) lastHitWallAngle = lastHitWallAngle.add(this.hitAngleSet[i]!)
				else lastHitWallAngle = this.hitAngleSet[i]!
			}
		}

		return lastHitWallAngle
	}

	protected collideWithWall(lastHitWallAngle: Point): boolean {
		// NOTE: the original declares this field but never assigns it; this
		// port assigns it so the field (and its clone() branch) is meaningful.
		this.lastHitWallAngle = lastHitWallAngle
		const normalDirectionUnitVec = lastHitWallAngle
		normalDirectionUnitVec.normalize(1)

		const tangentDirectionUnitVec = new Point(-normalDirectionUnitVec.y, normalDirectionUnitVec.x) // Rotate by +90°

		const velocityOnNormal =
			normalDirectionUnitVec.x * this.velocity.x + normalDirectionUnitVec.y * this.velocity.y // Dot product
		const velocityOnTangent =
			tangentDirectionUnitVec.x * this.velocity.x + tangentDirectionUnitVec.y * this.velocity.y

		this.velocity.x =
			(-velocityOnNormal * normalDirectionUnitVec.x + velocityOnTangent * tangentDirectionUnitVec.x) *
			this.bounciness
		this.velocity.y =
			(-velocityOnNormal * normalDirectionUnitVec.y + velocityOnTangent * tangentDirectionUnitVec.y) *
			this.bounciness

		this.onCollidedWithTerrain(Math.atan2(lastHitWallAngle.y, lastHitWallAngle.x), velocityOnNormal)

		return true
	}

	protected onCollidedWithTerrain(angle: number, speed: number): void {
		const damageAmount = (speed - this.damageResistance) / 6

		if (damageAmount > 0) {
			this.damage(damageAmount)
		}

		this.wayPoints.push(this.location.clone())

		if (this.isJumping && angle > 0 && angle < PI && this.velocity.y > -this.jumpStrengthY) {
			this.jump()
		}

		if (!this.isGhost && this.hitSoundAssetID) {
			WorldObject.onSoundRequest?.(
				this.hitSoundAssetID,
				this.location,
				0,
				Math.min(1, speed / this.damageResistance),
			)
		}
	}

	canHit(object: WorldObject): boolean {
		if (this.hasFinishedWorking) return false
		if (this.isGhost !== object.isGhost) return false

		return true
	}

	protected collideWithObject(subject: WorldObject): boolean {
		const normalDirectionUnitVec = subject.location.subtract(this.location)
		normalDirectionUnitVec.normalize(1)

		const tangentDirectionUnitVec = new Point(-normalDirectionUnitVec.y, normalDirectionUnitVec.x) // Rotate by +90°

		const velocityOnNormal =
			normalDirectionUnitVec.x * this.velocity.x + normalDirectionUnitVec.y * this.velocity.y // Dot product
		const velocityOnTangent =
			tangentDirectionUnitVec.x * this.velocity.x + tangentDirectionUnitVec.y * this.velocity.y
		const velocityOnNormal2 =
			normalDirectionUnitVec.x * subject.velocity.x + normalDirectionUnitVec.y * subject.velocity.y
		const velocityOnTangent2 =
			tangentDirectionUnitVec.x * subject.velocity.x + tangentDirectionUnitVec.y * subject.velocity.y

		const newVelocityOnNormal =
			(velocityOnNormal * (this.mass - subject.mass) + 2 * subject.mass * velocityOnNormal2) /
			(this.mass + subject.mass) // 1D collision, no change in velocity on the tangent
		const newVelocityOnNormal2 =
			(velocityOnNormal2 * (subject.mass - this.mass) + 2 * this.mass * velocityOnNormal) /
			(this.mass + subject.mass)

		this.velocity.x = newVelocityOnNormal * normalDirectionUnitVec.x + velocityOnTangent * tangentDirectionUnitVec.x
		this.velocity.y = newVelocityOnNormal * normalDirectionUnitVec.y + velocityOnTangent * tangentDirectionUnitVec.y

		subject.velocity.x =
			newVelocityOnNormal2 * normalDirectionUnitVec.x + velocityOnTangent2 * tangentDirectionUnitVec.x
		subject.velocity.y =
			newVelocityOnNormal2 * normalDirectionUnitVec.y + velocityOnTangent2 * tangentDirectionUnitVec.y

		this.onCollidedWithObject(subject, Math.atan2(normalDirectionUnitVec.y, normalDirectionUnitVec.x), velocityOnNormal)

		subject.onCollidedWithObject(
			this,
			Math.atan2(-normalDirectionUnitVec.y, -normalDirectionUnitVec.x),
			velocityOnNormal,
		)
		subject.wake()

		return true
	}

	protected onCollidedWithObject(_object: WorldObject, angle: number, speed: number): void {
		const damageAmount = (speed - this.damageResistance) / 6

		if (damageAmount > 0) {
			this.damage(damageAmount)
		}

		this.wayPoints.push(this.location.clone())

		if (this.isJumping && angle > 0 && angle < PI && this.velocity.y > -this.jumpStrengthY) {
			this.jump()
		}
	}

	startWalking(facing: number): void {
		if (this.hasFinishedWorking) return

		this.facing = facing
		this.isWalking = true

		if (!this.activeAirWalkForce) {
			this.activeAirWalkForce = new AirWalkForce()
			this.forces.push(this.activeAirWalkForce)
		}
	}

	stopWalking(): void {
		if (this.hasFinishedWorking) return

		this.isWalking = false

		if (this.activeAirWalkForce) {
			this.forces.splice(this.forces.indexOf(this.activeAirWalkForce), 1)
			this.activeAirWalkForce = null
		}
	}

	startJumping(): void {
		if (this.hasFinishedWorking) return

		this.isJumping = true
	}

	stopJumping(): void {
		if (this.hasFinishedWorking) return

		this.isJumping = false
	}

	isSleeping(): boolean {
		return this.hasFinishedWorking || this.testIfLanded()
	}

	finishWorking(): void {
		if (this.hasFinishedWorking) return

		this.hasFinishedWorking = true

		this.onDeath()
	}

	generateWorldObjects(): WorldObject[] | null {
		return null
	}

	damage(value: number): void {
		// AS3 damage(value:int) coerces the argument with int() at the call
		// boundary (truncating toward zero) *before* the guards below, so
		// 0 < value < 1 deals no damage at all. Mirror that exactly.
		value = Math.trunc(value)
		if (this.hasFinishedWorking) return
		if (this.health <= 0) return
		if (value <= 0) return

		this.health -= value

		if (this.health <= 0) this.finishWorking()
	}

	protected onDeath(): void {}

	protected onLanded(): void {}

	heal(value: number): void {
		// AS3 heal(value:int) — same int truncation at the call boundary.
		value = Math.trunc(value)
		if (this.hasFinishedWorking) return

		this.health += value
	}

	/** Asset IDs needed to render/animate this object (asset phase). */
	getAssetIDs(): number[] | null {
		return null
	}

	restoreStaminaTo(value = 1): void {
		this.stamina = value
	}

	clone(c: WorldObject | null = null): WorldObject {
		if (!c) c = new WorldObject(this.world, this.team, this.owner, this.id)
		c.radius = this.radius
		c.location = this.location.clone()
		for (const vp of this.wayPoints) {
			c.wayPoints.push(vp.clone())
		}
		c.wayPointsClearedTime = this.wayPointsClearedTime
		c.velocity = this.velocity.clone()
		c.mass = this.mass
		c.bounciness = this.bounciness
		c.minVelocityForFlying = this.minVelocityForFlying
		c.damageResistance = this.damageResistance
		c.hitMapSet = this.hitMapSet
		c.hitMap = this.hitMap
		c.hitAngleSet = this.hitAngleSet
		if (this.lastHitWallAngle) c.lastHitWallAngle = this.lastHitWallAngle.clone()
		c.lastTimeNotified = this.lastTimeNotified
		c.timeDelta = this.timeDelta
		c.timeToNotify = this.timeToNotify
		c.stepsPerSecond = this.stepsPerSecond
		c.hasBeenFlying = this.hasBeenFlying
		for (const force of this.forces) {
			if (force === this.activeAirWalkForce) {
				const awf = force.clone() as AirWalkForce
				c.activeAirWalkForce = awf
				c.forces.push(awf)
			} else {
				c.forces.push(force)
			}
		}
		c.isJumping = this.isJumping
		c.jumpStrengthY = this.jumpStrengthY
		c.jumpCoolOff = this.jumpCoolOff
		c.lastJumpTime = this.lastJumpTime
		c.walkingSpeed = this.walkingSpeed
		c.runningSpeedLimit = this.runningSpeedLimit
		c.walkability = this.walkability
		c.facing = this.facing
		c.isWalking = this.isWalking
		c.stamina = this.stamina
		c.staminaBurnPerPixel = this.staminaBurnPerPixel
		c.staminaBurnPerJump = this.staminaBurnPerJump
		c.hasBeenNotified = this.hasBeenNotified
		c.hasFinishedWorking = this.hasFinishedWorking
		c.world = this.world
		c.name = this.name
		c.health = this.health
		c.moveCount = this.moveCount
		c.isGhost = this.isGhost
		c.enemyDamage = this.enemyDamage
		c.friendlyDamage = this.friendlyDamage
		c.closestEnemyDistance = this.closestEnemyDistance
		c.team = this.team
		c.owner = this.owner
		c.hitSoundAssetID = this.hitSoundAssetID
		c.inWaterSoundAssetID = this.inWaterSoundAssetID
		return c
	}

	wake(): void {
		if (this.hasFinishedWorking) this.timeToNotify = Infinity
		else this.timeToNotify = this.lastTimeNotified
		// timeToNotify changed outside the scheduler's control.
		this.world?.markObjectsSortDirty()
	}
}

// ---------------------------------------------------------------------------
// Hit map generation (BitmapData -> Uint8Array, 1:1 with the original loops)
// ---------------------------------------------------------------------------

/** Solid pixel value used by all generated masks. */
const SOLID = 255

export function drawHitMap(radius: number): Uint8Array {
	const size = radius * 2
	const hitMap = new Uint8Array(size * size)

	let pixelCenterLocationX: number
	let pixelCenterLocationY: number
	let pixelCenterDistance: number
	const outerRadiusSquared = radius * radius

	for (let pixelRow = radius; pixelRow >= -radius; pixelRow--) {
		for (let pixelColumn = -radius; pixelColumn < radius; pixelColumn++) {
			pixelCenterLocationX = pixelColumn + 0.5
			pixelCenterLocationY = pixelRow + 0.5
			pixelCenterDistance =
				pixelCenterLocationX * pixelCenterLocationX + pixelCenterLocationY * pixelCenterLocationY

			if (pixelCenterDistance > outerRadiusSquared) {
				continue
			}

			hitMap[(radius + pixelRow) * size + (radius + pixelColumn)] = SOLID
		}
	}

	return hitMap
}

export function drawHitMapDoughnut(minRadius: number, maxRadius: number): Uint8Array {
	const size = maxRadius * 2
	const hitMap = new Uint8Array(size * size)

	let pixelCenterLocationX: number
	let pixelCenterLocationY: number
	let pixelCenterDistance: number
	const innerRadiusSquared = minRadius * minRadius
	const outerRadiusSquared = maxRadius * maxRadius

	for (let pixelRow = maxRadius; pixelRow >= -maxRadius; pixelRow--) {
		for (let pixelColumn = -maxRadius; pixelColumn < maxRadius; pixelColumn++) {
			pixelCenterLocationX = pixelColumn + 0.5
			pixelCenterLocationY = pixelRow + 0.5
			pixelCenterDistance =
				pixelCenterLocationX * pixelCenterLocationX + pixelCenterLocationY * pixelCenterLocationY

			if (pixelCenterDistance > outerRadiusSquared) {
				continue
			}
			if (pixelCenterDistance < innerRadiusSquared) {
				continue
			}

			hitMap[(maxRadius + pixelRow) * size + (maxRadius + pixelColumn)] = SOLID
		}
	}

	return hitMap
}

export function drawHitMapAngle(radius: number, minAngleToCheckRad: number, maxAngleToCheckRad: number): Uint8Array {
	const size = radius * 2
	const hitMap = new Uint8Array(size * size)

	while (maxAngleToCheckRad - minAngleToCheckRad > DOUBLE_PI) {
		maxAngleToCheckRad -= DOUBLE_PI
	}

	while (minAngleToCheckRad > PI) {
		minAngleToCheckRad -= DOUBLE_PI
		maxAngleToCheckRad -= DOUBLE_PI
	}

	while (maxAngleToCheckRad < -PI) {
		minAngleToCheckRad += DOUBLE_PI
		maxAngleToCheckRad += DOUBLE_PI
	}

	let pixelCenterLocationX: number
	let pixelCenterLocationY: number
	let pixelCenterDistance: number
	let pixelCenterAngleRad: number
	const outerRadiusSquared = radius * radius

	for (let pixelRow = radius; pixelRow >= -radius; pixelRow--) {
		for (let pixelColumn = -radius; pixelColumn < radius; pixelColumn++) {
			pixelCenterLocationX = pixelColumn + 0.5
			pixelCenterLocationY = pixelRow + 0.5
			pixelCenterDistance =
				pixelCenterLocationX * pixelCenterLocationX + pixelCenterLocationY * pixelCenterLocationY

			if (pixelCenterDistance > outerRadiusSquared) {
				continue
			}

			pixelCenterAngleRad = Math.atan2(pixelCenterLocationY, pixelCenterLocationX)
			if (pixelCenterAngleRad < minAngleToCheckRad) pixelCenterAngleRad += DOUBLE_PI
			else if (pixelCenterAngleRad > maxAngleToCheckRad) pixelCenterAngleRad -= DOUBLE_PI

			if (pixelCenterAngleRad < minAngleToCheckRad || pixelCenterAngleRad > maxAngleToCheckRad) {
				continue
			}

			hitMap[(radius + pixelRow) * size + (radius + pixelColumn)] = SOLID
		}
	}

	return hitMap
}
