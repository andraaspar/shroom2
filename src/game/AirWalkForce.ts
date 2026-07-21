import { WorldForce } from './WorldForce.ts'
import type { WorldObject } from './WorldObject.ts'

/** 1:1 port of com.pirkadat.logic.AirWalkForce. */
export class AirWalkForce extends WorldForce {
	override applyTo(subject: WorldObject, timeDelta: number, _currentTime: number): boolean {
		if (subject.velocity.x * subject.facing < 0 || Math.abs(subject.velocity.x) < subject.walkingSpeed) {
			subject.velocity.x += subject.walkingSpeed * 2 * subject.facing * timeDelta
		}

		return true
	}

	override clone(_c: WorldForce | null = null): WorldForce {
		return new AirWalkForce()
	}
}
