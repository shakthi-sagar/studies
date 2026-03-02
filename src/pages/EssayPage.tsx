import { Link, useParams } from 'react-router-dom'
import { MarkdownContent } from '../components/MarkdownContent'
import { essayByRoutePath } from '../lib/content'

function normalizeRoutePath(pathParam?: string): string | undefined {
  if (!pathParam) {
    return undefined
  }

  return pathParam
    .split('/')
    .map((segment) => segment.trim().toLowerCase())
    .filter(Boolean)
    .join('/')
}

function formatDate(value?: string): string {
  if (!value) {
    return 'Undated'
  }

  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) {
    return value
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(parsed)
}

export function EssayPage() {
  const params = useParams()
  const routePath = normalizeRoutePath(params['*'])
  const essay = routePath ? essayByRoutePath.get(routePath) : undefined

  if (!essay) {
    return (
      <section className="page-not-found">
        <h1>Essay not found</h1>
        <p>This route does not match any published markdown file.</p>
        <p>
          <Link to="/">Back to home</Link>
        </p>
      </section>
    )
  }

  return (
    <article className="essay-page">
      <header className="essay-header">
        <h1>{essay.title}</h1>
        <div className="essay-meta-line">
          <span className="essay-meta-chip">{formatDate(essay.date)}</span>
          <span className="essay-meta-chip">{essay.wordCount} words</span>
          <span className="essay-meta-chip">{essay.readingTimeMinutes} min read</span>
          <span className="essay-meta-chip">Updated {formatDate(essay.lastUpdated)}</span>
        </div>
        {essay.tags.length > 0 && (
          <ul className="tag-list" aria-label="Tags">
            {essay.tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        )}
      </header>

      <section className="essay-markdown">
        <MarkdownContent markdown={essay.markdownBody} />
      </section>

      <footer className="essay-footer">
        <Link to="/">Back to home</Link>
      </footer>
    </article>
  )
}
