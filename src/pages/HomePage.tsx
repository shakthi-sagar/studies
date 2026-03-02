import { Link } from 'react-router-dom'
import type { Essay } from '../lib/content'

type HomePageProps = {
  essays: Essay[]
  searchQuery?: string
}

function toTimestamp(value?: string): number {
  if (!value) {
    return Number.NEGATIVE_INFINITY
  }

  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed
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

export function HomePage({ essays, searchQuery }: HomePageProps) {
  const recentEssays = [...essays]
    .sort((left, right) => {
      const rightTime = toTimestamp(right.date)
      const leftTime = toTimestamp(left.date)

      if (rightTime !== leftTime) {
        return rightTime - leftTime
      }

      return left.title.localeCompare(right.title, undefined, { sensitivity: 'base' })
    })
    .slice(0, 6)

  return (
    <section className="page-home">

      {recentEssays.length > 0 ? (
        <section className="recent-list-section">
          <h2>Recent essays</h2>
          <div className="recent-list">
            {recentEssays.map((essay) => (
              <article className="essay-card" key={essay.routePath}>
                <h3>
                  <Link to={`/${essay.routePath}`}>{essay.title}</Link>
                </h3>
                <p>{essay.summary}</p>
                <div className="essay-meta-line">
                  <span className="essay-meta-chip">{formatDate(essay.date)}</span>
                  <span className="essay-meta-chip">{essay.wordCount} words</span>
                  <span className="essay-meta-chip">{essay.readingTimeMinutes} min read</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="empty-state">
          <h2>{searchQuery?.trim() ? 'No matching essays' : 'No essays yet'}</h2>
          {searchQuery?.trim() ? (
            <p>Try another search term or clear the search bar.</p>
          ) : (
            <p>
              Create your first markdown file in <code>src/content</code> to publish it.
            </p>
          )}
        </section>
      )}
    </section>
  )
}
