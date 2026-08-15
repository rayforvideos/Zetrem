import { BRAND_MARKS } from './marks'
import { tileOf } from './tile/tile'

type BrandMarkProps = { brand: string | null; size?: number }

export function BrandMark({ brand, size = 15 }: BrandMarkProps) {
  const found = brand === null ? undefined : BRAND_MARKS[brand]
  if (found === undefined) return null
  const tile = tileOf(found.hex)
  return (
    <svg
      data-brand={brand}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={tile.ink}
      aria-hidden
    >
      <path d={found.path} />
    </svg>
  )
}

export function brandTile(brand: string | null): { bg: string } | null {
  const found = brand === null ? undefined : BRAND_MARKS[brand]
  return found === undefined ? null : { bg: tileOf(found.hex).bg }
}
