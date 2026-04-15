import type { SavedPromptPreset, SystemPromptMode } from '@/types/project'
import { Disc3 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ProjectTopbarProps {
  projectName: string
  masterVolume: number
  customApiEndpoint: string
  customApiKey: string
  customSystemPrompt: string
  promptPresetName: string
  savedPromptPresets: SavedPromptPreset[]
  selectedModel: string
  systemPromptMode: SystemPromptMode
  availableModels: string[]
  isLoadingModels: boolean
  modelLoadError: string | null
  showVisualization: boolean
  onProjectNameChange: (name: string) => void
  onMasterVolumeChange: (volume: number) => void
  onCustomApiEndpointChange: (endpoint: string) => void
  onCustomApiKeyChange: (apiKey: string) => void
  onCustomSystemPromptChange: (prompt: string) => void
  onLoadDefaultPromptTemplate: () => void
  onLoadImprovedPromptTemplate: () => void
  onPromptPresetNameChange: (label: string) => void
  onSavePromptPreset: () => void
  onLoadSavedPromptPreset: (content: string) => void
  onModelChange: (model: string) => void
  onSystemPromptModeChange: (mode: SystemPromptMode) => void
  onLoadModels: () => void
  onToggleVisualization: () => void
  onNewProject: () => void
  onLoadDemo: () => void
  onExportTxt: () => void
  onExportProject: () => void
  onShare: () => void
  onToggleShortcuts: () => void
}

const toolbarInputClass = 'h-8 rounded-xl border border-zinc-800 bg-zinc-950/70 px-2 text-xs text-white outline-none transition focus:border-purple-500'

const ProjectTopbar = ({
  projectName,
  masterVolume,
  customApiEndpoint,
  customApiKey,
  customSystemPrompt,
  promptPresetName,
  savedPromptPresets,
  selectedModel,
  systemPromptMode,
  availableModels,
  isLoadingModels,
  modelLoadError,
  showVisualization,
  onProjectNameChange,
  onMasterVolumeChange,
  onCustomApiEndpointChange,
  onCustomApiKeyChange,
  onCustomSystemPromptChange,
  onLoadDefaultPromptTemplate,
  onLoadImprovedPromptTemplate,
  onPromptPresetNameChange,
  onSavePromptPreset,
  onLoadSavedPromptPreset,
  onModelChange,
  onSystemPromptModeChange,
  onLoadModels,
  onToggleVisualization,
  onNewProject,
  onLoadDemo,
  onExportTxt,
  onExportProject,
  onShare,
  onToggleShortcuts,
}: ProjectTopbarProps) => {
  return (
    <header className="rounded-2xl border border-zinc-900 bg-black/60 px-3 py-2 backdrop-blur-xl sm:px-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3 overflow-x-auto">
          <div className="flex min-w-0 shrink-0 items-center gap-2 whitespace-nowrap">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-500 text-black shadow-[0_0_30px_rgba(139,92,246,0.25)]">
              <Disc3 className="h-5 w-5" />
            </div>
            <div className="shrink-0">
              <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">strudelussy</p>
              <p className="text-xs text-zinc-300">AI-powered Strudel DAW workspace</p>
            </div>
            <input
              value={projectName}
              onChange={(event) => onProjectNameChange(event.target.value)}
              className={`${toolbarInputClass} min-w-[220px] font-semibold`}
            />
          </div>

          <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
            <select
              value={systemPromptMode}
              onChange={(event) => onSystemPromptModeChange(event.target.value as SystemPromptMode)}
              className={`${toolbarInputClass} min-w-[170px]`}
            >
              <option value="legacy-toaster">Legacy toaster prompt</option>
              <option value="strudelussy">Strudelussy prompt</option>
            </select>
            <select
              value={selectedModel}
              onChange={(event) => onModelChange(event.target.value)}
              className={`${toolbarInputClass} min-w-[200px]`}
            >
              {availableModels.map((model) => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
            <Button size="toolbar" variant="outline" className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900" onClick={onLoadModels} disabled={isLoadingModels}>
              {isLoadingModels ? 'Loading...' : 'Load Models'}
            </Button>
            <Button size="toolbar" variant="outline" className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900" onClick={onToggleVisualization}>
              {showVisualization ? 'Viz On' : 'Viz Off'}
            </Button>
            <label className="flex h-8 min-w-[154px] shrink-0 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/70 px-2 text-xs text-zinc-400">
              <span>Master</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={masterVolume}
                onChange={(event) => onMasterVolumeChange(Number(event.target.value))}
                className="w-20 accent-purple-500"
              />
              <span className="w-9 text-right text-[11px] text-zinc-300">{Math.round(masterVolume * 100)}%</span>
            </label>
          </div>

          <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
            <Button size="toolbar" variant="outline" className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900" onClick={onNewProject}>
              New Project
            </Button>
            <Button size="toolbar" variant="outline" className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900" onClick={onLoadDemo}>
              Load Demo
            </Button>
            <Button size="toolbar" variant="outline" className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900" onClick={onExportTxt}>
              Export .txt
            </Button>
            <Button size="toolbar" variant="outline" className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900" onClick={onExportProject}>
              Export .strudel
            </Button>
            <Button size="toolbar" variant="outline" className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900" onClick={onShare}>
              Share
            </Button>
            <Button size="toolbar" variant="outline" className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900" onClick={onToggleShortcuts}>
              Shortcuts
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 overflow-x-auto">
          <div className="flex shrink-0 items-start gap-2 whitespace-nowrap">
            <textarea
              value={customSystemPrompt}
              onChange={(event) => onCustomSystemPromptChange(event.target.value)}
              placeholder="Optional system prompt override"
              className="h-16 min-w-[300px] rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-xs text-white outline-none transition focus:border-purple-500"
            />
            <div className="flex shrink-0 flex-col gap-2">
              <div className="flex gap-2">
                <Button size="toolbar" variant="outline" className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900" onClick={onLoadDefaultPromptTemplate}>
                  Load Default
                </Button>
                <Button size="toolbar" variant="outline" className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900" onClick={onLoadImprovedPromptTemplate}>
                  Load Improved
                </Button>
              </div>
              <div className="flex gap-2">
                <select
                  value=""
                  onChange={(event) => {
                    const preset = savedPromptPresets.find((entry) => entry.id === event.target.value)
                    if (preset) onLoadSavedPromptPreset(preset.content)
                  }}
                  className={`${toolbarInputClass} min-w-[170px]`}
                >
                  <option value="">Load saved prompt</option>
                  {savedPromptPresets.map((preset) => (
                    <option key={preset.id} value={preset.id}>{preset.label}</option>
                  ))}
                </select>
                <input
                  value={promptPresetName}
                  onChange={(event) => onPromptPresetNameChange(event.target.value)}
                  placeholder="Prompt preset name"
                  className={`${toolbarInputClass} min-w-[170px]`}
                />
                <Button size="toolbar" variant="outline" className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900" onClick={onSavePromptPreset}>
                  Save Prompt
                </Button>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
            <input
              value={customApiEndpoint}
              onChange={(event) => onCustomApiEndpointChange(event.target.value)}
              placeholder="Custom API endpoint"
              className={`${toolbarInputClass} min-w-[220px]`}
            />
            <input
              type="password"
              value={customApiKey}
              onChange={(event) => onCustomApiKeyChange(event.target.value)}
              placeholder="Custom API key"
              className={`${toolbarInputClass} min-w-[190px]`}
            />
          </div>

          <div className="flex shrink-0 items-center gap-2 whitespace-nowrap text-xs text-zinc-500">
            <span>{customApiEndpoint && customApiKey ? 'Custom provider fields are populated' : 'Using built-in OpenRouter Gemini 2.5 Flash'}</span>
            <span>{modelLoadError ?? (isLoadingModels ? 'Loading models...' : 'Model list ready')}</span>
          </div>
        </div>

      </div>
    </header>
  )
}

export default ProjectTopbar
