import type { Metric } from '../metric'
import { contextMetric } from './context'
import { elapsedMetric } from './elapsed'
import { tokensMetric } from './tokens'

export const metrics: Metric[] = [tokensMetric, elapsedMetric, contextMetric]
