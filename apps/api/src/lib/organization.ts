import { createAccessControl } from 'better-auth/plugins'

export const ac = createAccessControl({
  notification: ['create', 'read', 'update', 'delete'] as const,
  template:     ['create', 'read', 'update', 'delete'] as const,
  channel:      ['create', 'read', 'update', 'delete'] as const,
  connection:   ['create', 'read', 'update', 'delete'] as const,
})

export const roles = {
  owner: ac.newRole({
    notification: ['create', 'read', 'update', 'delete'],
    template:     ['create', 'read', 'update', 'delete'],
    channel:      ['create', 'read', 'update', 'delete'],
    connection:   ['create', 'read', 'update', 'delete'],
  }),
  admin: ac.newRole({
    notification: ['create', 'read', 'update', 'delete'],
    template:     ['create', 'read', 'update', 'delete'],
    channel:      ['create', 'read', 'update'],
    connection:   ['create', 'read', 'update'],
  }),
  member: ac.newRole({
    notification: ['read'],
    template:     ['read'],
    channel:      ['read'],
    connection:   ['read'],
  }),
}

export type OrgRole = keyof typeof roles
