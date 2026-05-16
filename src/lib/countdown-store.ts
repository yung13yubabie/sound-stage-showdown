/**
 * 集中式倒數時間管理
 * 全站只用一個 setInterval(1s),所有 useCountdown 訂閱者統一拿到 now()。
 * 避免列表頁每張卡各自起 timer 造成記憶體與 re-render 爆量。
 */

import { useEffect, useState } from "react";

type Listener = (now: number) => void;

class CountdownStore {
  private listeners = new Set<Listener>();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private currentNow = Date.now();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    if (!this.intervalId) this.start();
    listener(this.currentNow);
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) this.stop();
    };
  }

  private start() {
    this.intervalId = setInterval(() => {
      this.currentNow = Date.now();
      this.listeners.forEach((l) => l(this.currentNow));
    }, 1000);
  }

  private stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

const store = new CountdownStore();

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  isPast: boolean;
}

export function diffToCountdown(targetMs: number, nowMs: number): Countdown {
  const totalMs = targetMs - nowMs;
  if (totalMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, isPast: true };
  }
  const seconds = Math.floor(totalMs / 1000) % 60;
  const minutes = Math.floor(totalMs / (1000 * 60)) % 60;
  const hours = Math.floor(totalMs / (1000 * 60 * 60)) % 24;
  const days = Math.floor(totalMs / (1000 * 60 * 60 * 24));
  return { days, hours, minutes, seconds, totalMs, isPast: false };
}

export function useCountdown(targetIso: string | null | undefined): Countdown | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!targetIso) return;
    return store.subscribe(setNow);
  }, [targetIso]);
  if (!targetIso) return null;
  const t = Date.parse(targetIso);
  if (Number.isNaN(t)) return null;
  return diffToCountdown(t, now);
}

export function formatCountdown(c: Countdown): string {
  if (c.isPast) return "已開始";
  if (c.days > 0) return `${c.days} 天 ${String(c.hours).padStart(2, "0")}:${String(c.minutes).padStart(2, "0")}:${String(c.seconds).padStart(2, "0")}`;
  return `${String(c.hours).padStart(2, "0")}:${String(c.minutes).padStart(2, "0")}:${String(c.seconds).padStart(2, "0")}`;
}
