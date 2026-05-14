import { renderHook, waitFor } from '@testing-library/react-native';
import type { AppStateStatus } from 'react-native';
import { useSyncBootstrap } from '../../src/features/sync/hooks/useSyncBootstrap';

type Listener = (next: AppStateStatus) => void;

const mockUseAuth = jest.fn();
jest.mock('../../src/features/auth', () => ({
  useAuth: () => mockUseAuth(),
}));

function makeAppStateMock(initial: AppStateStatus = 'active') {
  let listener: Listener | null = null;
  const subscription = { remove: jest.fn(() => { listener = null; }) };
  return {
    currentState: initial,
    addEventListener: jest.fn((event: string, fn: Listener) => {
      if (event !== 'change') throw new Error(`unexpected event ${event}`);
      listener = fn;
      return subscription;
    }),
    emit: (next: AppStateStatus) => {
      listener?.(next);
    },
    subscription,
  };
}

describe('useSyncBootstrap', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it('does not drain when there is no authenticated user', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const trigger = jest.fn().mockResolvedValue(undefined);
    const appState = makeAppStateMock();

    renderHook(() => useSyncBootstrap({ trigger, appState }));

    // Let any pending microtasks settle, then assert.
    await new Promise((r) => setTimeout(r, 0));
    expect(trigger).not.toHaveBeenCalled();
  });

  it('drains once on mount when an authenticated user is present', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u-1' } });
    const trigger = jest.fn().mockResolvedValue(undefined);
    const appState = makeAppStateMock();

    renderHook(() => useSyncBootstrap({ trigger, appState }));

    await waitFor(() => expect(trigger).toHaveBeenCalledTimes(1));
  });

  it('drains again when the app returns to the foreground from background', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u-1' } });
    const trigger = jest.fn().mockResolvedValue(undefined);
    const appState = makeAppStateMock('active');

    renderHook(() => useSyncBootstrap({ trigger, appState }));
    await waitFor(() => expect(trigger).toHaveBeenCalledTimes(1));

    // background → active = foreground
    appState.emit('background');
    appState.emit('active');

    await waitFor(() => expect(trigger).toHaveBeenCalledTimes(2));
  });

  it('does not drain on active → active transitions', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u-1' } });
    const trigger = jest.fn().mockResolvedValue(undefined);
    const appState = makeAppStateMock('active');

    renderHook(() => useSyncBootstrap({ trigger, appState }));
    await waitFor(() => expect(trigger).toHaveBeenCalledTimes(1));

    // No background dip → must not retrigger.
    appState.emit('active');

    await new Promise((r) => setTimeout(r, 0));
    expect(trigger).toHaveBeenCalledTimes(1);
  });

  it('swallows trigger failures so a single rejection does not crash the app', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u-1' } });
    const trigger = jest
      .fn<Promise<void>, []>()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValue(undefined);
    const appState = makeAppStateMock('active');

    renderHook(() => useSyncBootstrap({ trigger, appState }));

    // The mount-time drain rejects but must not throw out of the hook.
    await waitFor(() => expect(trigger).toHaveBeenCalledTimes(1));

    appState.emit('background');
    appState.emit('active');
    await waitFor(() => expect(trigger).toHaveBeenCalledTimes(2));
  });

  it('removes the AppState listener on unmount', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u-1' } });
    const trigger = jest.fn().mockResolvedValue(undefined);
    const appState = makeAppStateMock();

    const { unmount } = renderHook(() => useSyncBootstrap({ trigger, appState }));
    unmount();

    expect(appState.subscription.remove).toHaveBeenCalledTimes(1);
  });
});
