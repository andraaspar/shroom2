export type TChild = JSX.Element | string

export type TChildren = TChild[] | TChild

/**
 * The types of values a Slot can display.
 */
export type TSlotValue = TChildren | null | undefined
