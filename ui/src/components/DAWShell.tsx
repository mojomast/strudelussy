import type { ReactNode } from 'react'
import VersionHistoryPanel from '@/components/VersionHistoryPanel'

interface DAWShellProps {
  topbar: ReactNode
  chatPanel: ReactNode
  editorPanel: ReactNode
  dawPanel: ReactNode
  transportBar: ReactNode
  versionPanel: React.ComponentProps<typeof VersionHistoryPanel>
  overlay?: ReactNode
}

const DAWShell = ({ topbar, chatPanel, editorPanel, dawPanel, transportBar, versionPanel, overlay }: DAWShellProps) => {
  return (
    <>
      <main className="h-screen overflow-hidden bg-[#050505] px-2 py-2 text-white sm:px-3 sm:py-3">
        <div className="flex h-full min-h-0 flex-col gap-2 sm:gap-3">
          {topbar}
          <div className="grid min-h-0 flex-1 grid-cols-[300px_minmax(0,1fr)_380px] gap-2 overflow-hidden xl:grid-cols-[320px_minmax(0,1fr)_400px] 2xl:grid-cols-[340px_minmax(0,1fr)_420px]">
            <div className="min-h-0 overflow-hidden">
              {chatPanel}
            </div>
            <section className="flex min-h-0 flex-col gap-2 overflow-hidden">
              <div className="min-h-0 flex-1 overflow-hidden">
                {editorPanel}
              </div>
              <div className="grid shrink-0 gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(240px,280px)]">
                {transportBar}
                <VersionHistoryPanel {...versionPanel} />
              </div>
            </section>
            <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-900 bg-black/50">
              {dawPanel}
            </aside>
          </div>
        </div>
      </main>
      {overlay}
    </>
  )
}

export default DAWShell
