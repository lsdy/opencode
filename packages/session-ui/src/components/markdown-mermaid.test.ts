import { describe, expect, test } from "bun:test"
import { healMermaid, isMermaidLanguage } from "./markdown-mermaid"

describe("markdown Mermaid", () => {
  test("recognizes Mermaid fences case-insensitively", () => {
    expect(isMermaidLanguage("mermaid")).toBe(true)
    expect(isMermaidLanguage("MERMAID")).toBe(true)
    expect(isMermaidLanguage("typescript")).toBe(false)
    expect(isMermaidLanguage(undefined)).toBe(false)
  })

  test("drops an incomplete line and closes streamed subgraphs", () => {
    expect(
      healMermaid(`flowchart LR
  Root["App Composition Root"]

  subgraph Runtime["Shared Runtime"]
    Platform["Platform"]
    Registry["Server Reg`),
    ).toBe(`flowchart LR
  Root["App Composition Root"]

  subgraph Runtime["Shared Runtime"]
    Platform["Platform"]
end`)
  })

  test("keeps every completed line when a delta ends at a newline", () => {
    expect(healMermaid("flowchart LR\n  Root[Root]\n")).toBe("flowchart LR\n  Root[Root]")
  })
})
