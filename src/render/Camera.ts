import { UI_STATE, type UIState } from '../game/events'
import { Point } from '../game/geom/Point'
import { TeamMember } from '../game/TeamMember'
import { findSelectedMember, type World } from '../game/World'
import type { WorldObject } from '../game/WorldObject'

/**
 * Pan/zoom camera. 1:1 port of WorldWindow (the original's world-camera).
 *
 * Instead of the old static pan/zoom camera (direct drag pan + cursor-anchored
 * immediate wheel zoom), this replicates WorldWindow.update() exactly:
 * eased pan/zoom, area-of-interest (AOI) follow with auto-fit zoom, edge
 * clamping, per-state waitToFollowAOI timing, playerControlsScale and the
 * original drag/wheel semantics.
 *
 * Internal state mirrors the original's screen-space model:
 *   screen = world * scale + {x, y}
 * with `center` (world point at the viewport center) derived for rendering
 * and hit-testing:
 *   center = (viewport / 2 - {x, y}) / scale
 */
export class Camera {
	/** Screen-space translation: screen = world * scale + {x, y}. */
	x = 0
	y = 0
	/** Zoom factor. 1 = 1 world pixel per screen pixel. */
	scale = 0.01

	minScale = 0.15
	maxScale = 2

	viewportWidth = 0
	viewportHeight = 0

	scaleSpeed = 16
	targetScale = 1

	state: UIState | 0 = 0

	isDragged = false
	pointerX = 0
	pointerY = 0

	dragSourceX = 0
	dragSourceY = 0
	dragContentSourceX = 0
	dragContentSourceY = 0
	dragContentSourceScale = 1

	waitToFollowAOI = 0
	playerControlsScale = false

	targetX = 0
	targetY = 0

	private aoiMinX = NaN
	private aoiMaxX = NaN
	private aoiMinY = NaN
	private aoiMaxY = NaN

	/** Objects with velocity that are candidates for the AOI (TTL in frames). */
	private interestingObjects = new Map<WorldObject, number>()

	selectedMember: TeamMember | null = null
	private selectionChangedThisFrame = false

	/** World point shown at the center of the viewport. */
	get center(): Point {
		return new Point(
			(this.viewportWidth / 2 - this.x) / this.scale,
			(this.viewportHeight / 2 - this.y) / this.scale,
		)
	}

	/**
	 * Mirrors mbToUI.notSafeToDragMember (WorldWindow.as:162): set only on the
	 * frame a member selection changes while the camera is following and the
	 * player is not dragging. The walk-drag throttles while this is set.
	 */
	notSafeToDragMember = false

	fitToViewport(width: number, height: number): void {
		this.viewportWidth = width
		this.viewportHeight = height
	}

	worldToScreen(world: Point, out = new Point()): Point {
		out.x = (world.x - this.center.x) * this.scale + this.viewportWidth / 2
		out.y = (world.y - this.center.y) * this.scale + this.viewportHeight / 2
		return out
	}

	screenToWorld(screen: Point, out = new Point()): Point {
		out.x = (screen.x - this.viewportWidth / 2) / this.scale + this.center.x
		out.y = (screen.y - this.viewportHeight / 2) / this.scale + this.center.y
		return out
	}

	/** Applies the camera transform to a 2D context. */
	applyTo(ctx: CanvasRenderingContext2D): void {
		ctx.translate(this.viewportWidth / 2, this.viewportHeight / 2)
		ctx.scale(this.scale, this.scale)
		ctx.translate(-this.center.x, -this.center.y)
	}

	// -------------------------------------------------------------------------
	// Input (WorldWindow.onMouseDown / onMouseUp / onMouseWheel)
	// -------------------------------------------------------------------------

	onMouseDown(pointerX: number, pointerY: number): void {
		this.isDragged = true
		this.pointerX = pointerX
		this.pointerY = pointerY
		this.dragSourceX = pointerX
		this.dragSourceY = pointerY
		this.dragContentSourceX = this.x
		this.dragContentSourceY = this.y
		this.dragContentSourceScale = this.scale
	}

	onMouseUp(): void {
		this.isDragged = false

		switch (this.state) {
			case UI_STATE.FOCUS:
			case UI_STATE.SHOOT:
				this.waitToFollowAOI = 25
				break
			default:
				this.waitToFollowAOI = -1
				break
		}
	}

	onMouseWheel(delta: number): void {
		const diff = 0.02 * this.targetScale
		this.targetScale += delta * diff
		if (this.targetScale < this.minScale) this.targetScale = this.minScale
		if (this.targetScale > this.maxScale) this.targetScale = this.maxScale
		this.playerControlsScale = true
	}

	/** WorldWindow.onFollowAOIRequested — resume following + re-enable auto-fit. */
	followAOI(): void {
		this.waitToFollowAOI = 0
		this.playerControlsScale = false
	}

	/** WorldWindow.onStageResized — recompute minScale from the terrain size. */
	onStageResized(terrainWidth: number, terrainHeight: number): void {
		this.minScale =
			Math.min(this.viewportWidth / terrainWidth, this.viewportHeight / terrainHeight) * 0.8
		if (this.targetScale < this.minScale) this.targetScale = this.minScale
		if (this.scale < this.minScale) this.applyScale(this.minScale)
	}

	// -------------------------------------------------------------------------
	// Per-frame update (port of WorldWindow.update)
	// -------------------------------------------------------------------------

	update(state: UIState, world: World): void {
		const terrain = world.terrain
		if (!terrain) return

		if (state !== this.state) {
			this.state = state
			if (this.waitToFollowAOI < 0) this.waitToFollowAOI = 0
			this.playerControlsScale = false
			this.scaleSpeed =
				state === UI_STATE.OVERVIEW ||
				state === UI_STATE.FOCUS ||
				state === UI_STATE.SHOOT
					? 16
					: 8
		}

		this.selectionChangedThisFrame = false
		this.notSafeToDragMember = false
		const selectedMember = findSelectedMember(world)
		if (selectedMember !== this.selectedMember) {
			if (this.selectedMember && this.selectedMember.hasFinishedWorking) {
				this.waitToFollowAOI = 25
			}
			this.selectedMember = selectedMember
			this.selectionChangedThisFrame = true
			this.notSafeToDragMember = !this.isDragged && this.waitToFollowAOI === 0
		}

		const nextScale = this.scale + (this.targetScale - this.scale) / this.scaleSpeed

		if (this.isDragged) {
			const scaleDiff = nextScale / this.dragContentSourceScale
			const dragDiffX = this.pointerX - this.dragSourceX * scaleDiff
			const dragDiffY = this.pointerY - this.dragSourceY * scaleDiff

			this.x = this.dragContentSourceX * scaleDiff + dragDiffX
			this.y = this.dragContentSourceY * scaleDiff + dragDiffY

			this.correctPositions(terrain.width, terrain.height)
		} else {
			if (this.waitToFollowAOI === 0) {
				this.calculateAreaOfInterest(world)

				const aoiXRadius = (this.aoiMaxX - this.aoiMinX) / 2
				const aoiYRadius = (this.aoiMaxY - this.aoiMinY) / 2
				const aoiXMiddle = this.aoiMinX + aoiXRadius
				const aoiYMiddle = this.aoiMinY + aoiYRadius

				this.targetX = -(aoiXMiddle * this.scale - this.viewportWidth / 2)
				this.targetY = -(aoiYMiddle * this.scale - this.viewportHeight / 2)

				this.x += (this.targetX - this.x) / 8
				this.y += (this.targetY - this.y) / 8

				this.correctPositions(terrain.width, terrain.height)

				if (!this.playerControlsScale) {
					this.targetScale =
						Math.min(
							this.viewportWidth / 2 / aoiXRadius,
							this.viewportHeight / 2 / aoiYRadius,
						) * 0.8
					if (this.targetScale < this.minScale) this.targetScale = this.minScale
					if (this.targetScale > 1) this.targetScale = 1
				}
			} else if (this.waitToFollowAOI > 0) {
				this.waitToFollowAOI--
				if (this.waitToFollowAOI === 0) this.playerControlsScale = false
			} else {
				// waitToFollowAOI < 0 — keep the selected member on screen.
				const member = this.selectedMember
				if (
					member &&
					(member.hasBeenFlying ||
						member.isWalking ||
						this.selectionChangedThisFrame) &&
					(member.location.x - member.radius * 2 < -this.x / this.scale ||
						member.location.x + member.radius * 2 >
							-this.x / this.scale + this.viewportWidth / this.scale ||
						member.location.y - member.radius * 2 < -this.y / this.scale ||
						member.location.y + member.radius * 2 >
							-this.y / this.scale + this.viewportHeight / this.scale)
				) {
					this.waitToFollowAOI = 0
				}
			}
		}

		this.applyScale(nextScale)
	}

	// -------------------------------------------------------------------------
	// Ported helpers
	// -------------------------------------------------------------------------

	/**
	 * WorldWindow.correctPositions, expressed with a half-viewport background
	 * margin on each side of the terrain (WorldAppearance.onStageResized).
	 */
	private correctPositions(terrainWidth: number, terrainHeight: number): void {
		const screenLeft = this.x - this.viewportWidth / 2
		if (screenLeft > 0) {
			this.x = this.viewportWidth / 2
		} else {
			const screenRight = this.x + terrainWidth * this.scale + this.viewportWidth / 2
			if (screenRight < this.viewportWidth) {
				this.x = this.viewportWidth / 2 - terrainWidth * this.scale
			}
		}

		const screenTop = this.y - this.viewportHeight / 2
		if (screenTop > 0) {
			this.y = this.viewportHeight / 2
		} else {
			const screenBottom = this.y + terrainHeight * this.scale + this.viewportHeight / 2
			if (screenBottom < this.viewportHeight) {
				this.y = this.viewportHeight / 2 - terrainHeight * this.scale
			}
		}
	}

	/** WorldWindow.applyScale — zoom around the viewport center. */
	private applyScale(scale: number): void {
		const centerPointX = this.viewportWidth / 2 - this.x
		const centerPointY = this.viewportHeight / 2 - this.y
		this.x = this.viewportWidth / 2 - centerPointX * (scale / this.scale)
		this.y = this.viewportHeight / 2 - centerPointY * (scale / this.scale)
		this.scale = scale
	}

	/** WorldWindow.calculateAreaOfInterest. */
	private calculateAreaOfInterest(world: World): void {
		const terrain = world.terrain!

		this.aoiMinX = NaN
		this.aoiMaxX = NaN
		this.aoiMinY = NaN
		this.aoiMaxY = NaN

		let found = false
		for (const object of world.objects) {
			if (this.selectedMember && object === this.selectedMember) {
				this.aoiMinX = object.location.x
				this.aoiMaxX = object.location.x
				this.aoiMinY = object.location.y
				this.aoiMaxY = object.location.y
				found = true
			}

			if (object.velocity.x || object.velocity.y) {
				this.interestingObjects.set(object, 25)
			}
		}

		for (const [object, ttl] of this.interestingObjects) {
			if (!found) {
				if (isNaN(this.aoiMinX)) {
					this.aoiMinX = object.location.x
					this.aoiMaxX = object.location.x
					this.aoiMinY = object.location.y
					this.aoiMaxY = object.location.y
				} else {
					this.aoiMinX = Math.max(0, Math.min(this.aoiMinX, object.location.x))
					this.aoiMaxX = Math.min(terrain.width, Math.max(this.aoiMaxX, object.location.x))
					this.aoiMinY = Math.max(0, Math.min(this.aoiMinY, object.location.y))
					this.aoiMaxY = Math.min(terrain.height, Math.max(this.aoiMaxY, object.location.y))
				}
			}

			const newTtl = ttl - 1
			if (newTtl < 0) this.interestingObjects.delete(object)
			else this.interestingObjects.set(object, newTtl)
		}

		if (!isNaN(this.aoiMinX)) return

		for (const object of world.objects) {
			if (!(object instanceof TeamMember)) continue

			if (isNaN(this.aoiMinX)) {
				this.aoiMinX = object.location.x
				this.aoiMaxX = object.location.x
				this.aoiMinY = object.location.y
				this.aoiMaxY = object.location.y
			} else {
				this.aoiMinX = Math.max(0, Math.min(this.aoiMinX, object.location.x))
				this.aoiMaxX = Math.min(terrain.width, Math.max(this.aoiMaxX, object.location.x))
				this.aoiMinY = Math.max(0, Math.min(this.aoiMinY, object.location.y))
				this.aoiMaxY = Math.min(terrain.height, Math.max(this.aoiMaxY, object.location.y))
			}
		}

		if (!isNaN(this.aoiMinX)) return

		this.aoiMinX = 0
		this.aoiMaxX = terrain.width
		this.aoiMinY = 0
		this.aoiMaxY = terrain.height
	}
}
