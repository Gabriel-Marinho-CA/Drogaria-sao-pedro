import React, { useMemo } from 'react'
import { ExtensionPoint, Link, useChildBlock } from 'vtex.render-runtime'
import { ProductContextProvider } from 'vtex.product-context'
import {
  AddToCartButton,
  mapCatalogItemToCart,
} from 'vtex.add-to-cart-button'

import ProductPrice from './ProductPrice'
import { resolveOffer } from './types'
import type { ShowcaseProduct } from './types'
import styles from './showcase.css'

/** A partir daqui o selo de desconto vira vermelho (Figma: 27% bege, 55% vermelho) */
const HIGH_DISCOUNT_THRESHOLD = 50

interface Props {
  product: ShowcaseProduct
  /** Rótulo do botão */
  buttonText?: string
  /** Rótulo quando o produto está sem estoque */
  unavailableText?: string
  /**
   * Precisa ser o mesmo id declarado no `minicart.v2` do tema — é o que faz o
   * carrinho abrir depois de adicionar, em vez de aparecer um toast.
   */
  customPixelEventId?: string
}

/**
 * Card de produto das prateleiras da home.
 *
 * Figma: node 1-3131 (desktop) / 1-11363 (mobile). Todo o desenho é deste app
 * (CSS Module em showcase.css) — o card do `product-summary.shelf` do tema não
 * dá conta do layout sem uma pilha de overrides.
 *
 * O botão continua sendo o `AddToCartButton` do vtex.add-to-cart-button: ele
 * já resolve orderForm, parâmetros de marketing e o evento de pixel que abre o
 * minicart. Só a aparência é nossa.
 */
function ShowcaseCard({
  product,
  buttonText = 'Adicionar',
  unavailableText = 'Indisponível',
  customPixelEventId = 'add-to-cart-button',
}: Props) {
  const offer = useMemo(() => resolveOffer(product), [product])
  /* null quando o tema não declarou o bloco — aí o card sai sem coração, em
     vez de reservar um espaço vazio no canto. */
  const hasWishlist = useChildBlock({ id: 'add-to-list-btn' }) != null

  const skuItems = useMemo(() => {
    if (!offer) {
      return []
    }

    /* mapCatalogItemToCart é tipado contra o ProductContext, cuja forma de
       produto é bem maior que o recorte que a nossa query traz. Os campos que
       ele lê estão todos na query (ver queries/productSearch.ts), então o cast
       é só para atravessar a fronteira de tipos. */
    return mapCatalogItemToCart({
      product: product as never,
      selectedItem: offer.sku as never,
      selectedSeller: offer.seller as never,
      selectedQuantity: 1,
    })
  }, [product, offer])

  if (!offer) {
    return null
  }

  const image = (offer.sku.images ?? []).filter(Boolean)[0]
  const highlight = (product.clusterHighlights ?? []).filter(Boolean)[0]
  const productName = product.productName ?? ''

  const linkProps = {
    page: 'store.product',
    params: {
      slug: product.linkText ?? '',
      id: product.productId ?? '',
    },
  }

  const hasListPrice = offer.discountPercent > 0

  return (
    <article className={styles.card}>
      {/* Tag e coração dividem a mesma faixa e, no Figma, nunca aparecem
          juntos: os cards com faixa de coleção não têm wishlist. A tag ocupa
          os 189px inteiros, então ela ganha. */}
      <div className={styles.header}>
        {highlight?.name ? (
          <span className={styles.tag} title={highlight.name}>
            {highlight.name}
          </span>
        ) : hasWishlist ? (
          <div className={styles.wishlist}>
            {/* `add-to-list-btn` é o bloco do vtex.wish-list, declarado como
                filho desta prateleira no tema.

                Não dá para importar o componente direto: o vtex.wish-list é um
                app com cobrança, então ele só pode entrar em
                `peerDependencies` — e peer dependency compõe bloco, mas não
                expõe módulo JS para import.

                Ele lê o produto do ProductContext, que na home não existe
                (o card não é um product-summary). Daí o provider local. */}
            <ProductContextProvider product={product as never} query={{}}>
              <ExtensionPoint id="add-to-list-btn" />
            </ProductContextProvider>
          </div>
        ) : null}
      </div>

      <Link {...linkProps} className={styles.imageLink} tabIndex={-1}>
        <img
          className={styles.image}
          src={image?.imageUrl ?? ''}
          alt={image?.imageText ?? image?.imageLabel ?? productName}
          loading="lazy"
        />
      </Link>

      <Link {...linkProps} className={styles.nameLink}>
        <h3 className={styles.name} title={productName}>
          {productName}
        </h3>
      </Link>

      {/* A linha existe mesmo sem promoção: sem ela o card sem desconto sobe e
          desalinha o rodapé dos vizinhos no carrossel. */}
      <div className={styles.priceRow}>
        {hasListPrice ? (
          <>
            <ProductPrice
              value={offer.listPrice}
              className={styles.listPrice}
            />
            <span
              className={`${styles.discount} ${
                offer.discountPercent >= HIGH_DISCOUNT_THRESHOLD
                  ? styles.discountHigh
                  : ''
              }`}
            >
              {offer.discountPercent}% OFF
            </span>
          </>
        ) : null}
      </div>

      {offer.available ? (
        <ProductPrice
          value={offer.sellingPrice}
          className={styles.sellingPrice}
          symbolClassName={styles.priceSymbol}
          integerClassName={styles.priceInteger}
          fractionClassName={styles.priceFraction}
        />
      ) : (
        <span className={styles.unavailable}>{unavailableText}</span>
      )}

      <div className={styles.buy}>
        <AddToCartButton
          isOneClickBuy={false}
          available={offer.available}
          disabled={!offer.available}
          multipleAvailableSKUs={false}
          allSkuVariationsSelected
          skuItems={skuItems}
          text={buttonText}
          unavailableText={unavailableText}
          productLink={{
            linkText: product.linkText ?? undefined,
            productId: product.productId ?? undefined,
          }}
          onClickBehavior="add-to-cart"
          onClickEventPropagation="disabled"
          addToCartFeedback="customEvent"
          customPixelEventId={customPixelEventId}
          // Com `addToCartFeedback: "customEvent"` o retorno é o evento de
          // pixel, não o toast — mas a prop é obrigatória na tipagem.
          showToast={() => {}}
        />
      </div>
    </article>
  )
}

export default ShowcaseCard
