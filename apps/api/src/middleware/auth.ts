import { createMiddleware } from 'hono/factory'
import { Errors } from '../lib/errors'
import { authInstance } from '../lib/auth'
import type { AppEnv } from '../lib/types'
import type { OrgRole } from '../lib/organization'

export const requireOrg = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.var.session) throw Errors.unauthenticated()
  if (!c.var.session.activeOrganizationId) throw Errors.noActiveOrg()

  const member = await authInstance.api.getActiveMember({ headers: c.req.raw.headers })
  if (!member) throw Errors.forbidden()

  c.set('org', { id: member.organizationId, role: member.role as OrgRole })
  await next()
})

export const requireRole = (...allowed: OrgRole[]) =>
  createMiddleware<AppEnv>(async (c, next) => {
    if (!allowed.includes(c.var.org.role)) throw Errors.forbidden()
    await next()
  })

export const requirePermission = (resource: string, action: string) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const result = await authInstance.api.hasPermission({
      headers: c.req.raw.headers,
      body: {
        permissions: { [resource]: [action] },
      },
    })
    if (!result.success) throw Errors.forbidden()
    await next()
  })
