// Haptic feedback utility for mobile devices
// Uses the Vibration API for tactile feedback

interface HapticPattern {
  light: number;
  medium: number;
  heavy: number;
  success: number[];
  warning: number[];
  error: number[];
  selection: number;
  impact: number;
}

class HapticFeedback {
  private isSupported: boolean;
  private isMobile: boolean;
  
  private patterns: HapticPattern = {
    light: 3,
    medium: 5,
    heavy: 10,
    success: [10, 50, 10, 50, 10], // Quick double pulse
    warning: [20, 100, 20],        // Single strong pulse
    error: [50, 100, 50, 100, 50], // Triple pulse
    selection: 2,                   // Very light tap
    impact: 15                      // Strong single tap
  };

  constructor() {
    this.isSupported = 'vibrate' in navigator;
    this.isMobile = /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
  }

  // Check if haptics are available
  get available(): boolean {
    return this.isSupported && this.isMobile;
  }

  // Light tap - for selections and hovers
  light = (): void => {
    if (this.available) {
      navigator.vibrate(this.patterns.light);
    }
  };

  // Medium tap - for button presses
  medium = (): void => {
    if (this.available) {
      navigator.vibrate(this.patterns.medium);
    }
  };

  // Heavy tap - for important actions
  heavy = (): void => {
    if (this.available) {
      navigator.vibrate(this.patterns.heavy);
    }
  };

  // Success pattern - for positive feedback
  success = (): void => {
    if (this.available) {
      navigator.vibrate(this.patterns.success);
    }
  };

  // Warning pattern - for alerts
  warning = (): void => {
    if (this.available) {
      navigator.vibrate(this.patterns.warning);
    }
  };

  // Error pattern - for errors
  error = (): void => {
    if (this.available) {
      navigator.vibrate(this.patterns.error);
    }
  };

  // Selection tap - very subtle
  selection = (): void => {
    if (this.available) {
      navigator.vibrate(this.patterns.selection);
    }
  };

  // Impact - for significant UI changes
  impact = (): void => {
    if (this.available) {
      navigator.vibrate(this.patterns.impact);
    }
  };

  // Custom pattern
  custom = (pattern: number | number[]): void => {
    if (this.available) {
      navigator.vibrate(pattern);
    }
  };

  // Stop any ongoing vibration
  stop = (): void => {
    if (this.available) {
      navigator.vibrate(0);
    }
  };
}

// Export singleton instance
export const haptics = new HapticFeedback();

// Export for use in React components
export const useHaptics = () => {
  return haptics;
};