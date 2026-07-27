import { TeamMember } from '../game/TeamMember'
import type { Camera } from '../render/Camera'
import type { World } from '../game/World'
import type { WorldInteraction } from './WorldInteraction'
import type { UIState } from '../game/events'
import { UI_STATE } from '../game/events'
import type { Point } from '../game/geom/Point'

const CROSSHAIR_RADIUS = 12
const SHUNPO_RADIUS = 10

export class WorldInteractionRenderer {
	render(
		ctx: CanvasRenderingContext2D,
		world: World,
		camera: Camera,
		interaction: WorldInteraction,
		uiStateVal: UIState,
		shunpoOptions: Point[],
	): void {
		const selectedMember = this.findSelectedMember(world)

		ctx.save()
		camera.applyTo(ctx)

		if (uiStateVal === UI_STATE.AIM && interaction.isAiming && interaction.crosshairWorld && selectedMember) {
			this.renderCrosshair(ctx, selectedMember, interaction.crosshairWorld, selectedMember.powerMultiplier)
		}

		if (uiStateVal === UI_STATE.MOVE && interaction.isDragging && interaction.dragMember && interaction.dragDirection !== 0) {
			this.renderWalkArrow(ctx, interaction.dragMember, interaction.dragDirection)
		}

		if (uiStateVal === UI_STATE.SHUNPO && selectedMember) {
			this.renderShunpoOptions(ctx, selectedMember, shunpoOptions, interaction.hoveredShunpoIndex)
		}

		if (interaction.hoveredMember && interaction.hoveredMember !== selectedMember) {
			this.renderHoverGlow(ctx, interaction.hoveredMember)
		}

		ctx.restore()
	}

	private findSelectedMember(world: World): TeamMember | null {
		for (const object of world.objects) {
			if (object instanceof TeamMember && object.isSelected && object.health > 0) return object
		}
		return null
	}

	private renderCrosshair(
		ctx: CanvasRenderingContext2D,
		member: TeamMember,
		crosshairWorld: Point,
		powerMultiplier: number,
	): void {
		ctx.save()

		ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'
		ctx.lineWidth = 1.5
		ctx.setLineDash([4, 4])
		ctx.beginPath()
		ctx.moveTo(member.location.x, member.location.y)
		ctx.lineTo(crosshairWorld.x, crosshairWorld.y)
		ctx.stroke()
		ctx.setLineDash([])

		ctx.strokeStyle = '#ffffff'
		ctx.lineWidth = 1.5
		ctx.beginPath()
		ctx.arc(crosshairWorld.x, crosshairWorld.y, CROSSHAIR_RADIUS, 0, Math.PI * 2)
		ctx.stroke()

		ctx.beginPath()
		ctx.moveTo(crosshairWorld.x - CROSSHAIR_RADIUS, crosshairWorld.y)
		ctx.lineTo(crosshairWorld.x + CROSSHAIR_RADIUS, crosshairWorld.y)
		ctx.moveTo(crosshairWorld.x, crosshairWorld.y - CROSSHAIR_RADIUS)
		ctx.lineTo(crosshairWorld.x, crosshairWorld.y + CROSSHAIR_RADIUS)
		ctx.stroke()

		if (powerMultiplier > 0) {
			const aimAngle = member.aim * member.facing
			const arcRadius = member.radius + 6
			const startAngle = aimAngle
			const endAngle = aimAngle + powerMultiplier * Math.PI

			ctx.strokeStyle = 'rgba(255, 100, 50, 0.8)'
			ctx.lineWidth = 3
			ctx.beginPath()
			ctx.arc(member.location.x, member.location.y, arcRadius, startAngle, endAngle)
			ctx.stroke()
		}

		ctx.restore()
	}

	private renderWalkArrow(ctx: CanvasRenderingContext2D, member: TeamMember, direction: 1 | -1): void {
		ctx.save()

		const arrowLength = 40
		const arrowWidth = 6
		const startX = member.location.x
		const startY = member.location.y - member.radius - 4
		const endX = startX + direction * arrowLength

		ctx.strokeStyle = '#66ccff'
		ctx.lineWidth = 2.5
		ctx.beginPath()
		ctx.moveTo(startX, startY)
		ctx.lineTo(endX, startY)
		ctx.stroke()

		ctx.beginPath()
		ctx.moveTo(endX, startY)
		ctx.lineTo(endX - direction * arrowWidth, startY - arrowWidth)
		ctx.lineTo(endX - direction * arrowWidth, startY + arrowWidth)
		ctx.closePath()
		ctx.fillStyle = '#66ccff'
		ctx.fill()

		ctx.restore()
	}

	private renderShunpoOptions(
		ctx: CanvasRenderingContext2D,
		member: TeamMember,
		options: Point[],
		hoveredIndex: number,
	): void {
		ctx.save()

		for (let i = 0; i < options.length; i++) {
			const option = options[i]!
			const worldPos = member.location.add(option)
			const isHovered = i === hoveredIndex

			ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
			ctx.lineWidth = 1.5
			ctx.beginPath()
			ctx.arc(worldPos.x, worldPos.y, SHUNPO_RADIUS, 0, Math.PI * 2)
			ctx.stroke()

			if (isHovered) {
				ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
				ctx.fill()
			}
		}

		ctx.restore()
	}

	private renderHoverGlow(ctx: CanvasRenderingContext2D, member: TeamMember): void {
		ctx.save()

		ctx.strokeStyle = 'rgba(255, 255, 100, 0.5)'
		ctx.lineWidth = 3
		ctx.beginPath()
		ctx.arc(member.location.x, member.location.y, member.radius * 1.5, 0, Math.PI * 2)
		ctx.stroke()

		ctx.restore()
	}
}