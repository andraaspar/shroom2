import { Point } from '../game/geom/Point'
import { TeamMember } from '../game/TeamMember'
import type { Camera } from '../render/Camera'
import type { MessageBus, ToProgram } from '../game/events'
import type { World } from '../game/World'

const HALF_PI = Math.PI / 2
const DRAG_THRESHOLD = 5
const MAX_DRAG_DISTANCE = 300
const MAX_POWER_DISTANCE = 500

export class WorldInteraction {
	isDragging = false
	dragStartWorld: Point | null = null
	dragMember: TeamMember | null = null
	dragDirection: 1 | -1 | 0 = 0

	isAiming = false
	crosshairWorld: Point | null = null

	hoveredMember: TeamMember | null = null
	hoveredShunpoIndex = -1

	walkDragStart(screenPos: Point, camera: Camera, world: World): void {
		const worldPos = camera.screenToWorld(screenPos)
		const member = this.findDragMember(worldPos, world)
		if (!member) return

		this.isDragging = true
		this.dragStartWorld = worldPos.clone()
		this.dragMember = member
		this.dragDirection = 0
	}

	private findDragMember(worldPos: Point, world: World): TeamMember | null {
		for (const object of world.objects) {
			if (!(object instanceof TeamMember) || !object.isSelected) continue
			if (object.health <= 0) continue
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

			const speed = Math.min(absDelta / MAX_DRAG_DISTANCE, 1) * this.dragMember.maxWalkingSpeed
			bus.push({ type: 'newWalkingSpeedMultiplier', value: speed })
		} else {
			if (this.dragDirection !== 0) {
				if (this.dragDirection === 1) bus.push({ type: 'rightChanged', active: false })
				else bus.push({ type: 'leftChanged', active: false })
				this.dragDirection = 0
			}
			bus.push({ type: 'newWalkingSpeedMultiplier', value: 0 })
		}
	}

	walkDragEnd(bus: MessageBus<ToProgram>): void {
		if (!this.isDragging) return

		if (this.dragDirection === 1) bus.push({ type: 'rightChanged', active: false })
		else if (this.dragDirection === -1) bus.push({ type: 'leftChanged', active: false })

		this.isDragging = false
		this.dragStartWorld = null
		this.dragMember = null
		this.dragDirection = 0
	}

	crosshairMove(screenPos: Point, camera: Camera, bus: MessageBus<ToProgram>, member: TeamMember): void {
		const worldPos = camera.screenToWorld(screenPos)
		this.crosshairWorld = worldPos.clone()
		this.isAiming = true

		const dx = worldPos.x - member.location.x
		const dy = worldPos.y - member.location.y
		let angle = Math.atan2(dy, dx) * member.facing
		angle = Math.max(-HALF_PI, Math.min(HALF_PI, angle))
		const facing: 1 | -1 = worldPos.x < member.location.x ? -1 : 1

		const distance = Point.distance(worldPos, member.location)
		const power = Math.min(distance / MAX_POWER_DISTANCE, 1)

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

	hitTestShunpoOptionIndex(screenPos: Point, camera: Camera, shunpoOptions: Point[]): number {
		const worldPos = camera.screenToWorld(screenPos)
		const hitRadius = 15

		for (let i = 0; i < shunpoOptions.length; i++) {
			if (Point.distance(worldPos, shunpoOptions[i]!) <= hitRadius) return i
		}
		return -1
	}

	hitTestShunpoOption(screenPos: Point, camera: Camera, shunpoOptions: Point[]): Point | null {
		const idx = this.hitTestShunpoOptionIndex(screenPos, camera, shunpoOptions)
		return idx >= 0 ? shunpoOptions[idx]! : null
	}
}