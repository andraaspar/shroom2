import type { Terrain } from './Terrain.ts'
import type { WorldForce } from './WorldForce.ts'
import type { WorldObject } from './WorldObject.ts'

/**
 * 1:1 port of com.pirkadat.logic.World.
 *
 * Fixed-timestep scheduler: objects are notified in timeToNotify order;
 * each object decides when it next wants to be notified.
 *
 * Performance note: the original re-sorts the whole object list at the top
 * of every loop iteration. That is measurably more expensive in JS than in
 * AS3 (comparator closure per comparison vs. typed Vector.sort), so this
 * port keeps the list sorted incrementally instead: the array stays sorted
 * by timeToNotify, the notified object is re-inserted at its new position,
 * and a full re-sort only happens when notify() may have mutated other
 * objects' timeToNotify (wake()) or objects were added/removed mid-step.
 * Notification order — and therefore behavior — is identical.
 */
export class World {
	terrain: Terrain | null = null

	forces: WorldForce[] = []
	objects: WorldObject[] = []

	currentTime = 0
	playhead = 0

	/** Set when timeToNotify of any object may have changed outside the scheduler. */
	private objectsSortDirty = true

	/** Called when an object is notified for the first time (replaces Program.mbToUI.newWorldObjects). */
	onNewWorldObject: ((object: WorldObject) => void) | null = null

	/** Marks the object list for re-sorting. Called when wake() or external code changes timeToNotify. */
	markObjectsSortDirty(): void {
		this.objectsSortDirty = true
	}

	execute(): void {
		this.currentTime += 0.04

		while (this.objects.length) {
			if (this.objectsSortDirty) {
				this.objects.sort(objectSorter)
				this.objectsSortDirty = false
			}
			const object = this.objects[0]!
			if (object.timeToNotify > this.currentTime) {
				this.playhead = this.currentTime
				break
			}
			if (!object.hasBeenNotified) this.onNewWorldObject?.(object)
			this.playhead = Math.max(this.playhead, object.timeToNotify)
			object.notify(this.playhead)
			if (object.hasFinishedWorking) {
				this.removeWorldObject(this.objects.indexOf(object))
			} else if (!this.objectsSortDirty) {
				// Only the notified object's timeToNotify changed: move it to
				// its new sorted position instead of re-sorting everything.
				this.objects.shift()
				this.insertSorted(object)
			}
			const generatedWorldObjects = object.generateWorldObjects()
			if (generatedWorldObjects) {
				for (const generatedWorldObject of generatedWorldObjects) {
					this.addWorldObject(generatedWorldObject)
				}
			}
		}
	}

	addWorldObject(object: WorldObject): void {
		this.objects.push(object)
		this.objectsSortDirty = true
	}

	removeWorldObject(index: number): void {
		this.objects.splice(index, 1)
	}

	checkIfSleeping(): boolean {
		for (const object of this.objects) {
			if (!object.isSleeping()) return false
		}
		return true
	}

	/** Binary-search insertion keeping objects sorted by timeToNotify. */
	private insertSorted(object: WorldObject): void {
		let lo = 0
		let hi = this.objects.length
		while (lo < hi) {
			const mid = (lo + hi) >>> 1
			if (this.objects[mid]!.timeToNotify <= object.timeToNotify) lo = mid + 1
			else hi = mid
		}
		this.objects.splice(lo, 0, object)
	}
}

function objectSorter(a: WorldObject, b: WorldObject): number {
	if (a.timeToNotify === b.timeToNotify) return 0
	else if (a.timeToNotify < b.timeToNotify) return -1
	else return 1
}
