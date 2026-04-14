import type { ReactNode } from 'react'
import VersionHistoryPanel from '@/components/VersionHistoryPanel'

interface DAWShellProps {
  topbar: ReactNode
  chatPanel: ReactNode
  editorPanel: ReactNode
  transportBar: ReactNode
  versionPanel: React.ComponentProps<typeof VersionHistoryPanel>
  overlay?: ReactNode
}

const DAWShell = ({ topbar, chatPanel, editorPanel, transportBar, versionPanel, overlay }: DAWShellProps) => {
  return (
    <>
      <main className="min-h-screen overflow-auto bg-[#050505] px-2 py-2 text-white sm:px-3 sm:py-3 lg:px-4 lg:py-4">
        <div className="mx-auto flex max-w-[1680px] flex-col gap-2 overflow-auto sm:gap-3">
          {topbar}

          <div className="grid gap-2 overflow-auto xl:grid-cols-[minmax(300px,0.34fr)_minmax(0,0.66fr)] 2xl:grid-cols-[minmax(340px,0.33fr)_minmax(0,0.67fr)]">
            {chatPanel}

            <section className="flex flex-col gap-3 overflow-auto">
              {editorPanel}
              <div className="grid min-h-0 gap-2 overflow-auto lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] 2xl:grid-cols-[minmax(0,1fr)_minmax(260px,300px)_minmax(260px,300px)]">
                {transportBar}
                <VersionHistoryPanel {...versionPanel} />
              </div>
            </section>
          </div>
        </div>
      </main>
      {overlay}
    </>
  )
}

export default DAWShell
