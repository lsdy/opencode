let loaded: ReturnType<typeof loadMermaid> | undefined
let sequence = 0
let theme: "dark" | "default" | undefined
let rendering = false
const pending = new Map<string, { source: string; streaming: boolean; resolve: (svg: string | undefined) => void }>()

export function isMermaidLanguage(language: string | undefined) {
  return language?.toLowerCase() === "mermaid"
}

export function renderMermaid(key: string, source: string, streaming: boolean) {
  return new Promise<string | undefined>((resolve) => {
    pending.get(key)?.resolve(undefined)
    pending.delete(key)
    pending.set(key, { source, streaming, resolve })
    void drain()
  })
}

async function drain() {
  if (rendering) return
  const next = pending.entries().next().value
  if (!next) return
  rendering = true
  const [key, request] = next
  pending.delete(key)
  const svg = await drawMermaid(request.source, request.streaming).catch(() => undefined)
  request.resolve(svg)
  const latest = pending.get(key)
  if (svg && latest?.streaming) {
    pending.delete(key)
    latest.resolve(svg)
  }
  rendering = false
  return drain()
}

async function drawMermaid(source: string, streaming: boolean) {
  const mermaid = await (loaded ??= loadMermaid())
  const mode = document.documentElement.dataset.colorScheme
  const next = mode === "light" ? "default" : mode === "dark" ? "dark" : preferredTheme()
  if (theme !== next) {
    theme = next
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme,
      flowchart: { htmlLabels: false },
    })
  }
  const input = streaming ? healMermaid(source) : source
  if (!input || !(await mermaid.parse(input, { suppressErrors: true }))) return
  return (await mermaid.render(`markdown-mermaid-${sequence++}`, input)).svg
}

export function healMermaid(source: string) {
  const newline = source.lastIndexOf("\n")
  if (newline < 0) return
  const lines = source.slice(0, newline).split("\n")
  const open = lines.reduce((depth, line) => {
    if (/^\s*subgraph(?:\s|$)/i.test(line)) return depth + 1
    if (/^\s*end\s*;?\s*$/i.test(line)) return Math.max(0, depth - 1)
    return depth
  }, 0)
  return [...lines, ...Array.from({ length: open }, () => "end")].join("\n")
}

function preferredTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? ("dark" as const) : ("default" as const)
}

async function loadMermaid() {
  const { default: mermaid } = await import("mermaid/dist/mermaid.esm.min.mjs")
  return mermaid
}
