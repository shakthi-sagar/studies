import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import type { TreeNode } from '../lib/content'

const STORAGE_KEY = 'archive.tree.v1'

function getAncestorFolders(routePath: string): string[] {
  const parts = routePath.split('/').filter(Boolean)
  const ancestors: string[] = []

  for (let index = 0; index < parts.length - 1; index += 1) {
    ancestors.push(parts.slice(0, index + 1).join('/'))
  }

  return ancestors
}

function readStoredOpenFolders(): Set<string> {
  if (typeof window === 'undefined') {
    return new Set<string>()
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return new Set<string>()
    }

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return new Set<string>()
    }

    return new Set(parsed.filter((item): item is string => typeof item === 'string'))
  } catch {
    return new Set<string>()
  }
}

function saveOpenFolders(openFolders: Set<string>): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(openFolders)))
}

type SidebarTreeProps = {
  tree: TreeNode[]
  activeRoutePath?: string
  onNavigate?: () => void
  hasActiveFilter?: boolean
}

type TreeItemProps = {
  node: TreeNode
  depth: number
  activeRoutePath?: string
  openFolders: Set<string>
  onToggleFolder: (path: string) => void
  onNavigate?: () => void
}

function TreeItem({
  node,
  depth,
  activeRoutePath,
  openFolders,
  onToggleFolder,
  onNavigate,
}: TreeItemProps) {
  if (node.type === 'folder') {
    const isOpen = openFolders.has(node.path)
    const folderClassName = `tree-folder${isOpen ? ' is-open' : ''}`

    return (
      <div className={folderClassName}>
        <button
          type="button"
          className="tree-folder-button"
          style={{ paddingLeft: `${depth * 0.75 + 0.5}rem` }}
          onClick={() => onToggleFolder(node.path)}
          aria-expanded={isOpen}
        >
          <span className="tree-folder-caret" aria-hidden="true">
            ▸
          </span>
          <span className="tree-folder-name">{node.name}</span>
        </button>
        {isOpen && (
          <div className="tree-folder-children">
            {node.children.map((childNode) => (
              <TreeItem
                key={`${childNode.type}:${childNode.path}`}
                node={childNode}
                depth={depth + 1}
                activeRoutePath={activeRoutePath}
                openFolders={openFolders}
                onToggleFolder={onToggleFolder}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  const isActive = activeRoutePath === node.path
  const essayClassName = `tree-essay-link${isActive ? ' is-active' : ''}`

  return (
    <NavLink
      to={`/${node.path}`}
      className={essayClassName}
      onClick={onNavigate}
      style={{ paddingLeft: `${depth * 0.75 + 0.5}rem` }}
    >
      {node.essay.title}
    </NavLink>
  )
}

export function SidebarTree({ tree, activeRoutePath, onNavigate, hasActiveFilter }: SidebarTreeProps) {
  const [openFolders, setOpenFolders] = useState<Set<string>>(() => readStoredOpenFolders())

  const requiredOpenFolders = useMemo(
    () => (activeRoutePath ? getAncestorFolders(activeRoutePath) : []),
    [activeRoutePath],
  )
  const expandedOpenFolders = useMemo(() => {
    const expanded = new Set(openFolders)
    for (const path of requiredOpenFolders) {
      expanded.add(path)
    }
    return expanded
  }, [openFolders, requiredOpenFolders])

  useEffect(() => {
    saveOpenFolders(openFolders)
  }, [openFolders])

  const handleToggleFolder = (path: string) => {
    setOpenFolders((previous) => {
      const next = new Set(previous)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  return (
    <nav className="tree-root" aria-label="Essay folders">
      {tree.length > 0 ? (
        tree.map((node) => (
          <TreeItem
            key={`${node.type}:${node.path}`}
            node={node}
            depth={0}
            activeRoutePath={activeRoutePath}
            openFolders={expandedOpenFolders}
            onToggleFolder={handleToggleFolder}
            onNavigate={onNavigate}
          />
        ))
      ) : (
        <p className="tree-empty">
          {hasActiveFilter ? 'No matching essays.' : 'No essays yet.'}
        </p>
      )}
    </nav>
  )
}
