/**
 * Documentos .graphql — o builder react do VTEX os compila em DocumentNode na
 * hora do import (`import query from './queries/x.graphql'`). Para o
 * TypeScript é só um módulo opaco: quem tipa o resultado é o genérico do
 * `useQuery`.
 *
 * Não dá para usar `graphql-tag` aqui: o builder não o fornece como externo e
 * ele não está no package.json, então o webpack não resolve o import.
 */
declare module '*.graphql' {
  const document: unknown
  export default document
}

/**
 * `react-apollo` é fornecido pelo builder em runtime — não entra no
 * package.json e, portanto, não traz typings. Declaramos só a fatia que o
 * ShowcaseShelf usa, no mesmo espírito de [typings/vtex.list-context.d.ts].
 */
declare module 'react-apollo' {
  export interface QueryResult<TData> {
    data?: TData
    loading: boolean
    error?: Error
  }

  export function useQuery<
    TData = unknown,
    TVariables = Record<string, unknown>
  >(
    query: unknown,
    options?: {
      variables?: TVariables
      skip?: boolean
      ssr?: boolean
      fetchPolicy?:
        | 'cache-first'
        | 'cache-and-network'
        | 'network-only'
        | 'cache-only'
        | 'no-cache'
        | 'standby'
    }
  ): QueryResult<TData>
}
