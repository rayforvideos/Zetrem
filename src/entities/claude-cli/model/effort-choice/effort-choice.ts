import type { EffortChoice } from './effort-choice.types'

// The levels the CLI's --effort takes, in rising order. 'default' passes nothing.
export const NAMED_EFFORTS: EffortChoice[] = ['low', 'medium', 'high', 'xhigh', 'max']
