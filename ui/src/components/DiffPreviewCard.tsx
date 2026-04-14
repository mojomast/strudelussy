import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { diffLines } from '@/lib/diffUtils'
import type { CodeDiff } from '@/types/project'

interface DiffPreviewCardProps {
  diff: CodeDiff
  status?: 'pending' | 'applied' | 'rejected'
  onApply?: () => void
  onReject?: () => void
}

const statusLabel: Record<NonNullable<DiffPreviewCardProps['status']>, string> = {
  pending: 'Awaiting review',
  applied: 'Applied',
  rejected: 'Rejected',
}

const DiffPreviewCard = ({ diff, status = 'pending', onApply, onReject }: DiffPreviewCardProps) => {
  const lines = diffLines(diff.before, diff.after)

  return (
    <Card className="border-purple-500/20 bg-black/40 shadow-none">
      <CardHeader className="space-y-3 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">AI Patch Preview</p>
            <p className="text-xs text-zinc-400">{diff.summary}</p>
          </div>
          <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-zinc-300">
            {statusLabel[status]}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-4">
        <div className="max-h-56 overflow-auto rounded-md border border-zinc-900 bg-zinc-950/90 p-3 font-mono text-xs">
          {lines.map((line, index) => (
            <div
              key={`${line.type}-${index}`}
              className={
                line.type === 'added'
                  ? 'text-emerald-300'
                  : line.type === 'removed'
                    ? 'text-rose-300'
                    : 'text-zinc-500'
              }
            >
              <span className="mr-2 inline-block w-4 text-zinc-600">
                {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
              </span>
              <span>{line.text || ' '}</span>
            </div>
          ))}
        </div>

        {status === 'pending' ? (
          <div className="flex gap-2">
            <Button className="bg-purple-600 text-white hover:bg-purple-500" onClick={onApply}>
              Apply
            </Button>
            <Button variant="outline" className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900" onClick={onReject}>
              Reject
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

export default DiffPreviewCard
