// ============================================
// Converte HTML do Quill para HTML de e-mail
// Processa QUALQUER tag (span, p, div, h1-h6, li)
// ============================================

const SIZE_MAP: Record<string, string> = {
  'ql-size-10px': 'font-size: 10px; line-height: 1.5;',
  'ql-size-11px': 'font-size: 11px; line-height: 1.5;',
  'ql-size-12px': 'font-size: 12px; line-height: 1.5;',
  'ql-size-13px': 'font-size: 13px; line-height: 1.5;',
  'ql-size-14px': 'font-size: 14px; line-height: 1.5;',
  'ql-size-15px': 'font-size: 15px; line-height: 1.5;',
  'ql-size-16px': 'font-size: 16px; line-height: 1.5;',
  'ql-size-18px': 'font-size: 18px; line-height: 1.4;',
  'ql-size-20px': 'font-size: 20px; line-height: 1.4;',
  'ql-size-22px': 'font-size: 22px; line-height: 1.4;',
  'ql-size-24px': 'font-size: 24px; line-height: 1.3;',
  'ql-size-28px': 'font-size: 28px; line-height: 1.3;',
  'ql-size-32px': 'font-size: 32px; line-height: 1.2;',
  'ql-size-small': 'font-size: 13px; line-height: 1.5;',
  'ql-size-large': 'font-size: 20px; line-height: 1.4;',
  'ql-size-huge': 'font-size: 28px; line-height: 1.3;',
}

const FONT_MAP: Record<string, string> = {
  'ql-font-arial': 'font-family: Arial, Helvetica, sans-serif;',
  'ql-font-helvetica': 'font-family: Helvetica, Arial, sans-serif;',
  'ql-font-verdana': 'font-family: Verdana, Geneva, sans-serif;',
  'ql-font-georgia': 'font-family: Georgia, serif;',
  'ql-font-times-new-roman': "font-family: 'Times New Roman', Times, serif;",
  'ql-font-courier-new': "font-family: 'Courier New', Courier, monospace;",
  'ql-font-tahoma': 'font-family: Tahoma, Geneva, sans-serif;',
}

const HEADER_STYLES: Record<string, string> = {
  h1: 'font-size: 26px; margin: 0 0 12px 0; font-weight: 700; line-height: 1.3;',
  h2: 'font-size: 22px; margin: 0 0 10px 0; font-weight: 700; line-height: 1.3;',
  h3: 'font-size: 18px; margin: 0 0 8px 0; font-weight: 700; line-height: 1.3;',
}

export function prepararHtmlEmail(html: string): string {
  if (!html) return ''
  let resultado = html

  resultado = resultado.replace(/<([a-z][a-z0-9]*)([^>]*)>/gi, (match, tag, attrs) => {
    const tagLower = tag.toLowerCase()
    if (['br', 'hr', 'img', 'meta', 'link'].includes(tagLower)) return match

    const classMatch = attrs.match(/class="([^"]*)"/)
    const styleMatch = attrs.match(/style="([^"]*)"/)
    const classes = classMatch ? classMatch[1].split(/\s+/).filter(Boolean) : []
    const stylesAplicar: string[] = []
    const classesRestantes: string[] = []

    for (const cls of classes) {
      if (SIZE_MAP[cls]) stylesAplicar.push(SIZE_MAP[cls])
      else if (FONT_MAP[cls]) stylesAplicar.push(FONT_MAP[cls])
      else if (!cls.startsWith('ql-')) classesRestantes.push(cls)
    }

    if (HEADER_STYLES[tagLower]) stylesAplicar.push(HEADER_STYLES[tagLower])
    else if (tagLower === 'p') stylesAplicar.push('margin: 0 0 4px 0; line-height: 1.5;')
    else if (tagLower === 'li') stylesAplicar.push('margin: 0 0 2px 0; line-height: 1.5;')
    else if (tagLower === 'ul' || tagLower === 'ol') stylesAplicar.push('margin: 0 0 8px 0; padding-left: 22px; line-height: 1.5;')

    if (stylesAplicar.length === 0 && !classMatch && !styleMatch) return match

    const styleExistente = styleMatch ? styleMatch[1] : ''
    const styleFinal = [styleExistente, ...stylesAplicar].filter(Boolean).join(' ')

    const attrsLimpos = attrs.replace(/class="[^"]*"/g, '').replace(/style="[^"]*"/g, '').trim()
    const classFinal = classesRestantes.length > 0 ? ` class="${classesRestantes.join(' ')}"` : ''
    const styleFinalAttr = styleFinal ? ` style="${styleFinal}"` : ''

    let novaTag = `<${tag}`
    if (attrsLimpos) novaTag += ` ${attrsLimpos}`
    if (classFinal) novaTag += classFinal
    if (styleFinalAttr) novaTag += styleFinalAttr
    novaTag += '>'
    return novaTag
  })

  resultado = resultado.replace(/<br\s*\/?>/gi, '<br />')
  return resultado
}
