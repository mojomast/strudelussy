import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

type DrumVoice = 'bd' | 'sd' | 'hh'
type DrumBank = 'RolandTR808' | 'RolandTR909' | 'RolandTR707'

interface VoiceConfig {
  voice: DrumVoice
  label: string
  steps: number
  beats: number
  offset: number
  bank: DrumBank
  gain: number
}

interface RhythmGeneratorProps {
  collapsed: boolean
  onToggle: () => void
  onInjectCode: (snippet: string) => void
}

const INITIAL_CONFIGS: VoiceConfig[] = [
  { voice: 'bd', label: 'Kick', steps: 16, beats: 3, offset: 0, bank: 'RolandTR808', gain: 0.9 },
  { voice: 'sd', label: 'Snare', steps: 16, beats: 2, offset: 0, bank: 'RolandTR808', gain: 0.8 },
  { voice: 'hh', label: 'Hi-Hat', steps: 8, beats: 6, offset: 0, bank: 'RolandTR808', gain: 0.6 },
]

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const buildSnippetLine = (config: VoiceConfig) => {
  const offsetPart = config.offset > 0 ? `,${config.offset}` : ''
  return `$: s("${config.voice}(${config.beats},${config.steps}${offsetPart})").bank("${config.bank}").gain(${config.gain})`
}

const RhythmGenerator = ({ collapsed, onToggle, onInjectCode }: RhythmGeneratorProps) => {
  const [configs, setConfigs] = useState(INITIAL_CONFIGS)

  const snippet = useMemo(() => configs.map(buildSnippetLine).join('\n'), [configs])

  return (
    <Card className="border-zinc-900 bg-black/40 shadow-none">
      <CardContent className="space-y-3 p-3 sm:p-4">
        <button type="button" onClick={onToggle} className="flex w-full items-center justify-between text-left">
          <div>
            <p className="text-sm font-semibold text-white">Rhythm Generator</p>
            <p className="text-xs text-zinc-500">Build Euclidean drum lines and append them to the editor.</p>
          </div>
          {collapsed ? <ChevronRight className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
        </button>

        {!collapsed ? (
          <div className="space-y-3">
            {configs.map((config, index) => (
              <div key={config.voice} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-100">{config.label}</span>
                  <span className="text-xs uppercase tracking-[0.16em] text-zinc-500">{config.voice}</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-4">
                  <label className="text-xs text-zinc-400">
                    Steps
                    <input
                      type="number"
                      min={4}
                      max={32}
                      value={config.steps}
                      onChange={(event) => {
                        const steps = clamp(Number(event.target.value) || config.steps, 4, 32)
                        setConfigs((current) => current.map((item, itemIndex) => itemIndex === index
                          ? { ...item, steps, beats: clamp(item.beats, 1, steps), offset: clamp(item.offset, 0, steps - 1) }
                          : item))
                      }}
                      className="mt-1 w-full rounded-lg border border-zinc-800 bg-black/60 px-2 py-1.5 text-sm text-white outline-none focus:border-purple-500"
                    />
                  </label>
                  <label className="text-xs text-zinc-400">
                    Beats
                    <input
                      type="number"
                      min={1}
                      max={config.steps}
                      value={config.beats}
                      onChange={(event) => {
                        const beats = clamp(Number(event.target.value) || config.beats, 1, config.steps)
                        setConfigs((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, beats } : item))
                      }}
                      className="mt-1 w-full rounded-lg border border-zinc-800 bg-black/60 px-2 py-1.5 text-sm text-white outline-none focus:border-purple-500"
                    />
                  </label>
                  <label className="text-xs text-zinc-400">
                    Offset
                    <input
                      type="number"
                      min={0}
                      max={Math.max(0, config.steps - 1)}
                      value={config.offset}
                      onChange={(event) => {
                        const offset = clamp(Number(event.target.value) || 0, 0, Math.max(0, config.steps - 1))
                        setConfigs((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, offset } : item))
                      }}
                      className="mt-1 w-full rounded-lg border border-zinc-800 bg-black/60 px-2 py-1.5 text-sm text-white outline-none focus:border-purple-500"
                    />
                  </label>
                  <label className="text-xs text-zinc-400">
                    Bank
                    <select
                      value={config.bank}
                      onChange={(event) => {
                        const bank = event.target.value as DrumBank
                        setConfigs((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, bank } : item))
                      }}
                      className="mt-1 w-full rounded-lg border border-zinc-800 bg-black/60 px-2 py-1.5 text-sm text-white outline-none focus:border-purple-500"
                    >
                      <option value="RolandTR808">RolandTR808</option>
                      <option value="RolandTR909">RolandTR909</option>
                      <option value="RolandTR707">RolandTR707</option>
                    </select>
                  </label>
                </div>
              </div>
            ))}

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3 font-mono text-xs text-zinc-200 whitespace-pre-wrap">
              {snippet}
            </div>

            <Button className="bg-purple-600 text-white hover:bg-purple-500" onClick={() => onInjectCode(snippet)}>
              Inject into Editor
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

export default RhythmGenerator
