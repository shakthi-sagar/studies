import mermaid from 'mermaid'
import elkLayouts from '@mermaid-js/layout-elk'

let initialized = false

export function initMermaid() {
  if (initialized) return
  mermaid.registerLayoutLoaders(elkLayouts)
  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
    maxTextSize: 200000,
  })
  initialized = true
}

// Store original mermaid source text so we can restore it before re-rendering
const sourceMap = new WeakMap<HTMLElement, string>()

export async function renderMermaidBlocks(container: HTMLElement) {
  initMermaid()
  const mermaidNodes = container.querySelectorAll<HTMLElement>('pre.mermaid')
  if (mermaidNodes.length === 0) return

  mermaidNodes.forEach((node) => {
    // If this node was already processed, restore the original source text
    if (node.getAttribute('data-processed')) {
      const original = sourceMap.get(node)
      if (original) {
        node.removeAttribute('data-processed')
        node.textContent = original
      }
    } else {
      // First time seeing this node - save the source
      sourceMap.set(node, node.textContent || '')
    }
  })

  await mermaid.run({ nodes: mermaidNodes as NodeListOf<HTMLElement> })
}

export function setupPanZoom(container: HTMLElement) {
  if (container.dataset.panzoom) return
  container.dataset.panzoom = 'true'

  const svg = container.querySelector('svg')
  if (!svg) return

  // Ensure SVG has a viewBox so preserveAspectRatio works
  if (!svg.getAttribute('viewBox')) {
    const w = parseFloat(svg.getAttribute('width') || '0') || svg.getBoundingClientRect().width
    const h = parseFloat(svg.getAttribute('height') || '0') || svg.getBoundingClientRect().height
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
  }
  svg.removeAttribute('width')
  svg.removeAttribute('height')
  svg.removeAttribute('style')
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
  svg.style.transformOrigin = '0 0'

  // Add controls
  const controls = document.createElement('div')
  controls.className = 'mermaid-controls'
  controls.innerHTML = `
    <button class="mermaid-btn mermaid-zoom-in" title="Zoom in">+</button>
    <button class="mermaid-btn mermaid-zoom-out" title="Zoom out">&minus;</button>
    <button class="mermaid-btn mermaid-zoom-reset" title="Reset view">&#x21BA;</button>
    <button class="mermaid-btn mermaid-fullscreen" title="Fullscreen">&#x26F6;</button>
  `
  container.appendChild(controls)

  // Pan/zoom state
  let scale = 1
  let translateX = 0
  let translateY = 0
  let isPanning = false
  let startX = 0
  let startY = 0

  const applyTransform = () => {
    svg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`
  }

  applyTransform()

  // Pinch-to-zoom (pinch fires as wheel with ctrlKey), free scroll in fullscreen
  container.addEventListener(
    'wheel',
    (e) => {
      if (!e.ctrlKey && !document.fullscreenElement) return
      e.preventDefault()
      e.stopPropagation()
      const factor = e.deltaY > 0 ? 0.9 : 1.1
      const rect = container.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const newScale = Math.max(0.1, Math.min(5, scale * factor))
      const scaleChange = newScale / scale
      translateX = mouseX - (mouseX - translateX) * scaleChange
      translateY = mouseY - (mouseY - translateY) * scaleChange
      scale = newScale
      applyTransform()
    },
    { passive: false },
  )

  // Pointer-based pan
  container.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return
    if ((e.target as HTMLElement).closest('.mermaid-controls')) return
    isPanning = true
    startX = e.clientX - translateX
    startY = e.clientY - translateY
    container.style.cursor = 'grabbing'
    container.setPointerCapture(e.pointerId)
    e.preventDefault()
  })

  container.addEventListener('pointermove', (e) => {
    if (!isPanning) return
    translateX = e.clientX - startX
    translateY = e.clientY - startY
    applyTransform()
  })

  container.addEventListener('pointerup', (e) => {
    if (isPanning) {
      isPanning = false
      container.style.cursor = 'grab'
      container.releasePointerCapture(e.pointerId)
    }
  })

  // Zoom buttons
  const zoomTo = (factor: number) => {
    const rect = container.getBoundingClientRect()
    const cx = rect.width / 2
    const cy = rect.height / 2
    const newScale = Math.max(0.1, Math.min(5, scale * factor))
    const scaleChange = newScale / scale
    translateX = cx - (cx - translateX) * scaleChange
    translateY = cy - (cy - translateY) * scaleChange
    scale = newScale
    applyTransform()
  }

  controls.querySelector('.mermaid-zoom-in')?.addEventListener('click', (e) => {
    e.stopPropagation()
    zoomTo(1.25)
  })

  controls.querySelector('.mermaid-zoom-out')?.addEventListener('click', (e) => {
    e.stopPropagation()
    zoomTo(0.8)
  })

  controls.querySelector('.mermaid-zoom-reset')?.addEventListener('click', (e) => {
    e.stopPropagation()
    scale = 1
    translateX = 0
    translateY = 0
    applyTransform()
  })

  // Fullscreen toggle
  const fsBtn = controls.querySelector('.mermaid-fullscreen')
  fsBtn?.addEventListener('click', (e) => {
    e.stopPropagation()
    if (!document.fullscreenElement) {
      void container.requestFullscreen()
    } else {
      void document.exitFullscreen()
    }
  })

  container.addEventListener('fullscreenchange', () => {
    scale = 1
    translateX = 0
    translateY = 0
    applyTransform()
  })
}
