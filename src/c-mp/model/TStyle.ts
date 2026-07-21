export type TStyle = TStyleValue | (() => TStyleValue)

export type TStyleValue = Partial<CSSStyleDeclaration> & {
	[k: `--${string}`]: string
}
