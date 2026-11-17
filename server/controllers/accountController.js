import { getBilling, stripeClient } from '../billing.js';
import { adminServices } from '../admin.js';
import { reportServerError } from '../security.js';
export async function deleteAccount(req, res) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Método não permitido.' });
  if (Date.now() / 1000 - req.identity.auth_time > 300) return res.status(401).json({ error: 'Entre novamente e repita a exclusão em até cinco minutos.' });
  try {
    const { db, auth } = adminServices(), uid = req.identity.uid;
    await db.doc(`accountDeletions/${uid}`).set({ startedAt: Date.now() });
    const billing = await getBilling(uid);
    if (billing.customerId) {
      const stripe = stripeClient();
      const subscriptions = await stripe.subscriptions.list({ customer: billing.customerId, status: 'all', limit: 100 });
      for (const subscription of subscriptions.data) if (!['canceled', 'incomplete_expired'].includes(subscription.status)) await stripe.subscriptions.cancel(subscription.id);
      // Stripe retains financial records according to its policies; remove the live customer.
      const customer = await stripe.customers.retrieve(billing.customerId);
      if (!customer.deleted) await stripe.customers.del(billing.customerId);
    }
    const groups = await db.collection('communities').where('memberIds', 'array-contains', uid).get();
    for (const group of groups.docs) {
      if (group.data().ownerId === uid) {
        const invites = await db.collection('communityInvites').where('communityId', '==', group.id).get();
        for (const invite of invites.docs) await invite.ref.delete();
        await db.recursiveDelete(group.ref);
      }
      else await db.runTransaction(async tx => { const fresh = (await tx.get(group.ref)).data(); if (fresh) tx.update(group.ref, { memberIds: fresh.memberIds.filter(id => id !== uid) }); });
    }
    // Shared authored content is removed as part of account deletion.
    const messages = await db.collectionGroup('messages').where('authorId', '==', uid).get();
    for (const message of messages.docs) await message.ref.delete();
    const reports = await db.collection('communityReports').where('reporterId', '==', uid).get();
    for (const report of reports.docs) await report.ref.delete();
    if (req.identity.email) {
      const invites = await db.collection('communityInvites').where('emails', 'array-contains', req.identity.email.toLowerCase()).get();
      for (const invite of invites.docs) await invite.ref.update({ emails: invite.data().emails.filter(email => email !== req.identity.email.toLowerCase()) });
    }
    await db.recursiveDelete(db.doc(`users/${uid}`));
    await db.doc(`apiUsage/${uid}`).delete();
    await db.doc(`billingCustomers/${uid}`).delete();
    await auth.deleteUser(uid, req.identity.sub || uid);
    return res.json({ ok: true });
  } catch (error) { return reportServerError(error, res); }
}

export async function exportAccount(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });
  try {
    const { db } = adminServices(), uid = req.identity.uid;
    const groups = await db.collection('communities').where('memberIds', 'array-contains', uid).get();
    const messages = await db.collectionGroup('messages').where('authorId', '==', uid).get();
    const reports = await db.collection('communityReports').where('reporterId', '==', uid).get();
    const billing = await getBilling(uid);
    return res.json({
      groups: groups.docs.map(g => ({ id: g.id, name: g.data().name, description: g.data().description, owner: g.data().ownerId === uid })),
      authoredMessages: messages.docs.map(m => ({ id: m.id, communityId: m.ref.parent.parent.id, ...m.data() })),
      reports: reports.docs.map(r => ({ id: r.id, ...r.data() })),
      billing: { plan: billing.plan, status: billing.status || null, validUntil: billing.validUntil || null, customerId: billing.customerId || null, subscriptionId: billing.subscriptionId || null }
    });
  } catch (error) { return reportServerError(error, res); }
}
