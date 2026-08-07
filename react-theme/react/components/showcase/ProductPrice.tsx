import React, { useMemo } from 'react'
import { useRuntime } from 'vtex.render-runtime'

interface Culture {
  locale?: string
  currency?: string
  customCurrencySymbol?: string | null
}

interface Props {
  value: number
  /** Wrapper do preço inteiro */
  className?: string
  /** "R$" */
  symbolClassName?: string
  /** Os reais, que no Figma são os 32px em bold */
  integerClassName?: string
  /** ",89" */
  fractionClassName?: string
}

interface PriceParts {
  symbol: string
  integer: string
  fraction: string
}

/**
 * Descobre o símbolo da moeda pedindo ao Intl um valor conhecido e removendo
 * tudo que é número/separador — evita manter um mapa de moeda → símbolo.
 */
function getCurrencySymbol(locale: string, currency: string): string {
  try {
    return Intl.NumberFormat(locale, { style: 'currency', currency })
      .format(0)
      .replace(/[\d\s., ]/g, '')
  } catch {
    return currency
  }
}

/**
 * Quebra o preço em símbolo / reais / centavos.
 *
 * Usa só `format` (e não `formatToParts`, que exige lib es2018 e não está no
 * tsconfig): formata sem a moeda e corta no último separador, que é sempre o
 * decimal porque fixamos 2 casas.
 */
function splitPrice(value: number, culture: Culture): PriceParts {
  const locale = culture.locale ?? 'pt-BR'
  const currency = culture.currency ?? 'BRL'

  const symbol =
    culture.customCurrencySymbol ?? getCurrencySymbol(locale, currency)

  let formatted: string

  try {
    formatted = Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    formatted = value.toFixed(2)
  }

  const cut = formatted.search(/[.,](?=\d{2}$)/)

  if (cut < 0) {
    return { symbol, integer: formatted, fraction: '' }
  }

  return {
    symbol,
    integer: formatted.slice(0, cut),
    // mantém o separador junto dos centavos: ",89"
    fraction: formatted.slice(cut),
  }
}

/**
 * Preço com as três partes separadas, como no Figma (node 1-3131): "R$" e os
 * centavos pequenos, os reais grandes e em bold. O `product-selling-price` do
 * tema entrega isso via handles de moeda; aqui a quebra é nossa porque o card
 * inteiro é React.
 */
function ProductPrice({
  value,
  className,
  symbolClassName,
  integerClassName,
  fractionClassName,
}: Props) {
  const { culture } = useRuntime()

  const { symbol, integer, fraction } = useMemo(
    () => splitPrice(value, culture as Culture),
    [value, culture]
  )

  return (
    <span className={className}>
      <span className={symbolClassName}>{symbol}</span>
      <span className={integerClassName}>{integer}</span>
      <span className={fractionClassName}>{fraction}</span>
    </span>
  )
}

export default ProductPrice
