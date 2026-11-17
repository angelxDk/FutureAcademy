import { randomUUID } from 'node:crypto';
import { adminServices } from '../admin.js';
import { reportServerError } from '../security.js';
export async function communityApi(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  try {
    const { db } = adminServices(), user = req.identity;
    const { action, id, name, description, text, emails, token, memberId, messageId } = req.body || {};
    if (action === 'create') {
      if (typeof name !== 'string' || !name.trim() || name.length > 80 || typeof description !== 'string' || description.length > 500) return res.status(400).json({ error: 'Confira nome e descrição.' });
      const ref = db.collection('communities').doc();
      await ref.set({ name: name.trim(), description, ownerId: user.uid, memberIds: [user.uid], createdAt: Date.now() });
      return res.json({ id: ref.id });
    }
    if (action === 'join') {
      if (!user.email_verified) return res.status(403).json({ error: 'Verifique seu e-mail antes de aceitar convites.' });
      if (typeof token !== 'string' || !/^[\da-f-]{36}$/.test(token)) return res.status(400).json({ error: 'Código de convite inválido.' });
      const inviteRef = db.doc(`communityInvites/${token}`);
      const joinedId = await db.runTransaction(async tx => {
        const invite = (await tx.get(inviteRef)).data();
        if (!invite || invite.expiresAt < Date.now() || !invite.emails.includes(user.email?.toLowerCase())) throw new Error('invite');
        const groupRef = db.doc(`communities/${invite.communityId}`), group = (await tx.get(groupRef)).data();
        if (!group || group.memberIds.length >= 100) throw new Error('invite');
        if (!group.memberIds.includes(user.uid)) tx.update(groupRef, { memberIds: [...group.memberIds, user.uid] });
        tx.update(inviteRef, { emails: invite.emails.filter(e => e !== user.email.toLowerCase()) });
        return invite.communityId;
      });
      return res.json({ id: joinedId });
    }
    if (typeof id !== 'string' || !/^[\w-]{1,100}$/.test(id)) return res.status(400).json({ error: 'Comunidade inválida.' });
    const ref = db.doc(`communities/${id}`);
    const result = await db.runTransaction(async tx => {
      const group = (await tx.get(ref)).data();
      if (!group?.memberIds.includes(user.uid)) return { status: 403, error: 'Você não tem acesso a esta comunidade.' };
      const owner = group.ownerId === user.uid;
      if (action === 'send') {
        if (typeof text !== 'string' || !text.trim() || text.length > 4000) return { status: 400, error: 'Escreva até 4.000 caracteres.' };
        tx.set(ref.collection('messages').doc(), { authorId: user.uid, authorName: String(user.name || 'Estudante').slice(0, 80), text: text.trim(), createdAt: Date.now() });
      } else if (action === 'invite' && owner) {
        if (!Array.isArray(emails) || !emails.length || emails.length > 20 || emails.some(e => typeof e !== 'string' || e.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))) return { status: 400, error: 'Informe até 20 e-mails válidos.' };
        const code = randomUUID();
        tx.set(db.doc(`communityInvites/${code}`), { communityId: id, emails: [...new Set(emails.map(e => e.toLowerCase()))], expiresAt: Date.now() + 7 * 86400000 });
        return { token: code };
      } else if (action === 'removeMessage' && owner) {
        if (typeof messageId !== 'string' || !/^[\w-]{1,100}$/.test(messageId)) return { status: 400, error: 'Mensagem inválida.' };
        tx.delete(ref.collection('messages').doc(messageId));
      } else if (action === 'removeMember' && owner && memberId !== user.uid) {
        tx.update(ref, { memberIds: group.memberIds.filter(uid => uid !== memberId) });
      } else if (action === 'leave' && !owner) {
        tx.update(ref, { memberIds: group.memberIds.filter(uid => uid !== user.uid) });
      } else if (action === 'delete' && owner) {
        // Deleting the parent immediately revokes all message access. Cleanup follows below.
        tx.delete(ref);
      } else if (action === 'report') {
        if (typeof text !== 'string' || !text.trim() || text.length > 2000) return { status: 400, error: 'Descreva o problema em até 2.000 caracteres.' };
        tx.set(db.collection('communityReports').doc(), { communityId: id, reporterId: user.uid, text, createdAt: Date.now(), status: 'open' });
      } else return { status: 403, error: 'Ação não permitida.' };
      return { ok: true };
    });
    if (result.status) return res.status(result.status).json({ error: result.error });
    if (action === 'delete') {
      const invites = await db.collection('communityInvites').where('communityId', '==', id).get();
      for (const invite of invites.docs) await invite.ref.delete();
      await db.recursiveDelete(ref);
    }
    return res.json(result);
  } catch (error) {
    if (error.message === 'invite') return res.status(400).json({ error: 'Convite expirado, indisponível ou destinado a outro e-mail.' });
    return reportServerError(error, res);
  }
}
