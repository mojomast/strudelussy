import { lazy, Suspense } from 'react'

const HalVisualization = lazy(() => import('@/components/HalVisualization'))

interface HalVisualizationAdapterProps {
  isPlaying: boolean
  audioAnalyser?: AnalyserNode | null
}

const HalVisualizationAdapter = ({ isPlaying, audioAnalyser }: HalVisualizationAdapterProps) => {
  if (!audioAnalyser) {
    return null
  }

  return (
    <Suspense fallback={null}>
      <HalVisualization
        isPlaying={isPlaying}
        isListening={false}
        audioAnalyser={audioAnalyser}
      />
    </Suspense>
  )
}

export default HalVisualizationAdapter
