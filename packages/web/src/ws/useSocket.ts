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

    socket = io(SERVER_URL, { transports: ['websocket', 'polling'], auth: { token } });

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
