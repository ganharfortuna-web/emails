// ============================================
// Converte HTML do Quill para HTML de e-mail
// (inline CSS + normalização de espaçamento)
// ============================================

export function prepararHtmlEmail(html: string): string {
  if (!html) return ''

  let resultado = html

  // 1. Tamanhos do Quill → inline px
  resultado = resultado
    .replace(/class="ql-size-small"/g, 'style="font-size: 13px; line-height: 1.6;"')
    .replace(/class="ql-size-large"/g, 'style="font-size: 20px; line-height: 1.5;"')
    .replace(/class="ql-size-huge"/g, 'style="font-size: 26px; line-height: 1.4;"')

  // 2. Parágrafos: normaliza margin e line-height
  resultado = resultado.replace(/<p([^>]*)>/g, (_m, attrs) => {
    let attrsLimpos = attrs.replace(/class="[^"]*"/g, '').trim()
    // Se já tem style, preserva e adiciona os defaults
    if (/style="[^"]*"/.test(attrsLimpos)) {
      return `<p${attrsLimpos.replace('style="', 'style="margin: 0 0 14px 0; line-height: 1.6; ')}>`
    }
    return `<p style="margin: 0 0 14px 0; line-height: 1.6;"${attrsLimpos ? ' ' + attrsLimpos : ''}>`
  })

  // 3. Headers
  resultado = resultado
    .replace(/<h1([^>]*)>/g, (_m, attrs) =>
      `<h1 style="font-size: 26px; margin: 0 0 16px 0; font-weight: 700; line-height: 1.3;"${attrs.replace(/class="[^"]*"/g, '')}>`)
    .replace(/<h2([^>]*)>/g, (_m, attrs) =>
      `<h2 style="font-size: 22px; margin: 0 0 14px 0; font-weight: 700; line-height: 1.3;"${attrs.replace(/class="[^"]*"/g, '')}>`)
    .replace(/<h3([^>]*)>/g, (_m, attrs) =>
      `<h3 style="font-size: 18px; margin: 0 0 12px 0; font-weight: 700; line-height: 1.3;"${attrs.replace(/class="[^"]*"/g, '')}>`)

  // 4. Listas
  resultado = resultado
    .replace(/<ul([^>]*)>/g, (_m, attrs) =>
      `<ul style="margin: 0 0 14px 0; padding-left: 24px;"${attrs.replace(/class="[^"]*"/g, '')}>`)
    .replace(/<ol([^>]*)>/g, (_m, attrs) =>
      `<ol style="margin: 0 0 14px 0; padding-left: 24px;"${attrs.replace(/class="[^"]*"/g, '')}>`)
    .replace(/<li([^>]*)>/g, (_m, attrs) =>
      `<li style="margin: 0 0 6px 0; line-height: 1.6;"${attrs.replace(/class="[^"]*"/g, '')}>`)

  // 5. Quebras de linha normalizadas
  resultado = resultado.replace(/<br\s*\/?>/gi, '<br />')

  // 6. Wrapper com estilo base (fonte 15px = padrão)
  return `<div style="font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.6; color: #1f2937;">${resultado}</div>`
}
