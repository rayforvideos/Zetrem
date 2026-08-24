export type StockListProps = {
  stock: string[]
  on: string[]
  avatar: number
  onChange(name: string, on: boolean): void
}
