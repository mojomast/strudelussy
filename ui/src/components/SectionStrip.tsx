import { parseSections } from '@/lib/codeParser'
import type { SectionMarker } from '@/types/project'

interface SectionStripProps {
  sections: SectionMarker[]
  activeSection: string | null
  code: string
  onSelect: (section: SectionMarker) => void
}

const colors = [
  'from-purple-500/30 to-purple-500/10 border-purple-400/30',
  'from-cyan-500/30 to-cyan-500/10 border-cyan-400/30',
  'from-fuchsia-500/30 to-fuchsia-500/10 border-fuchsia-400/30',
  'from-emerald-500/30 to-emerald-500/10 border-emerald-400/30',
]

const SectionStrip = ({ sections, activeSection, code, onSelect }: SectionStripProps) => {
  if (sections.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-500">
        Add comments like `// [verse]` or `// [drop]` to surface navigable song sections.
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {sections.map((section, index) => {
        const color = colors[index % colors.length]
        const isActive = activeSection === section.label

        return (
          <button
            key={`${section.label}-${section.line}`}
            type="button"
            onClick={() => {
              const lineMatch = parseSections(code).find((candidate) => candidate.label === section.label && candidate.line === section.line) ?? section
              onSelect(lineMatch)
            }}
            className={`rounded-xl border bg-gradient-to-br px-3 py-2 text-left transition ${color} ${
              isActive ? 'scale-[1.02] text-white shadow-[0_0_20px_rgba(139,92,246,0.18)]' : 'text-zinc-300 hover:text-white'
            }`}
          >
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Section</div>
            <div className="text-sm font-medium">{section.label}</div>
          </button>
        )
      })}
    </div>
  )
}

export default SectionStrip
