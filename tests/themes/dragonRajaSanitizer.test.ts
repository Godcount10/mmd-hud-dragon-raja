import { sanitizeMessageHtml } from '../../src/hud/themes/dragon-raja/sanitizeMessageHtml'

describe('Dragon Raja message HTML sanitizer', () => {
  it('preserves text formatting and safe font colors', () => {
    document.body.innerHTML = ''
    const output = sanitizeMessageHtml('<p><strong>学院</strong> <font color="#72bfc1">已抵达</font></p>')
    expect(output).toContain('<strong>学院</strong>')
    expect(output).toMatch(/color:\s*rgb\(114, 191, 193\)/)
  })

  it('removes executable and interactive markup while retaining text', () => {
    const output = sanitizeMessageHtml('<script>window.__pwned = true</script><p onclick="alert(1)">安全文本 <a href="https://evil.example">链接</a></p><iframe src="bad"></iframe>')
    expect(output).toContain('安全文本')
    expect(output).toContain('链接')
    expect(output).not.toContain('script')
    expect(output).not.toContain('onclick')
    expect(output).not.toContain('href')
    expect(output).not.toContain('iframe')
  })

  it('strips unsafe styles and attributes from allowed elements', () => {
    const output = sanitizeMessageHtml('<span style="color:red;background:url(javascript:bad)" data-x="secret">坐标</span>')
    expect(output).toContain('坐标')
    expect(output).not.toContain('data-x')
    expect(output).not.toContain('background')
    expect(output).not.toContain('javascript')
  })
})
