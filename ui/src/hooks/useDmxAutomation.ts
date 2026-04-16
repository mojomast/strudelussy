import { useEffect, useMemo, useRef, useState } from 'react'
import type { LightingProjectState } from '@/types/project'

export interface TrackActivity {
  activeTracks: string[]
  cycleStart: number
  cycleEnd: number
}

interface AutomationStatusEntry {
  group_id: string
  track_name: string
  intensity: number
  remaining_ms: number
}

interface UseDmxAutomationArgs {
  isPlaying: boolean
  dmxBridgeUrl: string | null
  lighting: LightingProjectState
  trackActivity: TrackActivity
  refreshDmxVisualization: () => Promise<void>
}

const postGroupIntensity = async (
  dmxBridgeUrl: string,
  groupId: string,
  intensity: number,
  refreshDmxVisualization: () => Promise<void>,
) => {
  await fetch(`${dmxBridgeUrl}/control/group`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ group_id: groupId, intensity }),
  })
  await refreshDmxVisualization()
}

export const useDmxAutomation = ({
  isPlaying,
  dmxBridgeUrl,
  lighting,
  trackActivity,
  refreshDmxVisualization,
}: UseDmxAutomationArgs) => {
  const [activeLightingGroup, setActiveLightingGroup] = useState<string | null>(null)
  const [automationStatus, setAutomationStatus] = useState<AutomationStatusEntry[]>([])
  const groupPulseTimersRef = useRef<Map<string, number>>(new Map())
  const stepTimerIdsRef = useRef<number[]>([])
  const lastGroupPulseKeyRef = useRef<string | null>(null)
  const groupPulseMetaRef = useRef<Map<string, { track_name: string; intensity: number; ends_at: number }>>(new Map())
  const lastTriggeredGroupRef = useRef<string | null>(null)
  const activeTrackKey = trackActivity.activeTracks.join('|')

  const stableTrackActivity = useMemo<TrackActivity>(() => ({
    activeTracks: [...trackActivity.activeTracks],
    cycleStart: trackActivity.cycleStart,
    cycleEnd: trackActivity.cycleEnd,
  }), [activeTrackKey, trackActivity.cycleEnd, trackActivity.cycleStart])

  const shouldTrackAutomationStatus = isPlaying || automationStatus.length > 0

  useEffect(() => {
    if (!shouldTrackAutomationStatus) {
      return
    }

    const interval = window.setInterval(() => {
      const now = Date.now()
      const next = [...groupPulseMetaRef.current.entries()]
        .map(([group_id, meta]) => ({
          group_id,
          track_name: meta.track_name,
          intensity: meta.intensity,
          remaining_ms: Math.max(0, Math.round(meta.ends_at - now)),
        }))
        .filter((entry) => entry.remaining_ms > 0)
      setAutomationStatus(next)
    }, 50)

    return () => window.clearInterval(interval)
  }, [shouldTrackAutomationStatus])

  useEffect(() => {
    if (isPlaying) {
      return
    }

    lastTriggeredGroupRef.current = null
    for (const timer of groupPulseTimersRef.current.values()) {
      window.clearTimeout(timer)
    }
    groupPulseTimersRef.current.clear()
    for (const timerId of stepTimerIdsRef.current) {
      window.clearTimeout(timerId)
    }
    stepTimerIdsRef.current = []
    groupPulseMetaRef.current.clear()
    lastGroupPulseKeyRef.current = null
    setAutomationStatus([])
    setActiveLightingGroup(null)
  }, [isPlaying])

  useEffect(() => {
    if (!isPlaying) {
      return
    }

    const activeTrackName = stableTrackActivity.activeTracks.find((trackName) =>
      lighting.group_bindings.some((binding) => binding.track_name === trackName),
    )

    if (!activeTrackName) {
      setActiveLightingGroup(null)
      return
    }

    const binding = lighting.group_bindings.find((candidate) => candidate.track_name === activeTrackName)
    if (!binding) {
      setActiveLightingGroup(null)
      return
    }

    setActiveLightingGroup(binding.group_id)
    const intensity = Math.max(0, Math.min(255, binding.intensity ?? 180))
    const holdMs = Math.max(50, Math.min(2000, binding.hold_ms ?? 150))
    const fadeMs = Math.max(0, Math.min(1000, binding.fade_ms ?? 30))
    const pulseKey = `${binding.track_name}:${binding.group_id}:${stableTrackActivity.cycleStart}`
    if (lastGroupPulseKeyRef.current === pulseKey) {
      return
    }

    if (!dmxBridgeUrl) {
      return
    }

    lastGroupPulseKeyRef.current = pulseKey
    lastTriggeredGroupRef.current = binding.group_id
    const pulseEnd = Date.now() + holdMs
    groupPulseMetaRef.current.set(binding.group_id, {
      track_name: binding.track_name,
      intensity,
      ends_at: pulseEnd,
    })

    void postGroupIntensity(dmxBridgeUrl, binding.group_id, intensity, refreshDmxVisualization).catch(() => undefined)

    const existingTimer = groupPulseTimersRef.current.get(binding.group_id)
    if (existingTimer) {
      window.clearTimeout(existingTimer)
    }

    const releaseTimer = window.setTimeout(() => {
      const fadeSteps = fadeMs > 0 ? Math.max(1, Math.round(fadeMs / 50)) : 1
      const nextStepTimerIds: number[] = []
      for (let step = 1; step <= fadeSteps; step += 1) {
        const stepTimerId = window.setTimeout(() => {
          const nextIntensity = Math.max(0, Math.round(intensity * (1 - step / fadeSteps)))
          void postGroupIntensity(dmxBridgeUrl, binding.group_id, nextIntensity, refreshDmxVisualization).catch(() => undefined)
          if (step === fadeSteps) {
            groupPulseMetaRef.current.delete(binding.group_id)
            stepTimerIdsRef.current = stepTimerIdsRef.current.filter((timerId) => timerId !== stepTimerId)
          }
        }, step * Math.max(1, Math.floor(fadeMs / Math.max(1, fadeSteps))))
        nextStepTimerIds.push(stepTimerId)
      }
      stepTimerIdsRef.current.push(...nextStepTimerIds)
      groupPulseTimersRef.current.delete(binding.group_id)
    }, holdMs)

    groupPulseTimersRef.current.set(binding.group_id, releaseTimer)

    return () => {
      for (const timer of groupPulseTimersRef.current.values()) {
        window.clearTimeout(timer)
      }
      groupPulseTimersRef.current.clear()
      for (const timerId of stepTimerIdsRef.current) {
        window.clearTimeout(timerId)
      }
      stepTimerIdsRef.current = []
    }
  }, [dmxBridgeUrl, isPlaying, lighting.group_bindings, refreshDmxVisualization, stableTrackActivity])

  return {
    activeLightingGroup,
    automationStatus,
  }
}
