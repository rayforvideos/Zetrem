import { describe, expect, it } from 'vitest'
import { lineReader } from './line-reader'

describe('lineReader: whole lines out of a stream that arrives in pieces', () => {
  it('hands back a line only once it is whole', () => {
    const read = lineReader()
    expect(read.take('{"a":')).toEqual([])
    expect(read.take('1}\n')).toEqual(['{"a":1}'])
  })

  it('hands back several lines from one piece', () => {
    expect(lineReader().take('one\ntwo\nthree\n')).toEqual(['one', 'two', 'three'])
  })

  it('holds the tail of a piece that ends mid line', () => {
    const read = lineReader()
    expect(read.take('one\ntw')).toEqual(['one'])
    expect(read.take('o\n')).toEqual(['two'])
  })

  it('skips blank lines, which carry nothing', () => {
    expect(lineReader().take('one\n\n  \ntwo\n')).toEqual(['one', 'two'])
  })
})

describe('a line too long to hold is dropped whole, never chopped', () => {
  it('keeps the lines that came before it, which are complete and fine', () => {
    const read = lineReader(20)
    expect(read.take(`keep me\n${'x'.repeat(50)}`)).toEqual(['keep me'])
  })

  it('does not hand back a piece of the oversized line', () => {
    const read = lineReader(20)
    read.take(`${'x'.repeat(50)}`)
    expect(read.take('tail-of-the-giant\n'), 'a cut-off piece is not a line').toEqual([])
  })

  it('picks the stream back up at the next line', () => {
    const read = lineReader(20)
    read.take('x'.repeat(50))
    expect(read.take('rest-of-giant\nfresh\n')).toEqual(['fresh'])
  })

  it('stays dropping while the giant keeps coming', () => {
    const read = lineReader(20)
    read.take('x'.repeat(50))
    expect(read.take('y'.repeat(50))).toEqual([])
    expect(read.take('end\nafter\n')).toEqual(['after'])
  })

  it('lets a line right at the limit through', () => {
    const read = lineReader(20)
    expect(read.take(`${'x'.repeat(20)}\n`)).toEqual(['x'.repeat(20)])
  })
})
