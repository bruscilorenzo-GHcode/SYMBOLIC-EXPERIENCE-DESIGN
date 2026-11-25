import type { MusicFeatures } from '@aura-spec/design-bridge'
import { analyzeSamples } from '@aura-spec/design-bridge'

export async function analyzeAudioFile(file: File): Promise<MusicFeatures> {
  const arrayBuffer = await file.arrayBuffer()
  const context = new AudioContext()
  try {
    const buffer = await context.decodeAudioData(arrayBuffer)
    return {
      ...analyzeSamples(mixToMono(buffer), buffer.sampleRate, { maxDurationS: 30 }),
      source: 'analysis',
    }
  } finally {
    await context.close()
  }
}

export async function analyzeLiveInput(seconds = 5): Promise<MusicFeatures> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Live microphone capture is not available')
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  })
  const context = new AudioContext()
  try {
    const source = context.createMediaStreamSource(stream)
    const analyser = context.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0
    source.connect(analyser)
    const frame = new Float32Array(analyser.fftSize)
    const chunks: Float32Array[] = []
    const frameCount = Math.max(1, Math.ceil(seconds * 20))
    for (let index = 0; index < frameCount; index += 1) {
      await new Promise((resolve) => setTimeout(resolve, 50))
      analyser.getFloatTimeDomainData(frame)
      chunks.push(new Float32Array(frame))
    }
    const totalSamples = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
    const mono = new Float32Array(totalSamples)
    let offset = 0
    for (const chunk of chunks) {
      mono.set(chunk, offset)
      offset += chunk.length
    }
    return {
      ...analyzeSamples(mono, context.sampleRate, { maxDurationS: seconds }),
      source: 'live',
    }
  } finally {
    stream.getTracks().forEach((track) => track.stop())
    await context.close()
  }
}

function mixToMono(buffer: AudioBuffer): Float32Array {
  const mono = new Float32Array(buffer.length)
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel)
    for (let index = 0; index < data.length; index += 1) {
      mono[index] = (mono[index] ?? 0) + (data[index] ?? 0) / buffer.numberOfChannels
    }
  }
  return mono
}
