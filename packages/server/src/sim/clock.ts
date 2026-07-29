class SimClock {
  running = true;
  speed = 1;

  pause(): void {
    this.running = false;
  }

  resume(): void {
    this.running = true;
  }

  setSpeed(speed: number): void {
    this.speed = Math.max(0.1, Math.min(5, speed));
  }

  /** Scales a base interval by the inverse of speed: 2x speed -> half the wait. */
  scaledInterval(baseMs: number): number {
    return baseMs / this.speed;
  }
}

export const clock = new SimClock();
