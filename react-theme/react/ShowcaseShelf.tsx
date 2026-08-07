import React, { useMemo, useRef } from 'react'
import { useQuery } from 'react-apollo'
import SwiperCore, { A11y, Navigation, Pagination } from 'swiper'
import { Swiper, SwiperSlide } from 'swiper/react'

import { ShelfArrow, ShelfTitle, ShowcaseCard } from './components/showcase'
import type { TitleTag } from './components/showcase'
import type { ProductSearchData, ShowcaseProduct } from './components/showcase'
import productSearchQuery from './queries/productSearch.graphql'
import styles from './components/showcase/showcase.css'
import './swiper.global.css'

SwiperCore.use([Pagination, Navigation, A11y])

/**
 * Breakpoints do tema (styles/configs/style.json → customMedia):
 * `ns`/`m` = 40rem (640px) e `l` = 64rem (1024px). Abaixo de 640 vale o
 * valor de `phone`, que é o default do Swiper (breakpoint 0).
 */
const TABLET_BREAKPOINT = 640
const DESKTOP_BREAKPOINT = 1024

const DEFAULT_MAX_ITEMS = 12

interface ItemsPerPage {
  desktop?: number
  tablet?: number
  /** aceita fração (ex: 1.2) para o card seguinte "espiar" na borda */
  phone?: number
}

interface Props {
  /** Título da prateleira. Se vazio, nada é renderizado no lugar. */
  title?: string
  /** Tag do título — só muda a semântica, o visual sai do CSS */
  titleTag?: TitleTag
  /** ID da coleção no VTEX Catalog. É o que alimenta a prateleira. */
  collection?: string
  /** Ordenação da busca (ex: OrderByTopSaleDESC) */
  orderBy?: string
  /** Esconde produtos sem estoque */
  hideUnavailableItems?: boolean
  /** Quantos cards aparecem por breakpoint */
  itemsPerPage?: ItemsPerPage
  /** Espaço entre os slides, em px (o Swiper aplica inline, não dá para trocar só no CSS) */
  spaceBetween?: number
  /** Quantos produtos buscar/exibir no máximo */
  maxItems?: number
  /** Rótulo do botão dos cards */
  buttonText?: string
  showPaginationDots?: boolean
  showNavigationArrows?: boolean
  /** Carrossel circular. Com `phone` fracionado o loop desalinha, então o padrão é false */
  infinite?: boolean
}

/**
 * Prateleira de produtos da home.
 *
 * Busca a coleção direto (vtex.search-graphql) e desenha cada produto com o
 * ShowcaseCard, o card do Figma feito neste app. O carrossel é Swiper, não
 * slider-layout.
 *
 * Figma desktop: node 1-3131 / 1-5470 | Figma mobile: node 1-11363
 */
function ShowcaseShelf({
  title,
  titleTag = 'h2',
  collection,
  orderBy = 'OrderByTopSaleDESC',
  hideUnavailableItems = true,
  itemsPerPage,
  spaceBetween = 2,
  maxItems = DEFAULT_MAX_ITEMS,
  buttonText,
  showPaginationDots = true,
  showNavigationArrows = false,
  infinite = false,
}: Props) {
  const prevRef = useRef<HTMLButtonElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)

  const total = maxItems > 0 ? maxItems : DEFAULT_MAX_ITEMS

  const { data } = useQuery<ProductSearchData>(productSearchQuery, {
    variables: {
      /* Sem `collection` a busca vai sem filtro e o `orderBy` sozinho decide o
         que sobe — é o provisório que o tema já usava para a prateleira não
         ficar vazia enquanto as coleções não são definidas no Catalog. */
      query: collection || undefined,
      map: collection ? 'productClusterIds' : undefined,
      orderBy,
      from: 0,
      to: total - 1,
      hideUnavailableItems,
    },
  })

  const products = useMemo(
    () =>
      ((data?.productSearch?.products ?? []).filter(
        Boolean
      ) as ShowcaseProduct[]).slice(0, total),
    [data, total]
  )

  const phone = itemsPerPage?.phone ?? 2.2 
  const tablet = itemsPerPage?.tablet ?? 3
  const desktop = itemsPerPage?.desktop ?? 5
 
  const slides = products.map(product => (
    <ShowcaseCard
      key={product.productId ?? product.linkText ?? ''}
      product={product}
      buttonText={buttonText}
    />
  ))

  if (!slides.length) {
    return null
  }
 
  return (
    <div className={styles.shelf}>
      <ShelfTitle text={title} tag={titleTag} className={styles.title} />

      <div className={styles.carousel}>
        <Swiper
          slidesPerView={phone}
          spaceBetween={spaceBetween}
          loop={infinite}
          watchOverflow
          breakpoints={{
            [TABLET_BREAKPOINT]: { slidesPerView: tablet },
            [DESKTOP_BREAKPOINT]: { slidesPerView: desktop },
          }}
          pagination={showPaginationDots ? { clickable: true } : false}
          navigation={
            showNavigationArrows
              ? { prevEl: prevRef.current, nextEl: nextRef.current }
              : false
          }
          // Os refs ainda são null no primeiro render; o Swiper lê os
          // elementos aqui, antes de inicializar a navegação.
          onBeforeInit={swiper => {
            if (!showNavigationArrows) return
            const navigation = swiper.params.navigation as {
              prevEl: HTMLElement | null
              nextEl: HTMLElement | null
            }

            navigation.prevEl = prevRef.current
            navigation.nextEl = nextRef.current
          }}
        >
          {slides.map((slide, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <SwiperSlide key={index} className={styles.slide}>
              {slide}
            </SwiperSlide>
          ))}
        </Swiper>

        {showNavigationArrows ? (
          <>
            <ShelfArrow
              ref={prevRef}
              direction="prev"
              className={`${styles.arrow} ${styles.arrowPrev}`}
            />
            <ShelfArrow
              ref={nextRef}
              direction="next"
              className={`${styles.arrow} ${styles.arrowNext}`}
            />
          </>
        ) : null}
      </div>
    </div>
  )
}

ShowcaseShelf.schema = {
  title: 'Prateleira (carrossel Swiper)',
  description:
    'Carrossel de produtos de uma coleção, com o card customizado da home.',
  type: 'object',
  properties: {
    title: {
      title: 'Título da prateleira',
      type: 'string',
      default: '',
    },
    collection: {
      title: 'ID da coleção',
      description:
        'ID da coleção no VTEX Catalog. Sem ele a prateleira não renderiza.',
      type: 'string',
      default: '',
    },
    orderBy: {
      title: 'Ordenação',
      type: 'string',
      enum: [
        'OrderByTopSaleDESC',
        'OrderByReleaseDateDESC',
        'OrderByBestDiscountDESC',
        'OrderByPriceASC',
        'OrderByPriceDESC',
        'OrderByNameASC',
        'OrderByNameDESC',
      ],
      default: 'OrderByTopSaleDESC',
    },
    maxItems: {
      title: 'Máximo de produtos',
      type: 'number',
      default: DEFAULT_MAX_ITEMS,
    },
    hideUnavailableItems: {
      title: 'Esconder produtos sem estoque',
      type: 'boolean',
      default: true,
    },
    buttonText: {
      title: 'Texto do botão',
      type: 'string',
      default: 'Adicionar',
    },
    spaceBetween: {
      title: 'Espaço entre os cards (px)',
      type: 'number',
      default: 2,
    },
    showPaginationDots: {
      title: 'Exibir bolinhas de paginação',
      type: 'boolean',
      default: true,
    },
    showNavigationArrows: {
      title: 'Exibir setas de navegação',
      type: 'boolean',
      default: false,
    },
    infinite: {
      title: 'Carrossel infinito',
      type: 'boolean',
      default: false,
    },
  },
}

export default ShowcaseShelf
