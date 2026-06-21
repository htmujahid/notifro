import type { AppDB } from '../db/client'

export async function suppress(
  _db: AppDB,
  userId: string,
  recipient: string,
  reason: 'bounced' | 'complained' | 'unsubscribed',
): Promise<void> {
  // Suppression list storage deferred to M33
  console.log('[suppress]', { userId, recipient, reason })
}
