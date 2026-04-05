import { describe, it, expect } from 'vitest'
import { parseInlineMarkdown } from '../parser.ts'

describe('parseInlineMarkdown', () => {
  it('returns plain text as a single segment with default style', () => {
    const result = parseInlineMarkdown('Hello world', 'text')
    expect(result).toEqual([{ text: 'Hello world', styleKey: 'text' }])
  })

  it('returns empty array for empty string', () => {
    const result = parseInlineMarkdown('', 'text')
    expect(result).toEqual([])
  })

  it('detects heading prefix and applies heading style', () => {
    const result = parseInlineMarkdown('# Title', 'text', 'modalHeading')
    expect(result).toEqual([{ text: 'Title', styleKey: 'modalHeading' }])
  })

  it('uses default style when heading style is not provided', () => {
    const result = parseInlineMarkdown('# Title', 'text')
    expect(result).toEqual([{ text: 'Title', styleKey: 'text' }])
  })

  it('detects bold markers and applies bold style', () => {
    const result = parseInlineMarkdown('Hello **world**!', 'text', undefined, 'textBold')
    expect(result).toEqual([
      { text: 'Hello ', styleKey: 'text' },
      { text: 'world', styleKey: 'textBold' },
      { text: '!', styleKey: 'text' },
    ])
  })

  it('handles multiple bold sections', () => {
    const result = parseInlineMarkdown('**a** and **b**', 'text', undefined, 'textBold')
    expect(result).toEqual([
      { text: 'a', styleKey: 'textBold' },
      { text: ' and ', styleKey: 'text' },
      { text: 'b', styleKey: 'textBold' },
    ])
  })

  it('combines heading and bold formatting', () => {
    const result = parseInlineMarkdown('# Hello **world**', 'text', 'modalHeading', 'textBold')
    expect(result).toEqual([
      { text: 'Hello ', styleKey: 'modalHeading' },
      { text: 'world', styleKey: 'textBold' },
    ])
  })

  it('treats unclosed bold markers as literal text', () => {
    const result = parseInlineMarkdown('Hello **world', 'text', undefined, 'textBold')
    expect(result).toEqual([{ text: 'Hello **world', styleKey: 'text' }])
  })

  it('handles bold at the beginning of text', () => {
    const result = parseInlineMarkdown('**bold** text', 'text', undefined, 'textBold')
    expect(result).toEqual([
      { text: 'bold', styleKey: 'textBold' },
      { text: ' text', styleKey: 'text' },
    ])
  })

  it('handles bold at the end of text', () => {
    const result = parseInlineMarkdown('text **bold**', 'text', undefined, 'textBold')
    expect(result).toEqual([
      { text: 'text ', styleKey: 'text' },
      { text: 'bold', styleKey: 'textBold' },
    ])
  })

  it('uses default style for bold when boldStyleKey not provided', () => {
    const result = parseInlineMarkdown('Hello **world**', 'text')
    expect(result).toEqual([
      { text: 'Hello ', styleKey: 'text' },
      { text: 'world', styleKey: 'text' },
    ])
  })

  it('handles heading with empty content after prefix', () => {
    const result = parseInlineMarkdown('# ', 'text', 'modalHeading')
    // "# " → strips "# ", leaves empty string → no segments
    expect(result).toEqual([])
  })

  it('does not treat # in the middle as heading', () => {
    const result = parseInlineMarkdown('Hello # world', 'text', 'modalHeading')
    expect(result).toEqual([{ text: 'Hello # world', styleKey: 'text' }])
  })

  it('handles empty bold markers', () => {
    const result = parseInlineMarkdown('Hello ****', 'text', undefined, 'textBold')
    // **** could be interpreted as empty bold → ** followed by ** = empty bold
    expect(result).toHaveLength(1)
    expect(result[0]!.text).toBe('Hello ')
  })
})
