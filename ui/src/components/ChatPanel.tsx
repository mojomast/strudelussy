import { useEffect, useMemo, useRef, useState } from 'react'
import { Bot, SendHorizonal, User2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import DiffPreviewCard from '@/components/DiffPreviewCard'
import type { ChatMessage } from '@/types/project'

interface ChatPanelProps {
  messages: ChatMessage[]
  isSending: boolean
  onSend: (content: string) => Promise<void>
  onApplyDiff: () => void
  onRejectDiff: () => void
}

const ChatPanel = ({ messages, isSending, onSend, onApplyDiff, onRejectDiff }: ChatPanelProps) => {
  const [value, setValue] = useState('')
  const threadRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = threadRef.current
    if (!container) return
    container.scrollTop = container.scrollHeight
  }, [messages, isSending])

  const canSend = useMemo(() => value.trim().length > 0 && !isSending, [value, isSending])

  const handleSubmit = async () => {
    const nextValue = value.trim()
    if (!nextValue || isSending) return
    setValue('')
    await onSend(nextValue)
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-900 bg-black/50">
      <div className="border-b border-zinc-900 px-5 py-4">
        <p className="text-sm font-semibold text-white">Session Chat</p>
        <p className="text-xs text-zinc-500">Prompt the bot, review patches, then decide what lands in the editor.</p>
      </div>

      <div ref={threadRef} className="flex-1 space-y-4 overflow-auto px-4 py-4">
        {messages.map((message) => (
          <div key={message.id} className="space-y-3">
            <div className="flex gap-3">
              <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-800 bg-zinc-950 text-zinc-300">
                {message.role === 'user' ? <User2 className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
                  <span>{message.role}</span>
                  <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="mt-2 whitespace-pre-wrap rounded-2xl border border-zinc-900 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-100">
                  {message.content}
                </div>
              </div>
            </div>

            {message.code_diff ? (
              <div className="pl-11">
                <DiffPreviewCard
                  diff={message.code_diff}
                  status={message.status}
                  onApply={onApplyDiff}
                  onReject={onRejectDiff}
                />
              </div>
            ) : null}
          </div>
        ))}

        {isSending ? (
          <div className="flex gap-3 pl-1 text-sm text-zinc-400">
            <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full border border-zinc-800 bg-zinc-950">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-2xl border border-zinc-900 bg-zinc-950/70 px-4 py-3">
              Bot is thinking...
            </div>
          </div>
        ) : null}
      </div>

      <div className="border-t border-zinc-900 p-4">
        <Textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              event.preventDefault()
              void handleSubmit()
            }
          }}
          placeholder="Describe a change, ask for a section, or request a fix..."
          className="min-h-[104px] resize-none border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-purple-500"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-zinc-500">Cmd/Ctrl+Enter sends. AI changes stay in review until you apply them.</p>
          <Button className="gap-2 bg-purple-600 text-white hover:bg-purple-500" onClick={() => void handleSubmit()} disabled={!canSend}>
            <SendHorizonal className="h-4 w-4" />
            Send
          </Button>
        </div>
      </div>
    </section>
  )
}

export default ChatPanel
