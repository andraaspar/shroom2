import { Point } from '../game/geom/Point.ts'

/**
 * Pan/zoom camera. Replaces the WorldWindow drag/scale logic.
 * Transforms world coordinates to screen coordinates:
 *   screen = (world - center) * scale + viewport / 2
 */
export class Camera {
	/** World-space point shown at the center of the viewport. */
	center = new Point()
	/** Zoom factor. 1 = 1 world pixel per screen pixel. */
	scale = 1

	minScale = 0.15
	maxScale = 2

	viewportWidth = 0
	viewportHeight = 0

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

	panByScreenDelta(dx: number, dy: number): void {
		this.center.x -= dx / this.scale
		this.center.y -= dy / this.scale
	}

	zoomAt(screen: Point, factor: number): void {
		const before = this.screenToWorld(screen)
		this.scale = Math.min(this.maxScale, Math.max(this.minScale, this.scale * factor))
		const after = this.screenToWorld(screen)
		this.center.x += before.x - after.x
		this.center.y += before.y - after.y
	}

	/** Applies the camera transform to a 2D context. */
	applyTo(ctx: CanvasRenderingContext2D): void {
		ctx.translate(this.viewportWidth / 2, this.viewportHeight / 2)
		ctx.scale(this.scale, this.scale)
		ctx.translate(-this.center.x, -this.center.y)
	}
}
