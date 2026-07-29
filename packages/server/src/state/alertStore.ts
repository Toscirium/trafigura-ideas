import { EventEmitter } from 'node:events';
import { nanoid } from 'nanoid';
import type { AlertCategory, AlertItem, AlertSeverity, AlertSnapshotPayload } from 'shared';

const BUFFER_SIZE = 200;
/** If set, every alert is also POSTed here (Slack-compatible {text} body) — no-op unless configured. */
const WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL;

class AlertStore extends EventEmitter {
  readonly alerts: AlertItem[] = [];

  raise(category: AlertCategory, severity: AlertSeverity, message: string, entityType: string, entityId: string): AlertItem {
    const alert: AlertItem = {
      id: nanoid(10),
      createdAt: new Date().toISOString(),
      category,
      severity,
      message,
      entityType,
      entityId,
    };
    this.alerts.unshift(alert);
    if (this.alerts.length > BUFFER_SIZE) this.alerts.length = BUFFER_SIZE;
    this.emit('alertCreated', alert);

    if (WEBHOOK_URL) {
      fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `[${severity.toUpperCase()}] ${message}` }),
      }).catch((err) => console.error('[alerts] webhook delivery failed', err));
    }

    return alert;
  }

  snapshot(): AlertSnapshotPayload {
    return { alerts: [...this.alerts] };
  }
}

export const alertStore = new AlertStore();
