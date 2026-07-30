import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { ServerEvent } from 'shared';
import { useAuthStore } from '../store/useAuthStore.js';
import { useMarketStore } from '../store/useMarketStore.js';
import { useSchedulingStore } from '../store/useSchedulingStore.js';
import { useReconciliationStore } from '../store/useReconciliationStore.js';
import { useCrmStore } from '../store/useCrmStore.js';
import { useDocumentStore } from '../store/useDocumentStore.js';
import { useSettlementStore } from '../store/useSettlementStore.js';
import { useComplianceStore } from '../store/useComplianceStore.js';
import { useAuditStore } from '../store/useAuditStore.js';
import { useAlertStore } from '../store/useAlertStore.js';

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:4000';

let socket: Socket | null = null;

/** Peeks at a JWT's `exp` claim without verifying the signature — fine here, we're only
 *  using our own already-trusted token to decide whether it's worth refreshing before
 *  connecting, not trusting an untrusted token's claims for anything security-relevant. */
function isExpiringSoon(token: string, bufferSeconds = 30): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]!.replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number };
    if (!payload.exp) return false;
    return payload.exp * 1000 - Date.now() < bufferSeconds * 1000;
  } catch {
    return false;
  }
}

/** The access token is short-lived (15m); a socket connection made with a stale one right
 *  after page load (e.g. reopening a tab hours later) would fail its handshake auth and
 *  never come online. Refresh first if the current token won't survive the handshake. */
async function ensureFreshToken(): Promise<string | null> {
  const { token, refresh } = useAuthStore.getState();
  if (!token) return null;
  if (!isExpiringSoon(token)) return token;
  return refresh();
}

export function useSocket(): void {
  const token = useAuthStore((s) => s.token);
  const setConnected = useMarketStore((s) => s.setConnected);
  const applyMarketEvent = useMarketStore((s) => s.applyEvent);
  const applySchedulingEvent = useSchedulingStore((s) => s.applyEvent);
  const applyReconciliationEvent = useReconciliationStore((s) => s.applyEvent);
  const applyCrmEvent = useCrmStore((s) => s.applyEvent);
  const applyDocumentEvent = useDocumentStore((s) => s.applyEvent);
  const applySettlementEvent = useSettlementStore((s) => s.applyEvent);
  const applyComplianceEvent = useComplianceStore((s) => s.applyEvent);
  const applyAuditEvent = useAuditStore((s) => s.applyEvent);
  const applyAlertEvent = useAlertStore((s) => s.applyEvent);

  useEffect(() => {
    if (!token) {
      socket?.disconnect();
      socket = null;
      setConnected(false);
      return;
    }

    // `auth` as a callback runs on every (re)connection attempt, not just the first —
    // so a reconnect after the access token has since expired also gets a fresh one.
    socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      auth: (cb) => ensureFreshToken().then((freshToken) => cb({ token: freshToken })),
    });

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onServerEvent = (event: ServerEvent) => {
      applyMarketEvent(event);
      applySchedulingEvent(event);
      applyReconciliationEvent(event);
      applyCrmEvent(event);
      applyDocumentEvent(event);
      applySettlementEvent(event);
      applyComplianceEvent(event);
      applyAuditEvent(event);
      applyAlertEvent(event);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('serverEvent', onServerEvent);

    return () => {
      socket?.off('connect', onConnect);
      socket?.off('disconnect', onDisconnect);
      socket?.off('serverEvent', onServerEvent);
      socket?.disconnect();
      socket = null;
    };
  }, [
    token,
    setConnected,
    applyMarketEvent,
    applySchedulingEvent,
    applyReconciliationEvent,
    applyCrmEvent,
    applyDocumentEvent,
    applySettlementEvent,
    applyComplianceEvent,
    applyAuditEvent,
    applyAlertEvent,
  ]);
}
