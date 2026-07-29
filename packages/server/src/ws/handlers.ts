import type { Server } from 'socket.io';
import type { ServerEvent } from 'shared';
import { store } from '../state/store.js';
import { schedulingStore } from '../state/schedulingStore.js';
import { reconciliationStore } from '../state/reconciliationStore.js';
import { crmStore } from '../state/crmStore.js';
import { documentStore } from '../state/documentStore.js';
import { settlementStore } from '../state/settlementStore.js';
import { complianceStore } from '../state/complianceStore.js';
import { auditStore } from '../state/auditStore.js';
import { alertStore } from '../state/alertStore.js';
import { counterpartyStore } from '../state/counterpartyStore.js';

const AUDIT_VISIBLE_ROLES = new Set(['admin', 'compliance', 'credit_risk']);

export function registerHandlers(io: Server): void {
  io.on('connection', (socket) => {
    const snapshotEvent: ServerEvent = { type: 'snapshot', payload: store.snapshot() };
    socket.emit('serverEvent', snapshotEvent);

    const schedulingSnapshotEvent: ServerEvent = {
      type: 'schedulingSnapshot',
      payload: schedulingStore.snapshot(),
    };
    socket.emit('serverEvent', schedulingSnapshotEvent);

    const reconciliationSnapshotEvent: ServerEvent = {
      type: 'reconciliationSnapshot',
      payload: reconciliationStore.snapshot(),
    };
    socket.emit('serverEvent', reconciliationSnapshotEvent);

    const crmSnapshotEvent: ServerEvent = { type: 'crmSnapshot', payload: crmStore.snapshot() };
    socket.emit('serverEvent', crmSnapshotEvent);

    const documentSnapshotEvent: ServerEvent = { type: 'documentSnapshot', payload: documentStore.snapshot() };
    socket.emit('serverEvent', documentSnapshotEvent);

    const settlementSnapshotEvent: ServerEvent = { type: 'settlementSnapshot', payload: settlementStore.snapshot() };
    socket.emit('serverEvent', settlementSnapshotEvent);

    const complianceSnapshotEvent: ServerEvent = { type: 'complianceSnapshot', payload: complianceStore.snapshot() };
    socket.emit('serverEvent', complianceSnapshotEvent);

    if (AUDIT_VISIBLE_ROLES.has(socket.user.role)) {
      const auditSnapshotEvent: ServerEvent = { type: 'auditSnapshot', payload: auditStore.snapshot() };
      socket.emit('serverEvent', auditSnapshotEvent);
    }

    const alertSnapshotEvent: ServerEvent = { type: 'alertSnapshot', payload: alertStore.snapshot() };
    socket.emit('serverEvent', alertSnapshotEvent);
  });

  store.on('trade', (payload) => {
    const event: ServerEvent = { type: 'trade', payload };
    io.emit('serverEvent', event);
  });

  store.on('priceTick', (payload) => {
    const event: ServerEvent = { type: 'priceTick', payload };
    io.emit('serverEvent', event);
  });

  store.on('positionUpdate', (payload) => {
    const event: ServerEvent = { type: 'positionUpdate', payload };
    io.emit('serverEvent', event);
  });

  schedulingStore.on('voyageUpdate', (payload) => {
    const event: ServerEvent = { type: 'voyageUpdate', payload };
    io.emit('serverEvent', event);
  });

  schedulingStore.on('portCongestionUpdate', (payload) => {
    const event: ServerEvent = { type: 'portCongestionUpdate', payload };
    io.emit('serverEvent', event);
  });

  reconciliationStore.on('confirmationUpdate', (payload) => {
    const event: ServerEvent = { type: 'confirmationUpdate', payload };
    io.emit('serverEvent', event);
  });

  crmStore.on('profileUpdate', (payload) => {
    const event: ServerEvent = { type: 'profileUpdate', payload };
    io.emit('serverEvent', event);
  });

  crmStore.on('noteAdded', (payload) => {
    const event: ServerEvent = { type: 'noteAdded', payload };
    io.emit('serverEvent', event);
  });

  crmStore.on('contactsUpdate', (payload) => {
    const event: ServerEvent = { type: 'contactsUpdate', payload };
    io.emit('serverEvent', event);
  });

  documentStore.on('documentUpdate', (payload) => {
    const event: ServerEvent = { type: 'documentUpdate', payload };
    io.emit('serverEvent', event);
  });

  settlementStore.on('invoiceUpdate', (payload) => {
    const event: ServerEvent = { type: 'invoiceUpdate', payload };
    io.emit('serverEvent', event);
  });

  complianceStore.on('caseUpdate', (payload) => {
    const event: ServerEvent = { type: 'caseUpdate', payload };
    io.emit('serverEvent', event);
  });

  complianceStore.on('caseActivityAdded', (payload) => {
    const event: ServerEvent = { type: 'caseActivityAdded', payload };
    io.emit('serverEvent', event);
  });

  auditStore.on('auditAdded', (payload) => {
    const event: ServerEvent = { type: 'auditAdded', payload };
    for (const socket of io.of('/').sockets.values()) {
      if (AUDIT_VISIBLE_ROLES.has(socket.user.role)) socket.emit('serverEvent', event);
    }
  });

  alertStore.on('alertCreated', (payload) => {
    const event: ServerEvent = { type: 'alertCreated', payload };
    io.emit('serverEvent', event);
  });

  counterpartyStore.on('counterpartiesUpdate', (payload) => {
    const event: ServerEvent = { type: 'counterpartiesUpdate', payload };
    io.emit('serverEvent', event);
  });
}
