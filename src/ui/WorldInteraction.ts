import { Point } from '../game/geom/Point'
import { Team } from '../game/Team'
import { TeamMember } from '../game/TeamMember'
import type { Camera } from '../render/Camera'
import type { MessageBus, ToProgram } from '../game/events'
import type { World } from '../game/World'

const DRAG_THRESHOLD = 5
/** WalkDrag.as:121 — full power at this many px past the member. */
const WALK_SPEED_ZONE = 25
/** CrossHair.as:21 — full power at this many px past the member. */
const MAX_POWER_DISTANCE = 100
/** CrossHair cross grab radius, in device pixels (the cross is a TrueSize overlay). */
const CROSSHAIR_GRAB_RADIUS = 22

export class WorldInteraction {
	isDragging = false
	dragStartWorld: Point | null = null
	dragMember: TeamMember | null = null
	dragDirection: 1 | -1 | 0 = 0
	isDraggingJumping = false

	/** Frame counter for the drag; mirrors WalkDrag.dragTime (WalkDrag.as:22). */
	dragTime = 0

	isAiming = false
	crosshairWorld: Point | null = null
	/** True while the cross is held down with the cursor (CrossHair.crossPressed/crossDrag). */
	isCrosshairDragging = false
	crossDragOffsetX = 0
	crossDragOffsetY = 0
	crosshairMember: TeamMember | null = null

	hoveredMember: TeamMember | null = null
	hoveredShunpoIndex = -1

	walkDragStart(screenPos: Point, camera: Camera, world: World, bus?: MessageBus<ToProgram>): void {
		const worldPos = camera.screenToWorld(screenPos)
		const member = this.findDragMember(worldPos, world)
		if (!member) return

		// WalkDrag.as:56-65 — pressing an unselected same-team member selects
		// it before the drag begins; dragTime 12 delays the follow click release.
		if (bus && !member.isSelected) {
			bus.push({ type: 'newSelectedTeamMember', member })
			this.dragTime = 12
		} else {
			this.dragTime = 0
		}

		this.isDragging = true
		this.dragStartWorld = worldPos.clone()
		this.dragMember = member
		this.dragDirection = 0
		this.isDraggingJumping = false
	}

	private findDragMember(worldPos: Point, world: World): TeamMember | null {
		for (const object of world.objects) {
			if (!(object instanceof TeamMember) || object.health <= 0) continue
			if (!object.team?.isSelected) continue
			if (Point.distance(worldPos, object.location) <= object.radius * 1.5) return object
		}
		return null
	}

	walkDragMove(screenPos: Point, camera: Camera, bus: MessageBus<ToProgram>): void {
		if (!this.isDragging || !this.dragStartWorld || !this.dragMember) return

		// WalkDrag.as:108-117 — while the camera is following, throttle the
		// drag so an immediate press after a retarget doesn't move the member.
		if (camera.notSafeToDragMember) this.dragTime = -12
		this.dragTime++
		if (this.dragTime < 0) return

		const worldPos = camera.screenToWorld(screenPos)
		const deltaX = worldPos.x - this.dragStartWorld.x
		const absDelta = Math.abs(deltaX)

		if (absDelta > DRAG_THRESHOLD) {
			const newDirection: 1 | -1 = deltaX > 0 ? 1 : -1

			if (newDirection !== this.dragDirection) {
				if (this.dragDirection === 1) bus.push({ type: 'rightChanged', active: false })
				else if (this.dragDirection === -1) bus.push({ type: 'leftChanged', active: false })

				if (newDirection === 1) bus.push({ type: 'rightChanged', active: true })
				else bus.push({ type: 'leftChanged', active: true })

				this.dragDirection = newDirection
			}

			// WalkDrag.as:121 — newWalkingSpeedMultiplier is a [0,1] multiplier,
			// never an absolute speed.
			const speed = Math.max(
				0,
				Math.min(1, (absDelta - this.dragMember.radius) / WALK_SPEED_ZONE),
			)
			bus.push({ type: 'newWalkingSpeedMultiplier', value: speed })
		} else {
			if (this.dragDirection !== 0) {
				if (this.dragDirection === 1) bus.push({ type: 'rightChanged', active: false })
				else bus.push({ type: 'leftChanged', active: false })
				this.dragDirection = 0
			}
			bus.push({ type: 'newWalkingSpeedMultiplier', value: 0 })
		}

		// WalkDrag.as:157-164 — cursor above-and-away from the member jumps.
		const relX = worldPos.x - this.dragMember.location.x
		const relY = worldPos.y - this.dragMember.location.y
		const distFromMember = Math.sqrt(relX * relX + relY * relY)
		const isJumping = distFromMember > this.dragMember.radius * 2 && relY < -Math.abs(relX)
		if (isJumping !== this.isDraggingJumping) {
			bus.push({ type: 'upChanged', active: isJumping })
			this.isDraggingJumping = isJumping
		}
	}

	walkDragEnd(bus: MessageBus<ToProgram>, camera?: Camera): void {
		if (!this.isDragging) return

		// WalkDrag.as:98-104 — a short click on the member re-requests camera
		// follow (recenter on the member).
		if (camera && this.dragTime < 12) camera.followAOI()

		if (this.dragDirection === 1) bus.push({ type: 'rightChanged', active: false })
		else if (this.dragDirection === -1) bus.push({ type: 'leftChanged', active: false })
		if (this.isDraggingJumping) {
			bus.push({ type: 'upChanged', active: false })
			this.isDraggingJumping = false
		}

		this.isDragging = false
		this.dragStartWorld = null
		this.dragMember = null
		this.dragDirection = 0
		this.dragTime = 0
	}

	/** Keep the crosshair pinned at the member's current aim/strength when idle. */
	syncCrosshair(member: TeamMember): void {
		if (this.isCrosshairDragging) return
		this.showCrosshair(member)
	}

	showCrosshair(member: TeamMember): void {
		this.crosshairMember = member
		this.isAiming = true
		this.crosshairWorld = this.homeCrossWorld(member)
	}

	hideCrosshair(): void {
		this.isAiming = false
		this.crosshairWorld = null
		this.crosshairMember = null
		this.isCrosshairDragging = false
	}

	/** CrossHair.setAngleAndPower — the cross position for the member's aim/power. */
	private homeCrossWorld(member: TeamMember): Point {
		const dist = member.radius + member.powerMultiplier * (MAX_POWER_DISTANCE - member.radius)
		const p = Point.polar(dist, member.aim)
		p.x *= member.facing
		return member.location.add(p)
	}

	/** CrossHair.crossPressed — grab the cross to start aiming; returns true if grabbed. */
	crosshairPress(screenPos: Point, camera: Camera, member: TeamMember): boolean {
		if (member.team?.controller !== Team.CONTROLLER_HUMAN) return false

		if (this.crosshairMember !== member || !this.crosshairWorld) this.showCrosshair(member)

		const cross = this.crosshairWorld!
		const crossScreen = camera.worldToScreen(cross)
		const dx = screenPos.x - crossScreen.x
		const dy = screenPos.y - crossScreen.y
		if (dx * dx + dy * dy > CROSSHAIR_GRAB_RADIUS * CROSSHAIR_GRAB_RADIUS) return false

		const cursorWorld = camera.screenToWorld(screenPos)
		this.crossDragOffsetX = cross.x - cursorWorld.x
		this.crossDragOffsetY = cross.y - cursorWorld.y
		this.isCrosshairDragging = true
		return true
	}

	/** CrossHair.crossDrag — move the grabbed cross and publish aim/strength. */
	crosshairDrag(screenPos: Point, camera: Camera, bus: MessageBus<ToProgram>, member: TeamMember): void {
		if (!this.isCrosshairDragging) return
		if (member.team?.controller !== Team.CONTROLLER_HUMAN) return

		const cursorWorld = camera.screenToWorld(screenPos)
		const result = this.resolveCross(
			cursorWorld.x + this.crossDragOffsetX,
			cursorWorld.y + this.crossDragOffsetY,
			member,
		)
		this.crosshairWorld = new Point(result.x, result.y)
		this.crosshairMember = member
		this.isAiming = true

		bus.push({ type: 'newAim', angle: result.angle, facing: result.facing })
		bus.push({ type: 'newPowerMultiplier', value: result.power })
	}

	/** CrossHair.crossReleased — finalize the aim/strength at the released position. */
	crosshairReleaseDrag(): void {
		this.isCrosshairDragging = false
	}

	/** Resolves the clamped cross position for a raw target point around the member. */
	private resolveCross(crossX: number, crossY: number, member: TeamMember) {
		const dx = crossX - member.location.x
		const dy = crossY - member.location.y
		const facing: 1 | -1 = dx > 0 ? 1 : -1
		const angle = Math.atan2(dy, dx * facing)
		let dist = Math.sqrt(dx * dx + dy * dy)
		let power: number
		if (dist < member.radius) {
			dist = member.radius
			power = 0
		} else {
			power = Math.max(0, Math.min(1, (dist - member.radius) / (MAX_POWER_DISTANCE - member.radius)))
		}
		const p = Point.polar(dist, angle)
		p.x *= facing
		return {
			x: member.location.x + p.x,
			y: member.location.y + p.y,
			angle,
			facing,
			power,
		}
	}

	hitTestMember(screenPos: Point, camera: Camera, world: World): TeamMember | null {
		const worldPos = camera.screenToWorld(screenPos)

		for (const object of world.objects) {
			if (!(object instanceof TeamMember) || object.health <= 0) continue
			if (Point.distance(worldPos, object.location) <= object.radius * 1.5) {
				return object
			}
		}
		return null
	}

	hitTestShunpoOptionIndex(
		screenPos: Point,
		camera: Camera,
		shunpoOptions: Point[],
		member: TeamMember | null,
	): number {
		if (!member) return -1

		const worldPos = camera.screenToWorld(screenPos)
		const hitRadius = 15
		const memberLocation = member.location

		// Options are relative offsets to the selected member; hit-test against
		// the absolute world position (member.location + option).
		for (let i = 0; i < shunpoOptions.length; i++) {
			const option = shunpoOptions[i]!
			if (Point.distance(worldPos, memberLocation.add(option)) <= hitRadius) return i
		}
		return -1
	}

	hitTestShunpoOption(
		screenPos: Point,
		camera: Camera,
		shunpoOptions: Point[],
		member: TeamMember | null,
	): Point | null {
		const idx = this.hitTestShunpoOptionIndex(screenPos, camera, shunpoOptions, member)
		return idx >= 0 ? shunpoOptions[idx]! : null
	}
}