export function sanitizeMessageHtml(html: string): string {
  const template = document.createElement('template')
  template.innerHTML = html
  const allowed = new Set(['P', 'BR', 'SPAN', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'DEL', 'SMALL', 'BLOCKQUOTE', 'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'HR', 'CODE', 'PRE', 'DIV', 'FONT'])
  const forbidden = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'FORM', 'INPUT', 'TEXTAREA', 'BUTTON', 'LINK', 'META'])
  const output = document.createElement('div')

  function copy(source: Node, target: Node): void {
    if (source.nodeType === Node.TEXT_NODE) {
      target.appendChild(document.createTextNode(source.nodeValue || ''))
      return
    }
    if (!(source instanceof HTMLElement) || forbidden.has(source.tagName)) return
    if (!allowed.has(source.tagName)) {
      source.childNodes.forEach((child) => copy(child, target))
      return
    }
    const tag = source.tagName === 'FONT' ? 'span' : source.tagName.toLowerCase()
    const clean = document.createElement(tag)
    const color = source.tagName === 'FONT' ? source.getAttribute('color') : source.style.color
    if (color) {
      const probe = document.createElement('span')
      probe.style.color = color
      if (probe.style.color) clean.style.color = probe.style.color
    }
    source.childNodes.forEach((child) => copy(child, clean))
    target.appendChild(clean)
  }

  template.content.childNodes.forEach((node) => copy(node, output))
  return output.innerHTML
}
