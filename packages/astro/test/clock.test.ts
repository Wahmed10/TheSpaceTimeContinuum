import { it, expect } from 'vitest';
import { SimulationClock } from '../src/clock/SimulationClock';
import { utcMsToTdb } from '../src/time/scales';
import {vi} from 'vitest';
it('preserves continuity, pauses, reverses and rejoins live', () => {
  let now = Date.UTC(2026, 8, 22);
  const c = new SimulationClock(() => now);
  const t = c.tick();
  now += 1000;
  expect(c.tick() - t).toBeCloseTo(1);
  c.pause();
  const p = c.tick();
  now += 3000;
  expect(c.tick()).toBe(p);
  c.setRate(-3600);
  now += 1000;
  expect(c.tick()).toBeCloseTo(p - 3600);
  c.setTime(utcMsToTdb(now) + 18000);
  c.goLive();
  now += 600;
  expect(c.tick()).toBeGreaterThan(utcMsToTdb(now));
  now += 600;
  expect(c.tick()).toBeCloseTo(utcMsToTdb(now));
  expect(c.mode).toBe('live');
});
it('handles far LIVE transitions, cancellation, zero rate, and invalid commands',()=>{let now=Date.UTC(2026,8,22);const c=new SimulationClock(()=>now);c.setTime(utcMsToTdb(now)+86400*30);c.goLive();now+=100;const old=c.tick();expect(c.state.fade).toBeGreaterThan(0);now+=150;expect(c.tick()).toBeLessThan(old);now+=150;c.tick();expect(c.mode).toBe('live');c.setRate(0);expect(c.mode).toBe('paused');c.play();expect(c.rate).toBe(0);c.play(10);now+=50;c.pause();c.goLive({animate:false});expect(c.tick()).toBeCloseTo(utcMsToTdb(now));expect(()=>c.setTime(Infinity)).toThrow();expect(()=>c.setRate(31557601)).toThrow();c.setTime(utcMsToTdb(Date.UTC(1900,0,1)));c.setRate(-31557600);now+=100;c.tick();expect(c.state.clamped).toBe(true);expect(c.mode).toBe('paused');});
it('uses its default wall clock and bounds subscription frequency',()=>{vi.useFakeTimers();vi.setSystemTime(Date.UTC(2026,8,22));const c=new SimulationClock();expect(c.tick()).toBeCloseTo(utcMsToTdb(Date.now()));let count=0;const stop=c.subscribe(()=>count++,{hz:100});for(let i=0;i<100;i++){vi.advanceTimersByTime(10);c.tick();}expect(count).toBe(4);stop();vi.useRealTimers();});
it('throttles subscribers and clamps playback', () => {
  let now = Date.UTC(2026, 8, 22);
  const c = new SimulationClock(() => now);
  let calls = 0;
  const off = c.subscribe(() => calls++);
  for (let i = 0; i < 1000; i++) {
    now += 1;
    c.tick();
  }
  expect(calls).toBeLessThanOrEqual(4);
  off();
  c.setTime(utcMsToTdb(Date.UTC(2101, 0, 1) - 1000));
  c.play(31557600);
  now += 1000;
  c.tick();
  expect(c.mode).toBe('paused');
  expect(c.state.clamped).toBe(true);
  expect(() => c.setRate(NaN)).toThrow();
});
