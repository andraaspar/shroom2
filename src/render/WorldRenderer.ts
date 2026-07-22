import type { Terrain } from '../game/Terrain.ts'
import { TeamMember } from '../game/TeamMember.ts'
import type { World } from '../game/World.ts'
import type { WorldObject } from '../game/WorldObject.ts'
import type { Camera } from './Camera.ts'

/**
 * Draws the World state to a canvas each frame.
 * Replaces WorldWindow + WorldAppearance + WorldObjectAppearance.
 *
 * Terrain is rendered through an offscreen canvas that is only re-uploaded
 * when the terrain mask changes (Terrain.isDirty — deformable terrain).
 */
export class WorldRenderer {
	private terrainCanvas: HTMLCanvasElement | null = null
	private terrainCtx: CanvasRenderingContext2D | null = null
	private terrainImageData: ImageData | null = null

	render(ctx: CanvasRenderingContext2D, world: World, camera: Camera): void {
		ctx.save()
		camera.applyTo(ctx)

		if (world.terrain) {
			this.renderTerrain(ctx, world.terrain)
		}

		for (const object of world.objects) {
			if (!object.hasBeenNotified) continue
			this.renderObject(ctx, object)
		}

		ctx.restore()
	}

	private renderTerrain(ctx: CanvasRenderingContext2D, terrain: Terrain): void {
		if (
			!this.terrainCanvas ||
			this.terrainCanvas.width !== terrain.width ||
			this.terrainCanvas.height !== terrain.height
		) {
			this.terrainCanvas = document.createElement('canvas')
			this.terrainCanvas.width = terrain.width
			this.terrainCanvas.height = terrain.height
			this.terrainCtx = this.terrainCanvas.getContext('2d')!
			this.terrainImageData = this.terrainCtx.createImageData(terrain.width, terrain.height)
			terrain.isDirty = true
		}

		if (terrain.isDirty) {
			const pixels = this.terrainImageData!.data
			const mask = terrain.data
			for (let i = 0; i < mask.length; i++) {
				const p = i * 4
				if (mask[i]! >= 128) {
					// Placeholder terrain color until assets/level painting are ported.
					pixels[p] = 0x6b
					pixels[p + 1] = 0x4a
					pixels[p + 2] = 0x2b
					pixels[p + 3] = 0xff
				} else {
					pixels[p + 3] = 0
				}
			}
			this.terrainCtx!.putImageData(this.terrainImageData!, 0, 0)
			terrain.isDirty = false
		}

		ctx.drawImage(this.terrainCanvas, 0, 0)
	}

	private renderObject(ctx: CanvasRenderingContext2D, object: WorldObject): void {
		// Placeholder: draw the hit circle. Appearance classes (bitmaps,
		// animations) replace this once assets are ported. Team members get
		// their team color; shots get a per-class placeholder color.
		ctx.beginPath()
		ctx.arc(object.location.x, object.location.y, object.radius, 0, Math.PI * 2)
		ctx.fillStyle = this.colorFor(object)
		ctx.fill()

		if (object instanceof TeamMember && object.isSelected) {
			ctx.strokeStyle = '#ffffff'
			ctx.lineWidth = 2 / (ctx.getTransform().a || 1)
			ctx.stroke()
		}
	}

	private colorFor(object: WorldObject): string {
		if (object instanceof TeamMember) {
			const color = object.team?.characterAppearance?.color ?? 0xff99cc
			return '#' + color.toString(16).padStart(6, '0')
		}
		// Shots and other objects.
		const name = object.constructor.name
		return WorldRenderer.objectColors.get(name) ?? '#ff99cc'
	}

	private static objectColors = new Map<string, string>([
		['ShootingStar', '#ffe066'],
		['Doughnut', '#e070ff'],
		['TeslaBall', '#66ccff'],
		['DawnBall', '#ffaa33'],
		['WorldObject', '#ff99cc'],
	])
}
