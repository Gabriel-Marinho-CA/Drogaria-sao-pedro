/** Imports de CSS (globais e CSS Modules) processados pelo builder react. */
declare module '*.css' {
  const content: Record<string, string>
  export default content
}
