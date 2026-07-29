import type { FastifyInstance } from 'fastify';
import type { NewContactInput, NewNoteInput, UpdateProfileInput } from 'shared';
import { crmStore } from '../state/crmStore.js';
import { authenticate } from '../plugins/auth.js';
import { auditStore } from '../state/auditStore.js';

export function registerCrmRoutes(app: FastifyInstance): void {
  app.get('/api/crm/snapshot', async () => crmStore.snapshot());

  app.patch<{ Params: { id: string }; Body: UpdateProfileInput }>(
    '/api/crm/counterparties/:id',
    { preHandler: authenticate },
    async (req, reply) => {
      const updated = crmStore.updateProfile(req.params.id, req.body);
      if (!updated) {
        reply.code(404);
        return { error: 'Counterparty profile not found' };
      }
      auditStore.record(req.user!, 'counterparty.updateProfile', 'counterparty', req.params.id, req.body);
      return updated;
    },
  );

  app.post<{ Params: { id: string }; Body: NewNoteInput }>(
    '/api/crm/counterparties/:id/notes',
    { preHandler: authenticate },
    async (req, reply) => {
      const note = crmStore.addNote(req.params.id, req.body);
      auditStore.record(req.user!, 'counterparty.addNote', 'counterparty', req.params.id, { noteId: note.id });
      reply.code(201);
      return note;
    },
  );

  app.post<{ Params: { id: string }; Body: NewContactInput }>(
    '/api/crm/counterparties/:id/contacts',
    { preHandler: authenticate },
    async (req, reply) => {
      const contacts = crmStore.addContact(req.params.id, req.body);
      auditStore.record(req.user!, 'counterparty.addContact', 'counterparty', req.params.id, { name: req.body.name });
      reply.code(201);
      return contacts;
    },
  );

  app.delete<{ Params: { id: string; contactId: string } }>(
    '/api/crm/counterparties/:id/contacts/:contactId',
    { preHandler: authenticate },
    async (req) => {
      const contacts = crmStore.removeContact(req.params.id, req.params.contactId);
      auditStore.record(req.user!, 'counterparty.removeContact', 'counterparty', req.params.id, {
        contactId: req.params.contactId,
      });
      return contacts;
    },
  );
}
