import { Plug } from 'lucide-react'
import { brandOf } from '@/entities/connector'
import { BrandMark, brandTile } from '@/shared/graphics/BrandMark/BrandMark'
import { BRAND_LOGOS } from '@/shared/graphics/BrandMark/logos'

export function ConnectorMark({ where }: { where: string }) {
  const brand = brandOf(where)
  const logo = brand === null ? undefined : BRAND_LOGOS[brand]

  if (logo !== undefined) {
    return (
      <span
        data-connector-mark={brand}
        data-logo="colour"
        className="flex size-7 flex-none items-center justify-center rounded-md bg-white"
      >
        <img src={logo} alt="" width={16} height={16} draggable={false} className="size-4" />
      </span>
    )
  }

  const tile = brandTile(brand)
  return (
    <span
      data-connector-mark={brand ?? 'unknown'}
      style={tile === null ? undefined : { background: tile.bg }}
      className="flex size-7 flex-none items-center justify-center rounded-md bg-muted"
    >
      {brand === null ? (
        <Plug className="size-3.5 text-muted-foreground" />
      ) : (
        <BrandMark brand={brand} />
      )}
    </span>
  )
}
