import fs from 'fs/promises'
import path from 'path'

async function inlineDist() {
  const distDir = path.resolve(process.cwd(), 'dist')
  const indexPath = path.join(distDir, 'index.html')

  try {
    let html = await fs.readFile(indexPath, 'utf8')

    // Inline CSS files referenced as <link rel="stylesheet" href="...">
    const cssLinkRe = /<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/g
    html = await replaceAsync(html, cssLinkRe, async (m, href) => {
      const assetPath = path.join(distDir, href.replace(/^\//, ''))
      try {
        const css = await fs.readFile(assetPath, 'utf8')
        return `<style>\n${css}\n</style>`
      } catch (e) {
        console.warn('Failed to inline CSS', assetPath, e.message)
        return m
      }
    })

    // Inline JS files referenced as <script type="module" src="..."></script> or <script src="..."></script>
    const scriptRe = /<script([^>]*)src=["']([^"']+)["']([^>]*)>\s*<\/script>/g
    html = await replaceAsync(html, scriptRe, async (m, beforeAttr, src, afterAttr) => {
      const assetPath = path.join(distDir, src.replace(/^\//, ''))
      try {
        const js = await fs.readFile(assetPath, 'utf8')
        // Keep any attributes except src
        return `<script${beforeAttr || ''}${afterAttr || ''}>\n${js}\n</script>`
      } catch (e) {
        console.warn('Failed to inline JS', assetPath, e.message)
        return m
      }
    })

    // Optionally inline images/fonts referenced as <img src="assets/..."> or url(...) in CSS not handled here
    const outPath = path.join(distDir, 'index.single.html')
    await fs.writeFile(outPath, html, 'utf8')
    console.log('Wrote single-file HTML to', outPath)
  } catch (err) {
    console.error('Error creating single-file HTML:', err)
    process.exitCode = 1
  }
}

// helper for async replace
async function replaceAsync(str, regex, asyncFn) {
  const parts = []
  let lastIndex = 0
  let match
  while ((match = regex.exec(str)) !== null) {
    parts.push(str.slice(lastIndex, match.index))
    parts.push(await asyncFn(...match))
    lastIndex = regex.lastIndex
  }
  parts.push(str.slice(lastIndex))
  return parts.join('')
}

inlineDist()
