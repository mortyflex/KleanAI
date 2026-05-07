import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAuth } from '../../auth';
import { runSync } from '../sync-runner';

interface UseSyncBootstrapOptions {
  /** Test seam — defaults to the live AppState. */
  appState?: Pick<typeof AppState, 'addEventListener' | 'currentState'>;
  /** Test seam — defaults to the real runner. */
  trigger?: () => Promise<unknown>;
}

/**
 * Drains the sync queue automatically at the moments the app is most likely
 * to recover from being offline:
 *   - on mount, once an authenticated user is available
 *   - whenever the auth user id changes (login)
 *   - whenever the app returns to the foreground from background/inactive
 *
 * Failures are swallowed: this is a best-effort retry loop, never a UI
 * blocker. The runner's own in-flight guard prevents duplicate drains.
 */
export function useSyncBootstrap(options: UseSyncBootstrapOptions = {}): void {
  const { user } = useAuth();
  const trigger = options.trigger ?? runSync;
  const appState = options.appState ?? AppState;
  const lastAppState = useRef<AppStateStatus>(appState.currentState ?? 'active');

  // Drain on mount + whenever the auth user becomes available or changes.
  useEffect(() => {
    if (!user?.id) return;
    trigger().catch(() => {});
  }, [user?.id, trigger]);

  // Drain when the app returns to the foreground.
  useEffect(() => {
    const subscription = appState.addEventListener('change', (next) => {
      const prev = lastAppState.current;
      lastAppState.current = next;
      const becameActive
        = (prev === 'background' || prev === 'inactive') && next === 'active';
      if (becameActive) {
        trigger().catch(() => {});
      }
    });
    return () => {
      subscription.remove();
    };
  }, [appState, trigger]);
}
