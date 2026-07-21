import { WorldForce } from './WorldForce.ts'
import type { WorldObject } from './WorldObject.ts'

/** 1:1 port of com.pirkadat.logic.Gravity. */
export class Gravity extends WorldForce {
	static EFFECT_NORMAL = 400

	static effect = 400

	override applyTo(subject: WorldObject, timeDelta: number, _currentTime: number): boolean {
		subject.velocity.y += Gravity.effect * timeDelta
		return true
	}

	override clone(_c: WorldForce | null = null): WorldForce {
		return new Gravity()
	}
}
