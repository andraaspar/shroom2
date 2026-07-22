import { Point } from '../../geom/Point.ts'
import type { ILevelTemplate } from './ILevelTemplate.ts'

/** 1:1 port of com.pirkadat.logic.level.gen.Template08 (pure data). */
export class Template08 implements ILevelTemplate {
	getData(): string[] {
		return [
			'581.3748,1905.7918 565.76742,789.86434 1018.3814,532.34262 1022.2832,235.80246 241.91434,298.23197 171.68115,555.75369 417.49734,801.56988 374.57705,1913.5955',
			'2481.5729,1874.5771 2282.5789,895.21414 1837.7686,645.49611 1806.5539,489.42234 2661.0578,243.60615 2766.4076,528.44078 2458.1619,895.21414 2758.6039,2022.8471',
			'1525.6211,1016.1713 1474.8972,1160.5396 1677.7931,1289.3004 1896.2963,1129.3248',
			'1002.774,848.39201 1272.0012,969.34918 967.65738,1098.1101',
		]
	}

	getTranslate(): string {
		return '0,0'
	}

	getDimensions(): Point {
		return new Point(3000, 1500)
	}
}
