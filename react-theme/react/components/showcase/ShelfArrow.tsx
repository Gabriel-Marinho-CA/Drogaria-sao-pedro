import React, { forwardRef } from 'react'

interface Props {
  direction: 'prev' | 'next'
  /** Handles do bloco pai (showcaseShelfArrow + o modificador do lado) */
  className?: string
}

const LABEL = {
  prev: 'Anterior',
  next: 'Próximo',
}

const PATH = {
  prev: 'M8.5 1L1.5 8l7 7',
  next: 'M1.5 1l7 7-7 7',
}

/**
 * Seta de navegação do carrossel.
 *
 * O Swiper precisa dos elementos em si (`navigation.prevEl` / `nextEl`), por
 * isso o botão expõe a ref para fora. O chevron é desenhado em `currentColor`
 * e sem tamanho fixo no wrapper: cor, caixa e posição saem do CSS do tema.
 */
const ShelfArrow = forwardRef<HTMLButtonElement, Props>(function ShelfArrow(
  { direction, className },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={LABEL[direction]}
      className={className}
    >
      <svg
        width="10"
        height="16"
        viewBox="0 0 10 16"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d={PATH[direction]}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
})

export default ShelfArrow
