import confetti from 'canvas-confetti';

type ConfettiType = 'activity' | 'trip' | 'photo' | 'generic';

interface ConfettiOptions {
  particleCount?: number;
  spread?: number;
  origin?: { x: number; y: number };
}

/**
 * Hook for triggering celebratory confetti animations
 * Different animation styles based on the type of celebration
 */
export function useConfetti() {
  const triggerConfetti = (type: ConfettiType = 'generic', options?: ConfettiOptions) => {
    const baseConfig = {
      particleCount: options?.particleCount || 100,
      spread: options?.spread || 70,
      origin: options?.origin || { y: 0.6, x: 0.5 },
      disableForReducedMotion: true,
    };

    switch (type) {
      case 'activity':
        // Quick burst for activity completion
        confetti({
          ...baseConfig,
          particleCount: 50,
          spread: 60,
          colors: ['#10b981', '#34d399', '#6ee7b7'], // Green tones
        });
        break;

      case 'trip':
        // Grand celebration for trip completion
        // Fire from both sides
        const duration = 2000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval = window.setInterval(() => {
          const timeLeft = animationEnd - Date.now();
          if (timeLeft <= 0) {
            clearInterval(interval);
            return;
          }

          const particleCount = 50 * (timeLeft / duration);

          // Shoot from left and right
          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
            colors: ['#fbbf24', '#f59e0b', '#d97706', '#10b981', '#3b82f6'],
          });
          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
            colors: ['#fbbf24', '#f59e0b', '#d97706', '#10b981', '#3b82f6'],
          });
        }, 250);
        break;

      case 'photo':
        // Sparkle effect for first photo
        confetti({
          ...baseConfig,
          particleCount: 30,
          spread: 50,
          shapes: ['circle'],
          colors: ['#fbbf24', '#f59e0b', '#ffffff'],
          scalar: 0.8,
        });
        break;

      case 'generic':
      default:
        confetti(baseConfig);
        break;
    }
  };

  return { triggerConfetti };
}

export default useConfetti;
