import { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import { renderMermaidBlocks, setupPanZoom } from '../utils/mermaidRenderer'

type MarkdownContentProps = {
  markdown: string
}

function getYouTubeEmbedUrl(value: string | undefined): string | null {
  if (!value) {
    return null
  }

  try {
    const url = new URL(value, window.location.origin)
    const hostname = url.hostname.replace(/^www\./, '')

    if (hostname === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0]
      return id ? `https://www.youtube.com/embed/${id}` : null
    }

    if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
      if (url.pathname === '/watch') {
        const id = url.searchParams.get('v')
        return id ? `https://www.youtube.com/embed/${id}` : null
      }

      const embedMatch = url.pathname.match(/^\/embed\/([^/?#]+)/)
      if (embedMatch?.[1]) {
        return `https://www.youtube.com/embed/${embedMatch[1]}`
      }

      const shortsMatch = url.pathname.match(/^\/shorts\/([^/?#]+)/)
      if (shortsMatch?.[1]) {
        return `https://www.youtube.com/embed/${shortsMatch[1]}`
      }
    }
  } catch {
    return null
  }

  return null
}

function MermaidDiagram({ chart }: { chart: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [hasError, setHasError] = useState(false)
  const [themeVersion, setThemeVersion] = useState(0)

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setThemeVersion((value) => value + 1)
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    const host = hostRef.current
    if (!host) {
      return
    }

    let isCancelled = false

    const run = async () => {
      try {
        delete host.dataset.panzoom
        host.innerHTML = ''
        const node = document.createElement('pre')
        node.className = 'mermaid'
        node.textContent = chart
        host.appendChild(node)

        await renderMermaidBlocks(host)

        setupPanZoom(host)

        if (!isCancelled) {
          setHasError(false)
        }
      } catch {
        if (!isCancelled) {
          setHasError(true)
        }
      }
    }

    void run()

    return () => {
      isCancelled = true
    }
  }, [chart, themeVersion])

  if (hasError) {
    return (
      <pre className="mermaid-error">
        <code>{chart}</code>
      </pre>
    )
  }

  return <div className="mermaid-host" ref={hostRef} />
}

const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'iframe', 'figure', 'figcaption'],
  attributes: {
    ...(defaultSchema.attributes ?? {}),
    iframe: [
      ['src', /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//],
      'title',
      'allow',
      'allowfullscreen',
      'frameborder',
      'loading',
      'referrerpolicy',
    ],
    img: [
      ...(defaultSchema.attributes?.img ?? []),
      'loading',
      'decoding',
      ['src', /^(https?:\/\/|\/|data:image\/|#).*/i],
    ],
    code: [...(defaultSchema.attributes?.code ?? []), ['className', /^language-/]],
  },
}

export function MarkdownContent({ markdown }: MarkdownContentProps) {
  const markdownComponents = useMemo<Components>(
    () => ({
      iframe({ src, title }) {
        const embedUrl = getYouTubeEmbedUrl(typeof src === 'string' ? src : undefined)
        if (!embedUrl) {
          return <p className="essay-media-note">Only YouTube iframe embeds are supported.</p>
        }

        return (
          <div className="essay-media-frame">
            <iframe
              src={embedUrl}
              title={typeof title === 'string' ? title : 'YouTube video'}
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        )
      },
      img({ src, alt, title }) {
        if (typeof src !== 'string' || !src) {
          return null
        }

        return (
          <figure className="essay-image-frame">
            <img
              src={src}
              alt={typeof alt === 'string' ? alt : ''}
              title={typeof title === 'string' ? title : undefined}
              loading="lazy"
              decoding="async"
            />
            {typeof title === 'string' && title.trim() ? <figcaption>{title}</figcaption> : null}
          </figure>
        )
      },
      pre({ children, ...rest }) {
        if (
          children &&
          typeof children === 'object' &&
          'props' in children &&
          (children as { props?: { className?: string } }).props?.className === 'language-mermaid'
        ) {
          const content = String((children as { props?: { children?: React.ReactNode } }).props?.children || '').replace(/\n$/, '')
          return <MermaidDiagram chart={content} />
        }
        return <pre {...rest}>{children}</pre>
      },
      code({ className, children, ...rest }) {
        return (
          <code className={className} {...rest}>
            {children}
          </code>
        )
      },
    }),
    [],
  )

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
      components={markdownComponents}
    >
      {markdown}
    </ReactMarkdown>
  )
}
