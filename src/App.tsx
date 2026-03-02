import { useEffect, useMemo, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { Moon, PanelLeft, Search, Sun } from 'lucide-react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { SidebarTree } from './components/SidebarTree'
import { essayByRoutePath, essays, rootTree, type Essay, type TreeNode } from './lib/content'
import { EssayPage } from './pages/EssayPage'
import { HomePage } from './pages/HomePage'

type Theme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'studies.theme.v1'
const SIDEBAR_STORAGE_KEY = 'studies.sidebar.v1'
const SIDEBAR_WIDTH_STORAGE_KEY = 'studies.sidebar.width.v1'
const DEFAULT_SIDEBAR_WIDTH = 330
const MIN_SIDEBAR_WIDTH = 240
const MAX_SIDEBAR_WIDTH = 520

function clampSidebarWidth(width: number): number {
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, width))
}

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getInitialSidebarOpen(): boolean {
  if (typeof window === 'undefined') {
    return true
  }

  const storedSidebarState = window.localStorage.getItem(SIDEBAR_STORAGE_KEY)
  if (storedSidebarState === 'open') {
    return true
  }

  if (storedSidebarState === 'closed') {
    return false
  }

  return !window.matchMedia('(max-width: 900px)').matches
}

function getInitialSidebarWidth(): number {
  if (typeof window === 'undefined') {
    return DEFAULT_SIDEBAR_WIDTH
  }

  const storedWidth = Number(window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY))
  return Number.isFinite(storedWidth) ? clampSidebarWidth(storedWidth) : DEFAULT_SIDEBAR_WIDTH
}

function getActiveEssayPath(pathname: string): string | undefined {
  const normalizedPath = pathname
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .map((segment) => segment.trim().toLowerCase())
    .filter(Boolean)
    .join('/')

  if (!normalizedPath) {
    return undefined
  }

  return essayByRoutePath.has(normalizedPath) ? normalizedPath : undefined
}

function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase()
}

function includesQuery(value: string | undefined, query: string): boolean {
  return Boolean(value && value.toLowerCase().includes(query))
}

function essayMatchesQuery(essay: Essay, query: string): boolean {
  if (!query) {
    return true
  }

  if (includesQuery(essay.title, query) || includesQuery(essay.summary, query)) {
    return true
  }

  if (includesQuery(essay.sourcePath, query) || includesQuery(essay.routePath, query)) {
    return true
  }

  return essay.tags.some((tag) => includesQuery(tag, query))
}

function filterTreeByPaths(tree: TreeNode[], matchingPaths: Set<string>): TreeNode[] {
  const filtered: TreeNode[] = []

  for (const node of tree) {
    if (node.type === 'essay') {
      if (matchingPaths.has(node.path)) {
        filtered.push(node)
      }
      continue
    }

    const children = filterTreeByPaths(node.children, matchingPaths)
    if (children.length > 0) {
      filtered.push({
        ...node,
        children,
      })
    }
  }

  return filtered
}

function App() {
  const location = useLocation()
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => getInitialSidebarOpen())
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => getInitialSidebarWidth())
  const [isResizingSidebar, setIsResizingSidebar] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme())

  const activeEssayPath = useMemo(
    () => getActiveEssayPath(location.pathname),
    [location.pathname],
  )
  const normalizedSearchQuery = useMemo(
    () => normalizeSearchQuery(searchQuery),
    [searchQuery],
  )
  const filteredEssays = useMemo(() => {
    if (!normalizedSearchQuery) {
      return essays
    }

    return essays.filter((essay) => essayMatchesQuery(essay, normalizedSearchQuery))
  }, [normalizedSearchQuery])
  const matchingEssayPaths = useMemo(
    () => new Set(filteredEssays.map((essay) => essay.routePath)),
    [filteredEssays],
  )
  const filteredTree = useMemo(() => {
    if (!normalizedSearchQuery) {
      return rootTree
    }

    return filterTreeByPaths(rootTree, matchingEssayPaths)
  }, [matchingEssayPaths, normalizedSearchQuery])

  const closeTree = () => {
    if (window.matchMedia('(max-width: 900px)').matches) {
      setIsSidebarOpen(false)
    }
  }

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, isSidebarOpen ? 'open' : 'closed')
  }, [isSidebarOpen])

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(sidebarWidth))
  }, [sidebarWidth])

  const handleSidebarResizeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (window.matchMedia('(max-width: 900px)').matches || !isSidebarOpen) {
      return
    }

    event.preventDefault()
    const startX = event.clientX
    const startWidth = sidebarWidth
    setIsResizingSidebar(true)

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const nextWidth = clampSidebarWidth(startWidth + (moveEvent.clientX - startX))
      setSidebarWidth(nextWidth)
    }

    const handlePointerUp = () => {
      setIsResizingSidebar(false)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  const layoutStyle = useMemo(
    () => ({ '--sidebar-width': `${sidebarWidth}px` }) as CSSProperties,
    [sidebarWidth],
  )

  return (
    <div className={`app-shell${isResizingSidebar ? ' is-resizing-sidebar' : ''}`}>
      <header className="app-topbar">
        <div className="topbar-left">
          <button
            type="button"
            className="topbar-button icon-button sidebar-toggle"
            onClick={() => setIsSidebarOpen((isOpen) => !isOpen)}
            aria-expanded={isSidebarOpen}
            aria-controls="essay-tree-sidebar"
            aria-label={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            title={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          >
            <PanelLeft size={17} />
            <span className="sr-only">{isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}</span>
          </button>
          <div className="topbar-title">
            <Link to="/">
              <span>Shakthi&apos;s Studies</span>
            </Link>
            <p>Writing to understand.</p>
          </div>
        </div>
        <div className="topbar-search" role="search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search essays, tags, or paths..."
            aria-label="Search essays"
          />
        </div>
        <div className="topbar-actions">
          <a
            href="https://shakthisagar.dev"
            target="_blank"
            rel="noreferrer"
            className="topbar-link"
          >
            Portfolio
          </a>
          <button
            type="button"
            className="topbar-button icon-button theme-toggle"
            onClick={() => setTheme((currentTheme) => (currentTheme === 'light' ? 'dark' : 'light'))}
            aria-pressed={theme === 'dark'}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
            <span className="sr-only">
              {theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            </span>
          </button>
        </div>
      </header>

      <div
        className={`app-layout ${isSidebarOpen ? 'sidebar-expanded' : 'sidebar-collapsed'}`}
        style={layoutStyle}
      >
        <aside
          id="essay-tree-sidebar"
          className={`sidebar ${isSidebarOpen ? 'is-open' : ''}`}
          aria-label="Essay folder navigation"
        >
          <SidebarTree
            tree={filteredTree}
            activeRoutePath={activeEssayPath}
            onNavigate={closeTree}
            hasActiveFilter={Boolean(normalizedSearchQuery)}
          />
          <div
            className="sidebar-resizer"
            role="separator"
            aria-label="Resize sidebar"
            aria-orientation="vertical"
            onPointerDown={handleSidebarResizeStart}
          />
        </aside>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage essays={filteredEssays} searchQuery={searchQuery} />} />
            <Route path="*" element={<EssayPage />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default App
