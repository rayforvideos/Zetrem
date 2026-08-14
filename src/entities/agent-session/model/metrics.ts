import type { Metric } from './metric'
import { contextMetric } from './metrics/context'
import { elapsedMetric } from './metrics/elapsed'
import { tokensMetric } from './metrics/tokens'

export const metrics: Metric[] = [tokensMetric, elapsedMetric, contextMetric]
