import DmxVisualization from './DmxVisualization'
import HalVisualizationAdapter from './HalVisualizationAdapter'
import type { DmxVisualizationData, VisualizationMode } from './types'

interface VisualizationSurfaceProps {
  mode?: VisualizationMode
  isPlaying: boolean
  audioAnalyser?: AnalyserNode | null
  dmxData?: DmxVisualizationData | null
  dmxBridgeUrl?: string
}

const VisualizationSurface = ({
  mode = 'hal',
  isPlaying,
  audioAnalyser,
  dmxData,
  dmxBridgeUrl,
}: VisualizationSurfaceProps) => {
  if (mode === 'dmx') {
    return <DmxVisualization data={dmxData} bridgeUrl={dmxBridgeUrl} />
  }

  return <HalVisualizationAdapter isPlaying={isPlaying} audioAnalyser={audioAnalyser} />
}

export default VisualizationSurface
