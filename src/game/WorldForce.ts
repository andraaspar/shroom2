import type { WorldObject } from './WorldObject.ts'

/** 1:1 port of com.pirkadat.logic.WorldForce. */
export class WorldForce {
	/**
	 * Applies the force to the subject. Returns false when the force is
	 * exhausted and should be removed from the force list.
	 */
	applyTo(_subject: WorldObject, _timeDelta: number, _currentTime: number): boolean {
		// To be overridden.
		return true
	}

	clone(_c: WorldForce | null = null): WorldForce {
		return new WorldForce()
	}
}
