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

export class WorldInteraction {
	isDragging = false
	dragStartWorld: Point | null = null
	dragMember: TeamMember | null = null
	dragDirection: 1 | -1 | 0 = 0
	isDraggingJumping = false

	isAiming = false
	crosshairWorld: Point | null = null

	hoveredMember: TeamMember | null = null
	hoveredShunpoIndex = -1

	walkDragStart(screenPos: Point, camera: Camera, world: World, bus?: MessageBus<ToProgram>): void {
		const worldPos = camera.screenToWorld(screenPos)
		const member = this.findDragMember(worldPos, world)
		if (!member) return

		// WalkDrag.as:56-65 — pressing an unselected same-team member selects
		// it before the drag begins.
		if (bus && !member.isSelected) {
			bus.push({ type: 'newSelectedTeamMember', member })
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

	walkDragEnd(bus: MessageBus<ToProgram>): void {
		if (!this.isDragging) return

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
	}

	crosshairMove(screenPos: Point, camera: Camera, bus: MessageBus<ToProgram>, member: TeamMember): void {
		if (member.team?.controller !== Team.CONTROLLER_HUMAN) return

		const worldPos = camera.screenToWorld(screenPos)
		this.crosshairWorld = worldPos.clone()
		this.isAiming = true

		const dx = worldPos.x - member.location.x
		const dy = worldPos.y - member.location.y

		// CrossHair.as:147-151 — facing from the sign of the cursor offset,
		// angle over the facing-mirrored vector so up-left aims up-left.
		const facing: 1 | -1 = dx > 0 ? 1 : -1
		const angle = Math.atan2(dy, dx * facing)

		// CrossHair.as:152-168 — power from radial drag distance.
		const dist = Math.sqrt(dx * dx + dy * dy)
		const power = Math.max(0, Math.min(1, (dist - member.radius) / (MAX_POWER_DISTANCE - member.radius)))

		bus.push({ type: 'newAim', angle, facing })
		bus.push({ type: 'newPowerMultiplier', value: power })
	}

	crosshairClick(bus: MessageBus<ToProgram>): void {
		bus.push({ type: 'fire1Changed', active: true })
	}

	crosshairRelease(bus: MessageBus<ToProgram>): void {
		bus.push({ type: 'fire1Changed', active: false })
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