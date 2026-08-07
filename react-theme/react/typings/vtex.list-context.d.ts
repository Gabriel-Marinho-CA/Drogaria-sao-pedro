/**
 * O pacote de typings publicado do vtex.list-context não é instalado aqui
 * (o app só depende dele em runtime, via manifest.json). Declaramos a parte
 * que o ShowcaseShelf consome: a lista de elementos já renderizados que o
 * `list-context.product-list` entrega — um por produto da coleção.
 */
declare module 'vtex.list-context' {
  import type { ComponentType, ReactNode } from 'react'

  export interface ListContextValue {
    list: ReactNode[]
  }

  export function useListContext(): ListContextValue | undefined

  export const ListContextProvider: ComponentType<{
    list: ReactNode[]
  }>
}
