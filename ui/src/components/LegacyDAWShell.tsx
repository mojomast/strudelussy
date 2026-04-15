/* ============================================================================
   LegacyDAWShell.tsx — Preserved copy of the original DAWShell layout
   
   This is an EXACT copy of the pre-refactor DAWShell.tsx. It is rendered
   when the user toggles to "Legacy Mode" via Cmd/Ctrl+Shift+L.
   DO NOT MODIFY this file — it exists solely as a preservation artifact.
   ============================================================================ */

import type { ReactNode } from 'react'
import VersionHistoryPanel from '@/components/VersionHistoryPanel'

interface LegacyDAWShellProps {
  topbar: ReactNode
  chatPanel: ReactNode
  editorPanel: ReactNode
  vizPanel: ReactNode | null
  showVisualization?: boolean
  dawPanel: ReactNode
  transportBar: ReactNode
  versionPanel: React.ComponentProps<typeof VersionHistoryPanel>
  overlay?: ReactNode
}

const LegacyDAWShell = ({ topbar, chatPanel, editorPanel, vizPanel, showVisualization = true, dawPanel, transportBar, versionPanel, overlay }: LegacyDAWShellProps) => {
  return (
    <>
      <main className="h-screen overflow-hidden bg-[#050505] px-2 py-2 text-white sm:px-3 sm:py-3">
        <div className="flex h-full min-h-0 flex-col gap-2 sm:gap-3">
          {topbar}
          <div className="grid min-h-0 flex-1 grid-cols-[320px_minmax(0,1fr)_380px] gap-2 overflow-hidden xl:grid-cols-[340px_minmax(0,1fr)_400px] 2xl:grid-cols-[360px_minmax(0,1fr)_420px]">
            <div className="min-h-0 overflow-hidden">
              {chatPanel}
            </div>
            <section className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
                <div className="min-h-0 flex-1 overflow-hidden">
                  {editorPanel}
                </div>
                {showVisualization && vizPanel ? (
                  <div className="h-64 shrink-0 overflow-hidden rounded-2xl border border-zinc-900 bg-black/40">
                    {vizPanel}
                  </div>
                ) : null}
              </div>
              <div className="grid shrink-0 gap-2 overflow-auto lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] 2xl:grid-cols-[minmax(0,1fr)_minmax(260px,300px)_minmax(260px,300px)]">
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

export default LegacyDAWShell
