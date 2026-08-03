import React from 'react'
import { useProduct } from 'vtex.product-context'
import { useCssHandles } from 'vtex.css-handles'

const CSS_HANDLES = ['bannerContainer', 'bannerLink', 'bannerImage'] as const

interface Specification {
  name?: string
  originalName?: string
  values?: string[]
}

interface SpecificationGroup {
  name?: string
  originalName?: string
  specifications?: Specification[]
}

/**
 * Recorte do produto com o que este bloco precisa. O tipo `Product` do
 * product-context varia entre versões, então tratamos só o que consumimos.
 */
interface ProductWithSpecs {
  productName?: string
  properties?: Specification[]
  specificationGroups?: SpecificationGroup[]
}

interface Props {
  /** Nome da especificação (desktop / padrão) que guarda a URL da imagem */
  specificationName: string
  /** Nome da especificação com a URL da versão mobile. Opcional */
  mobileSpecificationName?: string
  /** Nome da especificação com a URL de destino ao clicar no banner. Opcional */
  linkSpecificationName?: string
  /** Nome da especificação com o texto alternativo da imagem. Opcional */
  altSpecificationName?: string
  /** Texto alternativo fixo, usado quando não há `altSpecificationName` */
  alt?: string
  /** Largura máxima (px) em que a imagem mobile é usada */
  mobileBreakpoint?: number
  /** Prefixo usado quando a especificação traz só o nome do arquivo */
  assetsPath?: string
  /** Abre o link em nova aba */
  openLinkInNewTab?: boolean
  /** Sufixo de CSS handle aplicado automaticamente pelo runtime */
  blockClass?: string
}

/**
 * Remove acentos, pontuação e caixa, para que o nome cadastrado no admin não
 * precise bater caractere a caractere com o configurado no tema:
 * "Banner mobile", "banner-mobile" e "BANNER MOBILE" casam entre si.
 */
function normalize(value: string) {
  return value
    .normalize('NFD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Lê o valor de uma especificação do produto. Na PDP desta loja os campos
 * chegam em `properties`; `specificationGroups` fica como fallback porque nem
 * toda origem de dados preenche os dois.
 */
function getSpecificationValue(
  product: ProductWithSpecs | undefined,
  specificationName: string | undefined
): string | null {
  if (!product || !specificationName) {
    return null
  }

  const target = normalize(specificationName)

  const matches = (specification: Specification) =>
    (specification.name != null && normalize(specification.name) === target) ||
    (specification.originalName != null &&
      normalize(specification.originalName) === target)

  const fromProperties = (product.properties ?? []).find(matches)

  const fromGroups = (product.specificationGroups ?? [])
    .reduce<Specification[]>(
      (acc, group) => acc.concat(group.specifications ?? []),
      []
    )
    .find(matches)

  const values = (fromProperties ?? fromGroups)?.values ?? []
  const value = values.find(item => typeof item === 'string' && item.trim())

  return value ? value.trim() : null
}

/** Extensões aceitas quando o valor é só o nome de um arquivo. */
const IMAGE_FILE_REGEX = /\.(png|jpe?g|gif|webp|avif|svg)$/i

/**
 * Resolve o valor cadastrado no admin em um `src` utilizável. Aceita:
 *
 * - URL absoluta (`https://...`) ou protocolo relativo (`//...`) — usada como está
 * - caminho absoluto (`/arquivos/banner.png`) — usado como está
 * - só o nome do arquivo (`banner-desk-pdp.png`) — prefixado com `assetsPath`,
 *   já que o padrão é subir a imagem no repositório de arquivos do catálogo
 *
 * O campo é texto livre, então qualquer outro esquema (`javascript:`, `data:`)
 * é recusado — sem isso, um valor colado no admin viraria XSS na PDP.
 */
function sanitizeUrl(
  rawValue: string | null,
  assetsPath: string | null
): string | null {
  if (!rawValue) {
    return null
  }

  const value = rawValue.trim().replace(/^["'<]+|["'>]+$/g, '')

  if (!value) {
    return null
  }

  // URL absoluta ou protocolo relativo.
  if (/^(https?:\/\/|\/\/)\S+$/i.test(value)) {
    return value
  }

  // Caminho já resolvido a partir da raiz do site.
  if (/^\/[^/]/.test(value)) {
    return encodeURI(value)
  }

  // Qualquer outro esquema (javascript:, data:, ftp:...) é recusado.
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    return null
  }

  // Sobrou o caso do nome do arquivo solto. Exigimos uma extensão de imagem
  // conhecida para não transformar texto qualquer em um `src` quebrado.
  const fileName = value.replace(/^\/+/, '')

  if (assetsPath == null || !IMAGE_FILE_REGEX.test(fileName)) {
    return null
  }

  const normalizedPath = assetsPath.replace(/\/+$/, '')

  return encodeURI(`${normalizedPath}/${fileName}`)
}

function ProductSpecBanner({
  specificationName,
  mobileSpecificationName,
  linkSpecificationName,
  altSpecificationName,
  alt,
  mobileBreakpoint = 1024,
  assetsPath = '/arquivos',
  openLinkInNewTab = false,
}: Props) {
  const handles = useCssHandles(CSS_HANDLES)
  const productContext = useProduct()
  const product = productContext?.product as ProductWithSpecs | undefined

  const desktopUrl = sanitizeUrl(
    getSpecificationValue(product, specificationName),
    assetsPath
  )
  const mobileUrl = sanitizeUrl(
    getSpecificationValue(product, mobileSpecificationName),
    assetsPath
  )

  const imageUrl = desktopUrl ?? mobileUrl

  if (!imageUrl) {
    return null
  }

  // `null` desliga o fallback de `assetsPath`: nome de arquivo solto seria um
  // destino inválido, então só URL absoluta ou caminho do site valem aqui.
  const linkUrl = sanitizeUrl(
    getSpecificationValue(product, linkSpecificationName),
    null
  )

  const altText =
    getSpecificationValue(product, altSpecificationName) ??
    alt ??
    product?.productName ??
    ''

  const image = (
    <img
      className={handles.bannerImage}
      src={imageUrl}
      alt={altText}
      loading="lazy"
    />
  )

  // Só monta o <picture> quando as duas URLs existem; com uma só, o <img>
  // simples já cobre os dois breakpoints.
  const content =
    desktopUrl && mobileUrl ? (
      <picture>
        <source
          media={`(max-width: ${mobileBreakpoint}px)`}
          srcSet={mobileUrl}
        />
        {image}
      </picture>
    ) : (
      image
    )

  return (
    <div className={handles.bannerContainer}>
      {linkUrl ? (
        <a
          className={handles.bannerLink}
          href={linkUrl}
          target={openLinkInNewTab ? '_blank' : undefined}
          rel={openLinkInNewTab ? 'noopener noreferrer' : undefined}
        >
          {content}
        </a>
      ) : (
        content
      )}
    </div>
  )
}

export default ProductSpecBanner
