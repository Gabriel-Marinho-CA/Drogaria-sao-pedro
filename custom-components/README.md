# drogariasaopedro.custom-components

Blocos customizados da loja — coisas que o Store Framework nativo não entrega.

## Blocos

### `product-spec-banner`

Renderiza uma imagem na PDP cuja URL vem de uma **especificação do produto**.
O objetivo é que o time comercial só precise colar a URL da imagem no admin,
sem passar por deploy de tema.

#### Cadastro no admin

1. **Catálogo > Especificações > Grupo de especificações**: use (ou crie) um
   grupo, ex. `Banners`.
2. **Catálogo > Especificações > Campo de especificação**: crie o campo com
   - Tipo do campo: **Texto grande** (Text Area)
   - Nome: `Banner` (e `Banner mobile` para a versão mobile)
   - Marque o campo como **ativo**
3. No produto, preencha o campo com a URL completa da imagem
   (`https://...`). URLs sem `http(s)://` ou `//` são ignoradas.

> A leitura é feita pelo `vtex.product-context`, que se alimenta da API de
> busca. Especificação recém-criada ou recém-preenchida pode demorar alguns
> minutos até aparecer na PDP por conta da indexação.

#### Props

| Prop | Tipo | Padrão | Descrição |
| --- | --- | --- | --- |
| `specificationName` | `string` | — | Nome da especificação com a URL da imagem. Obrigatório. |
| `mobileSpecificationName` | `string` | — | Especificação com a URL da versão mobile. Quando presente junto da desktop, o bloco renderiza um `<picture>`. |
| `linkSpecificationName` | `string` | — | Especificação com a URL de destino do clique. |
| `altSpecificationName` | `string` | — | Especificação com o texto alternativo. |
| `alt` | `string` | nome do produto | Texto alternativo fixo, usado se não houver `altSpecificationName`. |
| `mobileBreakpoint` | `number` | `1024` | Largura máxima (px) em que a imagem mobile é usada. |
| `openLinkInNewTab` | `boolean` | `false` | Abre o link em nova aba. |
| `blockClass` | `string` | — | Sufixo de CSS handle. |

O nome da especificação é comparado ignorando acentos, caixa e pontuação —
`Banner PDP`, `banner-pdp` e `BANNER PDP` casam entre si.

Se a especificação não existir no produto ou o valor não for uma URL válida,
o bloco não renderiza nada (não deixa buraco no layout).

#### CSS Handles

- `bannerContainer`
- `bannerLink`
- `bannerImage`

## Desenvolvimento

```sh
cd custom-components
vtex link
```

Para publicar:

```sh
vtex release patch stable
```

Depois de publicado, instale na conta (`vtex install drogariasaopedro.custom-components@0.x`)
ou deixe o tema resolver via `dependencies` do `manifest.json`.
