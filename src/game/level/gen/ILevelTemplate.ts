import { Point } from '../../geom/Point.ts'

/** 1:1 port of com.pirkadat.logic.level.gen.ILevelTemplate. */
export interface ILevelTemplate {
	getDimensions(): Point
	getData(): string[]
	getTranslate(): string
}
