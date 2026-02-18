/**
 * Adaptive Layout Engine (ALE) — Version 1
 * 
 * Rule-based engine that uses behavioral event data to make subtle,
 * incremental adjustments to the spatial grid layout per-session.
 */

// ── Signal weights (tunable defaults) ──────────────────────────────
export const DEFAULT_SIGNAL_WEIGHTS: Record<string, number> = {
  product_zoomed_l3: 5,
  product_added_to_cart: 10,
  product_saved: 8,
  pairing_accepted: 7,
  product_viewed_long: 4,    // hover > 5s
  product_viewed_medium: 2,  // hover > 2s
  product_skipped: -1,
  product_hover_bounce: -2,
  product_removed_from_cart: -5,
  pairing_rejected: -1,
  editorial_product_tag_clicked: 3,
  product_zoomed_l2: 3,
};

// ── Types ──────────────────────────────────────────────────────────
export interface ALEEvent {
  type: string;
  product_id?: string;
  hotzone_id?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface ALEAdjustment {
  product_id: string;
  scale_factor: number;       // 0.85 to 1.3 (1.0 = no change)
  position_offset: { x: number; y: number };
  priority_rank: number;
}

export type ALEIntensity = 'low' | 'medium' | 'high';

const INTENSITY_MULTIPLIER: Record<ALEIntensity, number> = {
  low: 0.5,
  medium: 1.0,
  high: 1.5,
};

const ACTIVATION_THRESHOLD = 10;
const DEBOUNCE_INTERVAL = 30_000; // 30s
const IDLE_THRESHOLD = 2_000;     // 2s

// ── Score → Scale Factor mapping ───────────────────────────────────
function scoreToBaseScale(score: number): number {
  if (score <= -5) return 0.85;
  if (score <= -1) return 0.90 + (score + 5) * 0.0125; // -4→0.9125, -1→0.95
  if (score === 0) return 1.0;
  if (score <= 5) return 1.0 + score * 0.02;            // 1→1.02, 5→1.10
  if (score <= 15) return 1.10 + (score - 6) * 0.01;    // 6→1.10, 15→1.19
  return 1.25 + Math.min(score - 16, 5) * 0.01;         // capped ~1.30
}

function applyIntensity(baseScale: number, intensity: ALEIntensity): number {
  const mult = INTENSITY_MULTIPLIER[intensity];
  const deviation = baseScale - 1.0;
  const adjusted = 1.0 + deviation * mult;
  return Math.max(0.85, Math.min(1.3, adjusted));
}

// ── ALE Engine class ───────────────────────────────────────────────
export class ALEEngine {
  private events: ALEEvent[] = [];
  private scores: Map<string, number> = new Map();
  private hotzoneScores: Map<string, number> = new Map();
  private adjustments: Map<string, ALEAdjustment> = new Map();
  private dirty = false;
  private lastEventTime = 0;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private intervalTimer: ReturnType<typeof setInterval> | null = null;
  private onUpdate: ((adjustments: Map<string, ALEAdjustment>) => void) | null = null;
  private intensity: ALEIntensity = 'medium';
  private enabled = true;
  private pinnedProducts: Set<string> = new Set();
  private weights: Record<string, number> = { ...DEFAULT_SIGNAL_WEIGHTS };

  constructor() {
    // Periodic recalculation every 30s
    this.intervalTimer = setInterval(() => {
      if (this.dirty && this.isActive()) {
        this.recalculate();
      }
    }, DEBOUNCE_INTERVAL);
  }

  // ── Configuration ─────────────────────────────────────────────
  configure(opts: {
    enabled?: boolean;
    intensity?: ALEIntensity;
    pinnedProductIds?: string[];
    weights?: Partial<Record<string, number>>;
    onUpdate?: (adjustments: Map<string, ALEAdjustment>) => void;
  }) {
    if (opts.enabled !== undefined) this.enabled = opts.enabled;
    if (opts.intensity) this.intensity = opts.intensity;
    if (opts.pinnedProductIds) this.pinnedProducts = new Set(opts.pinnedProductIds);
    if (opts.weights) this.weights = { ...DEFAULT_SIGNAL_WEIGHTS, ...opts.weights };
    if (opts.onUpdate) this.onUpdate = opts.onUpdate;
  }

  // ── Event ingestion ───────────────────────────────────────────
  pushEvent(event: ALEEvent) {
    if (!this.enabled) return;

    this.events.push(event);
    this.dirty = true;
    this.lastEventTime = Date.now();

    // Reset idle timer on each event
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      if (this.dirty && this.isActive()) {
        this.recalculate();
      }
    }, IDLE_THRESHOLD);
  }

  // ── Queries ───────────────────────────────────────────────────
  isActive(): boolean {
    return this.enabled && this.events.length >= ACTIVATION_THRESHOLD;
  }

  getEventCount(): number {
    return this.events.length;
  }

  getAdjustment(productId: string): ALEAdjustment | undefined {
    if (!this.isActive()) return undefined;
    if (this.pinnedProducts.has(productId)) return undefined;
    return this.adjustments.get(productId);
  }

  getHotzoneEmphasis(hotzoneId: string): number {
    if (!this.isActive()) return 1.0;
    const score = this.hotzoneScores.get(hotzoneId) || 0;
    const base = scoreToBaseScale(score * 0.3); // hotzones scale more subtly
    return applyIntensity(base, this.intensity);
  }

  getAllAdjustments(): Map<string, ALEAdjustment> {
    return this.adjustments;
  }

  // ── Core scoring logic ────────────────────────────────────────
  private recalculate() {
    this.scores.clear();
    this.hotzoneScores.clear();

    // Accumulate scores from events
    for (const event of this.events) {
      if (event.product_id) {
        const weight = this.getEventWeight(event);
        const current = this.scores.get(event.product_id) || 0;
        this.scores.set(event.product_id, current + weight);
      }
      if (event.hotzone_id) {
        const hzWeight = event.type === 'hotzone_entered' ? 2 : 
                         event.type === 'hotzone_exited' ? 0 : 1;
        const current = this.hotzoneScores.get(event.hotzone_id) || 0;
        this.hotzoneScores.set(event.hotzone_id, current + hzWeight);
      }
    }

    // Generate adjustments
    this.adjustments.clear();
    const allProducts = Array.from(this.scores.entries());
    
    // Sort by score descending for priority ranking
    allProducts.sort((a, b) => b[1] - a[1]);

    allProducts.forEach(([productId, score], index) => {
      if (this.pinnedProducts.has(productId)) return;

      const baseScale = scoreToBaseScale(score);
      const scaleFactor = applyIntensity(baseScale, this.intensity);

      this.adjustments.set(productId, {
        product_id: productId,
        scale_factor: scaleFactor,
        position_offset: { x: 0, y: 0 }, // position offsets kept minimal in v1
        priority_rank: index,
      });
    });

    this.dirty = false;
    this.onUpdate?.(this.adjustments);
  }

  private getEventWeight(event: ALEEvent): number {
    switch (event.type) {
      case 'product_zoomed': {
        const toLevel = event.metadata?.to_level as number;
        if (toLevel >= 3) return this.weights.product_zoomed_l3;
        if (toLevel >= 2) return this.weights.product_zoomed_l2;
        return 1;
      }
      case 'product_added_to_cart': return this.weights.product_added_to_cart;
      case 'product_removed_from_cart': return this.weights.product_removed_from_cart;
      case 'product_saved': return this.weights.product_saved;
      case 'pairing_accepted': return this.weights.pairing_accepted;
      case 'pairing_rejected': return this.weights.pairing_rejected;
      case 'product_viewed': {
        const duration = event.metadata?.duration as number;
        if (duration > 5000) return this.weights.product_viewed_long;
        if (duration > 2000) return this.weights.product_viewed_medium;
        return 0;
      }
      case 'product_skipped': return this.weights.product_skipped;
      case 'product_hover_bounce': return this.weights.product_hover_bounce;
      case 'editorial_product_tag_clicked': return this.weights.editorial_product_tag_clicked;
      default: return 0;
    }
  }

  // ── Reset ─────────────────────────────────────────────────────
  reset() {
    this.events = [];
    this.scores.clear();
    this.hotzoneScores.clear();
    this.adjustments.clear();
    this.dirty = false;
    this.onUpdate?.(this.adjustments);
  }

  // ── Cleanup ───────────────────────────────────────────────────
  destroy() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.intervalTimer) clearInterval(this.intervalTimer);
  }
}
