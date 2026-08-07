import React from 'react'

export type TitleTag = 'h1' | 'h2' | 'h3' | 'h4'

interface Props {
  text?: string
  /** Só muda a semântica do heading; o visual sai do handle showcaseShelfTitle */
  tag?: TitleTag
  className?: string
}

/**
 * Título da prateleira. Sem texto, não renderiza nada — a home usa um
 * `rich-text#showcase-title` por fora, então o padrão é vir vazio.
 */
function ShelfTitle({ text, tag = 'h2', className }: Props) {
  if (!text) {
    return null
  }

  const Tag = tag as 'h2'

  return <Tag className={className}>{text}</Tag>
}

export default ShelfTitle
