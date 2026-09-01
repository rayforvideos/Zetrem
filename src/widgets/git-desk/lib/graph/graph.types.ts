// One drawable row of the commit graph. The dot sits in `lane`; `tops` are
// lanes whose lines bend into the dot from above (they end here), `bottoms`
// are lanes the dot opens toward below (a merge's extra parents), and
// `throughs` are lanes whose lines pass this row straight. `width` is the
// same on every row: the widest the drawing gets.
export type LaneRow = {
  sha: string
  lane: number
  // Whether a line reaches the dot from the row above, and leaves below.
  up: boolean
  down: boolean
  tops: number[]
  bottoms: number[]
  throughs: number[]
  width: number
}
