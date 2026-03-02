export type Essay = {
  sourcePath: string
  routePath: string
  title: string
  date?: string
  lastUpdated?: string
  summary: string
  tags: string[]
  draft: boolean
  wordCount: number
  readingTimeMinutes: number
  markdownBody: string
}

export type FolderNode = {
  type: 'folder'
  name: string
  path: string
  children: TreeNode[]
}

export type EssayNode = {
  type: 'essay'
  name: string
  path: string
  essay: Essay
}

export type TreeNode = FolderNode | EssayNode

type MutableFolder = {
  name: string
  path: string
  folders: Map<string, MutableFolder>
  essays: EssayNode[]
}

type Frontmatter = {
  title?: unknown
  date?: unknown
  lastUpdated?: unknown
  summary?: unknown
  tags?: unknown
  draft?: unknown
}

type ParsedMarkdown = {
  frontmatter: Frontmatter
  markdownBody: string
}

const rawMarkdownModules = import.meta.glob('/src/content/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const includeDrafts = import.meta.env.DEV

function toKebabSegment(segment: string): string {
  const normalized = segment
    .replace(/\.md$/i, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()

  return normalized || 'untitled'
}

function toStringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function toDateValue(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value.toISOString().slice(0, 10)
  }

  return undefined
}

function toTagsValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item) => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

function toDraftValue(value: unknown): boolean {
  return value === true
}

function extractHeading(markdownBody: string): string | undefined {
  const match = markdownBody.match(/^\s*#\s+(.+?)\s*$/m)
  return match?.[1]?.trim()
}

function cleanMarkdownText(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_~>#-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractSummary(markdownBody: string): string {
  const lines = markdownBody.split('\n')
  const paragraph: string[] = []
  let insideCodeBlock = false

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (line.startsWith('```')) {
      insideCodeBlock = !insideCodeBlock
      continue
    }

    if (insideCodeBlock) {
      continue
    }

    if (!line) {
      if (paragraph.length > 0) {
        break
      }
      continue
    }

    if (/^#{1,6}\s+/.test(line) || /^[-*]\s+/.test(line)) {
      continue
    }

    paragraph.push(line)
  }

  const cleaned = cleanMarkdownText(paragraph.join(' '))
  if (!cleaned) {
    return 'No summary yet. Open the essay to read the full piece.'
  }

  return cleaned.length > 180 ? `${cleaned.slice(0, 177)}...` : cleaned
}

function extractWordCount(markdownBody: string): number {
  const withoutCodeBlocks = markdownBody.replace(/```[\s\S]*?```/g, ' ')
  const flattened = cleanMarkdownText(
    withoutCodeBlocks
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
      .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
      .replace(/[^\p{L}\p{N}\s']/gu, ' '),
  )

  if (!flattened) {
    return 0
  }

  return flattened.split(/\s+/).filter(Boolean).length
}

function estimateReadingTime(wordCount: number): number {
  if (wordCount <= 0) {
    return 1
  }

  return Math.max(1, Math.round(wordCount / 220))
}

function compareNames(left: string, right: string): number {
  return left.localeCompare(right, undefined, { sensitivity: 'base' })
}

function stripWrappingQuotes(value: string): string {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

function parseInlineArray(value: string): string[] {
  return value
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .split(',')
    .map((item) => stripWrappingQuotes(item))
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseFrontmatterValue(key: string, value: string): unknown {
  const cleanValue = value.trim()
  if (!cleanValue) {
    return ''
  }

  if (cleanValue === 'true') {
    return true
  }

  if (cleanValue === 'false') {
    return false
  }

  if (key === 'tags' && cleanValue.startsWith('[') && cleanValue.endsWith(']')) {
    return parseInlineArray(cleanValue)
  }

  return stripWrappingQuotes(cleanValue)
}

function parseMarkdownDocument(rawMarkdown: string): ParsedMarkdown {
  const trimmed = rawMarkdown.replace(/\r\n/g, '\n')
  if (!trimmed.startsWith('---\n')) {
    return { frontmatter: {}, markdownBody: trimmed.trim() }
  }

  const lines = trimmed.split('\n')
  let closingIndex = -1

  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index].trim() === '---') {
      closingIndex = index
      break
    }
  }

  if (closingIndex === -1) {
    return { frontmatter: {}, markdownBody: trimmed.trim() }
  }

  const headerLines = lines.slice(1, closingIndex)
  const body = lines.slice(closingIndex + 1).join('\n').trim()
  const frontmatter: Frontmatter = {}
  let activeKey: string | undefined

  for (const rawLine of headerLines) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) {
      continue
    }

    if (line.startsWith('- ') && activeKey === 'tags') {
      const nextTag = stripWrappingQuotes(line.slice(2))
      if (!nextTag) {
        continue
      }

      const existingTags = Array.isArray(frontmatter.tags) ? frontmatter.tags : []
      frontmatter.tags = [...existingTags, nextTag]
      continue
    }

    const separatorIndex = line.indexOf(':')
    if (separatorIndex === -1) {
      continue
    }

    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1)
    activeKey = key

    if (key === 'tags' && !value.trim()) {
      frontmatter.tags = []
      continue
    }

    frontmatter[key as keyof Frontmatter] = parseFrontmatterValue(key, value)
  }

  return {
    frontmatter,
    markdownBody: body,
  }
}

function createMutableFolder(name: string, path: string): MutableFolder {
  return {
    name,
    path,
    folders: new Map<string, MutableFolder>(),
    essays: [],
  }
}

function toTreeNodes(folder: MutableFolder): TreeNode[] {
  const sortedFolders = Array.from(folder.folders.values())
    .sort((a, b) => compareNames(a.name, b.name))
    .map((childFolder) => ({
      type: 'folder' as const,
      name: childFolder.name,
      path: childFolder.path,
      children: toTreeNodes(childFolder),
    }))

  const sortedEssays = [...folder.essays].sort((a, b) => compareNames(a.name, b.name))

  return [...sortedFolders, ...sortedEssays]
}

function parseEssays(): Essay[] {
  const entries = Object.entries(rawMarkdownModules).sort(([a], [b]) => compareNames(a, b))
  const essays: Essay[] = []

  for (const [modulePath, markdown] of entries) {
    const sourcePath = modulePath.replace(/^\/src\/content\//, '')
    const sourceSegments = sourcePath.split('/')
    const fileName = sourceSegments[sourceSegments.length - 1]?.replace(/\.md$/i, '') ?? 'untitled'
    const folderSegments = sourceSegments.slice(0, -1)
    const routeSegments = [...folderSegments.map(toKebabSegment), toKebabSegment(fileName)]
    const routePath = routeSegments.join('/')

    const parsed = parseMarkdownDocument(markdown)
    const frontmatter = parsed.frontmatter
    const markdownBody = parsed.markdownBody

    const title =
      toStringValue(frontmatter.title) ??
      extractHeading(markdownBody) ??
      fileName

    const summary = toStringValue(frontmatter.summary) ?? extractSummary(markdownBody)
    const draft = toDraftValue(frontmatter.draft)
    const wordCount = extractWordCount(markdownBody)

    if (draft && !includeDrafts) {
      continue
    }

    essays.push({
      sourcePath,
      routePath,
      title,
      date: toDateValue(frontmatter.date),
      lastUpdated: toDateValue(frontmatter.lastUpdated) ?? toDateValue(frontmatter.date),
      summary,
      tags: toTagsValue(frontmatter.tags),
      draft,
      wordCount,
      readingTimeMinutes: estimateReadingTime(wordCount),
      markdownBody,
    })
  }

  return essays
}

function buildTree(essays: Essay[]): TreeNode[] {
  const root = createMutableFolder('root', '')

  for (const essay of essays) {
    const sourceParts = essay.sourcePath.split('/')
    const folderSourceParts = sourceParts.slice(0, -1)
    const routeParts = essay.routePath.split('/')
    const folderRouteParts = routeParts.slice(0, -1)
    const fileLabel = sourceParts[sourceParts.length - 1]?.replace(/\.md$/i, '') ?? essay.title

    let currentFolder = root

    for (let index = 0; index < folderSourceParts.length; index += 1) {
      const displayName = folderSourceParts[index]
      const routePath = folderRouteParts.slice(0, index + 1).join('/')

      if (!currentFolder.folders.has(routePath)) {
        currentFolder.folders.set(routePath, createMutableFolder(displayName, routePath))
      }

      const nextFolder = currentFolder.folders.get(routePath)
      if (nextFolder) {
        currentFolder = nextFolder
      }
    }

    currentFolder.essays.push({
      type: 'essay',
      name: fileLabel,
      path: essay.routePath,
      essay,
    })
  }

  return toTreeNodes(root)
}

export const essays = parseEssays()

export const essayByRoutePath = new Map<string, Essay>(
  essays.map((essay) => [essay.routePath, essay]),
)

export const rootTree = buildTree(essays)
