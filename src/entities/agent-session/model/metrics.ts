import type { Metric } from './metric'
import { contextMetric } from './metrics/context'
import { elapsedMetric } from './metrics/elapsed'
import { tokensMetric } from './metrics/tokens'

/**
 * 3층에 뿌릴 지표 등록소. 순서가 곧 화면 순서다.
 * 지표를 늘리려면 metrics/<id>.ts 하나를 만들고 여기 한 줄을 더한다.
 */
export const metrics: Metric[] = [tokensMetric, elapsedMetric, contextMetric]
