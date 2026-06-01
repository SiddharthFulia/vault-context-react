export function hasNativeAbortTimeout(): boolean {
  return (
    typeof AbortSignal !== 'undefined' &&
    typeof (AbortSignal as unknown as { timeout?: unknown }).timeout === 'function'
  );
}

/** AbortSignal that fires after `ms`. Polyfilled for Safari <17.4. */
export function createTimeoutSignal(ms: number): AbortSignal {
  if (hasNativeAbortTimeout()) {
    return (AbortSignal as unknown as { timeout: (ms: number) => AbortSignal }).timeout(ms);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(new DOMException('TimeoutError', 'TimeoutError')), ms);
  return controller.signal;
}

/** Combine multiple signals — aborts when any input aborts. */
export function composeSignals(signals: Array<AbortSignal | undefined | null>): AbortSignal {
  const real = signals.filter((s): s is AbortSignal => !!s);
  if (real.length === 0) return new AbortController().signal;
  if (real.length === 1) return real[0];

  const controller = new AbortController();
  const onAbort = (signal: AbortSignal) => () => controller.abort(signal.reason);

  for (const s of real) {
    if (s.aborted) {
      controller.abort(s.reason);
      return controller.signal;
    }
    s.addEventListener('abort', onAbort(s), { once: true });
  }
  return controller.signal;
}
