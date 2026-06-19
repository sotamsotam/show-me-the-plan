type HapticPattern = 'light' | 'medium' | 'success' | 'warning';

const HAPTIC_MS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 20,
  success: [12, 40, 12],
  warning: [20, 60, 20],
};

export function triggerHaptic(pattern: HapticPattern = 'light'): void {
  if (typeof window === 'undefined' || typeof navigator.vibrate !== 'function') {
    return;
  }

  try {
    navigator.vibrate(HAPTIC_MS[pattern]);
  } catch {
    // Ignore unsupported vibration calls.
  }
}
