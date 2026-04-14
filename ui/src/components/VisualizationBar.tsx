interface VisualizationBarProps {
  isPlaying: boolean
  phase: number
}

const bars = Array.from({ length: 40 }, (_, index) => index)

const VisualizationBar = ({ isPlaying, phase }: VisualizationBarProps) => {
  return (
    <div className="flex h-16 items-end gap-1 rounded-2xl border border-zinc-900 bg-zinc-950/70 px-3 py-3">
      {bars.map((bar) => {
        const offset = (bar / bars.length + phase) % 1
        const height = isPlaying ? 18 + Math.sin(offset * Math.PI * 2) * 18 + (bar % 3) * 4 : 10 + (bar % 4) * 2
        return (
          <div
            key={bar}
            className="w-full rounded-full bg-gradient-to-t from-purple-600 via-cyan-500 to-zinc-100 transition-all duration-150"
            style={{ height: `${Math.max(8, height)}px`, opacity: isPlaying ? 0.9 : 0.35 }}
          />
        )
      })}
    </div>
  )
}

export default VisualizationBar
