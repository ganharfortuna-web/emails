export function prepararHtmlEmail(html: string): string {
  if (!html) return ''
  let resultado = html

  // Tamanhos px
  resultado = resultado
    .replace(/class="ql-size-10px"/g, 'style="font-size: 10px; line-height: 1.5;"')
    .replace(/class="ql-size-11px"/g, 'style="font-size: 11px; line-height: 1.5;"')
    .replace(/class="ql-size-12px"/g, 'style="font-size: 12px; line-height: 1.5;"')
    .replace(/class="ql-size-13px"/g, 'style="font-size: 13px; line-height: 1.5;"')
    .replace(/class="ql-size-14px"/g, 'style="font-size: 14px; line-height: 1.5;"')
    .replace(/class="ql-size-15px"/g, 'style="font-size: 15px; line-height: 1.5;"')
    .replace(/class="ql-size-16px"/g, 'style="font-size: 16px; line-height: 1.5;"')
    .replace(/class="ql-size-18px"/g, 'style="font-size: 18px; line-height: 1.4;"')
    .replace(/class="ql-size-20px"/g, 'style="font-size: 20px; line-height: 1.4;"')
    .replace(/class="ql-size-22px"/g, 'style="font-size: 22px; line-height: 1.4;"')
    .replace(/class="ql-size-24px"/g, 'style="font-size: 24px; line-height: 1.3;"')
    .replace(/class="ql-size-28px"/g, 'style="font-size: 28px; line-height: 1.3;"')
    .replace(/class="ql-size-32px"/g, 'style="font-size: 32px; line-height: 1.2;"')
    .replace(/class="ql-size-small"/g, 'style="font-size: 13px; line-height: 1.5;"')
    .replace(/class="ql-size-large"/g, 'style="font-size: 20px; line-height: 1.4;"')
    .replace(/class="ql-size-huge"/g, 'style="font-size: 28px; line-height: 1.3;"')

  // Fontes
  resultado = resultado
    .replace(/class="ql-font-arial"/g, 'style="font-family: Arial, sans-serif;"')
    .replace(/class="ql-font-helvetica"/g, 'style="font-family: Helvetica, Arial, sans-serif;"')
    .replace(/class="ql-font-verdana"/g, 'style="font-family: Verdana, Geneva, sans-serif;"')
    .replace(/class="ql-font-georgia"/g, 'style="font-family: Georgia, serif;"')
    .replace(/class="ql-font-times-new-roman"/g, 'style="font-family: \'Times New Roman\', Times, serif;"')
    .replace(/class="ql-font-courier-new"/g, 'style="font-family: \'Courier New\', Courier, monospace;"')
    .replace(/class="ql-font-tahoma"/g, 'style="font-family: Tahoma, Geneva, sans-serif;"')

  // Parágrafos (espaçamento compacto)
  resultado = resultado.replace(/<p([^>]*)>/g, (_m, attrs) => {
    const attrsLimpos = attrs.replace(/class="[^"]*"/g, '').trim()
    if (/style="[^"]*"/.test(attrsLimpos)) {
      return `<p${attrsLimpos.replace('style="', 'style="margin: 0 0 4px 0; line-height: 1.5; ')}>`
    }
    return `<p style="margin: 0 0 4px 0; line-height: 1.5;"${attrsLimpos ? ' ' + attrsLimpos : ''}>`
  })

  // Headers
  resultado = resultado
    .replace(/<h1([^>]*)>/g, (_m, attrs) => `<h1 style="font-size: 26px; margin: 0 0 12px 0; font-weight: 700; line-height: 1.3;"${attrs.replace(/class="[^"]*"/g, '')}>`)
    .replace(/<h2([^>]*)>/g, (_m, attrs) => `<h2 style="font-size: 22px; margin: 0 0 10px 0; font-weight: 700; line-height: 1.3;"${attrs.replace(/class="[^"]*"/g, '')}>`)
    .replace(/<h3([^>]*)>/g, (_m, attrs) => `<h3 style="font-size: 18px; margin: 0 0 8px 0; font-weight: 700; line-height: 1.3;"${attrs.replace(/class="[^"]*"/g, '')}>`)

  // Listas
  resultado = resultado
    .replace(/<ul([^>]*)>/g, (_m, attrs) => `<ul style="margin: 0 0 8px 0; padding-left: 22px; line-height: 1.5;"${attrs.replace(/class="[^"]*"/g, '')}>`)
    .replace(/<ol([^>]*)>/g, (_m, attrs) => `<ol style="margin: 0 0 8px 0; padding-left: 22px; line-height: 1.5;"${attrs.replace(/class="[^"]*"/g, '')}>`)
    .replace(/<li([^>]*)>/g, (_m, attrs) => `<li style="margin: 0 0 2px 0; line-height: 1.5;"${attrs.replace(/class="[^"]*"/g, '')}>`)

  resultado = resultado.replace(/<br\s*\/?>/gi, '<br />')

  return `<div style="font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.5; color: #1f2937;">${resultado}</div>`
}
