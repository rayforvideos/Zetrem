// The deck shows its crew two ways: as tiles, one to a teammate, or as the
// board, once there are too many for tiles. Crossing that line is not an
// instant: for the length of the flip both layers stand on the deck, one
// arriving and one leaving.
export type BoardPhase = 'tiles' | 'boarding' | 'board' | 'unboarding'

// Which way a layer is going while the deck flips. The tiles already speak this
// word through their data-presence attribute; the board now speaks it too.
export type Presence = 'arriving' | 'leaving'
