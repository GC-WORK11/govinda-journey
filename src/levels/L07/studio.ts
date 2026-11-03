/**
 * L07 shared visual state. The Obstacle (V5 logic) writes it and the Diorama (studio art,
 * V4 and V5) reads it: the words that have landed on the laptop, and whether the mic is open.
 */
export const studio = { landed: [] as string[], listening: false, v: 0 }
