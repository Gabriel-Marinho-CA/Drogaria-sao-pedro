/**
 * Recorte do produto que o card da prateleira consome.
 *
 * O tipo `Product` do vtex.search-graphql tem ~40 campos e muda entre versões;
 * aqui declaramos só o que a query pede e o card lê, no mesmo padrão do
 * ProductSpecBanner.
 */

export interface ProductImage {
  imageUrl?: string | null
  imageLabel?: string | null
  imageText?: string | null
}

export interface CommertialOffer {
  Price?: number | null
  ListPrice?: number | null
  AvailableQuantity?: number | null
  PriceValidUntil?: string | null
}

export interface Seller {
  sellerId?: string | null
  sellerName?: string | null
  sellerDefault?: boolean | null
  commertialOffer?: CommertialOffer | null
}

export interface Reference {
  Key?: string | null
  Value?: string | null
}

export interface Variation {
  name?: string | null
  values?: Array<string | null> | null
}

export interface Sku {
  itemId?: string | null
  name?: string | null
  ean?: string | null
  measurementUnit?: string | null
  referenceId?: Array<Reference | null> | null
  variations?: Array<Variation | null> | null
  images?: Array<ProductImage | null> | null
  sellers?: Array<Seller | null> | null
}

/** Tag de coleção do produto — vira a faixa vermelha no topo do card */
export interface ClusterHighlight {
  id?: string | null
  name?: string | null
}

export interface Category {
  name?: string | null
}

export interface ShowcaseProduct {
  productId?: string | null
  productName?: string | null
  productReference?: string | null
  linkText?: string | null
  link?: string | null
  brand?: string | null
  categoryTree?: Array<Category | null> | null
  clusterHighlights?: Array<ClusterHighlight | null> | null
  items?: Array<Sku | null> | null
}

export interface ProductSearchData {
  productSearch?: {
    products?: Array<ShowcaseProduct | null> | null
  } | null
}

/** SKU + oferta já resolvidos, do jeito que o card precisa desenhar. */
export interface ResolvedOffer {
  sku: Sku
  seller: Seller
  sellingPrice: number
  listPrice: number
  available: boolean
  /** Inteiro de 0 a 100. 0 quando não há desconto. */
  discountPercent: number
}

/**
 * Primeiro SKU com vendedor e preço. O carrossel mostra um card por produto,
 * então não há seletor de SKU: vale o primeiro disponível e, se nenhum estiver,
 * o primeiro da lista (o card sai marcado como indisponível).
 */
export function resolveOffer(
  product: ShowcaseProduct
): ResolvedOffer | null {
  const skus = (product.items ?? []).filter(Boolean) as Sku[]

  let fallback: ResolvedOffer | null = null

  for (const sku of skus) {
    const sellers = (sku.sellers ?? []).filter(Boolean) as Seller[]
    const seller =
      sellers.find(candidate => candidate.sellerDefault) ?? sellers[0]

    if (!seller?.commertialOffer) {
      continue
    }

    const offer = seller.commertialOffer
    const sellingPrice = offer.Price ?? 0
    // O catálogo devolve ListPrice 0 (e não null) quando não há preço "de".
    const listPrice = offer.ListPrice ?? 0
    const available = (offer.AvailableQuantity ?? 0) > 0 && sellingPrice > 0

    const discountPercent =
      listPrice > sellingPrice && listPrice > 0
        ? Math.round(((listPrice - sellingPrice) / listPrice) * 100)
        : 0

    const resolved: ResolvedOffer = {
      sku,
      seller,
      sellingPrice,
      listPrice,
      available,
      discountPercent,
    }

    if (available) {
      return resolved
    }

    fallback = fallback ?? resolved
  }

  return fallback
}
