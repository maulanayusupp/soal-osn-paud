// =============================================================================
// The two sounds a practice session makes.
//
// Synthesised with the Web Audio API rather than shipped as files: two short
// tones cost nothing to download, never 404, and can be tuned in code. They are
// deliberately soft and short — this plays next to a small child's ear, over and
// over, and a harsh buzzer for a wrong answer teaches the wrong thing.
//
// An AudioContext may only start from a user gesture, so it is created on the
// first answer (which is a tap) and reused after that.
// =============================================================================
import { SOUND_STORAGE_KEY } from '~/config/practice.config'

type Tone = { hz: number; at: number; for: number; gain?: number }

/** A rising major triad: unmistakably "yes" without being loud. */
const CORRECT: Tone[] = [
  { hz: 660, at: 0, for: 0.11 },
  { hz: 880, at: 0.09, for: 0.11 },
  { hz: 1320, at: 0.18, for: 0.2, gain: 0.16 },
]

/** Two gentle descending notes: "not that one", not a buzzer. */
const WRONG: Tone[] = [
  { hz: 300, at: 0, for: 0.14 },
  { hz: 225, at: 0.12, for: 0.22 },
]

let context: AudioContext | null = null

function ensureContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!context) context = new Ctor()
  // Safari suspends the context when the tab loses focus.
  if (context.state === 'suspended') void context.resume()
  return context
}

function play(tones: Tone[]) {
  const ctx = ensureContext()
  if (!ctx) return

  for (const tone of tones) {
    const oscillator = ctx.createOscillator()
    const amp = ctx.createGain()
    const start = ctx.currentTime + tone.at
    const end = start + tone.for
    const peak = tone.gain ?? 0.13

    // A triangle wave is round and flute-like; a sawtooth would be piercing.
    oscillator.type = 'triangle'
    oscillator.frequency.setValueAtTime(tone.hz, start)

    // Ramps rather than steps, or the note clicks at both ends.
    amp.gain.setValueAtTime(0.0001, start)
    amp.gain.exponentialRampToValueAtTime(peak, start + 0.02)
    amp.gain.exponentialRampToValueAtTime(0.0001, end)

    oscillator.connect(amp).connect(ctx.destination)
    oscillator.start(start)
    oscillator.stop(end + 0.02)
  }
}

export function useSoundEffects() {
  // Shared so the header toggle and the practice stage never disagree.
  const muted = useState('sound-muted', () => false)

  onMounted(() => {
    try {
      muted.value = window.localStorage.getItem(SOUND_STORAGE_KEY) === 'muted'
    } catch {
      /* Storage blocked — default to audible. */
    }
  })

  function persist() {
    try {
      window.localStorage.setItem(SOUND_STORAGE_KEY, muted.value ? 'muted' : 'on')
    } catch {
      /* Nothing to do. */
    }
  }

  function toggle() {
    muted.value = !muted.value
    persist()
    // Confirm the un-mute audibly; the gesture also unlocks the context.
    if (!muted.value) play(CORRECT.slice(0, 1))
  }

  function playCorrect() {
    if (!muted.value) play(CORRECT)
  }

  function playWrong() {
    if (!muted.value) play(WRONG)
  }

  return { muted, toggle, playCorrect, playWrong }
}
