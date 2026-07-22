import type { Game } from '../Game.ts'
import { ShootRound } from './ShootRound.ts'

/** 1:1 port of com.pirkadat.logic.DoughnutRound. */
export class DoughnutRound extends ShootRound {
	constructor(game: Game) {
		super(game)

		this.type = ShootRound.TYPE_DOUGHNUT
	}

	override getName(): string {
		return 'Doughnut Round'
	}

	override getHelpSectionID(): string {
		return '#doughnut_round'
	}
}
