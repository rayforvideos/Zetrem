import { useEffect, useState } from 'react'
import { GREETING_MS, greetingAt } from '../../lib/greetings/greetings'

export function Greeting({ name }: { name: string }) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setTick((was) => was + 1), GREETING_MS)
    return () => clearInterval(timer)
  }, [])

  return (
    <p
      key={tick}
      data-greeting
      className="zt-greeting mt-7 bg-linear-to-r from-muted-foreground via-foreground to-muted-foreground bg-clip-text text-center text-base leading-relaxed text-transparent break-keep"
    >
      {greetingAt(tick, name)}
    </p>
  )
}
