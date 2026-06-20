export interface Timestamps {
  createdAt: string
  updatedAt: string
}

export interface OrgScoped {
  organizationId: string
}

export interface UserTable {
  id: string
  name: string
  email: string
  emailVerified: number
  image: string | null
}

export interface OrganizationTable {
  id: string
  name: string
  slug: string | null
  createdAt: string
}

export interface MemberTable {
  id: string
  organizationId: string
  userId: string
  role: string
  createdAt: string
}

export interface ConnectionTable {
  id: string
  organizationId: string
  type: string
  name: string
  status: string
  config: string
  credentials: string | null
  scopes: string
  health: string | null
  createdAt: string
  updatedAt: string
}

export interface NotificationTable {
  id: string
  organizationId: string
  createdByUserId: string | null
  payload: string
  subject: string | null
  channels: string
  mode: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface DeliveryTable {
  id: string
  organizationId: string
  notificationId: string
  channel: string
  recipient: string
  status: string
  providerMessageId: string | null
  error: string | null
  attempts: number
  createdAt: string
  updatedAt: string
}

export interface DB {
  user: UserTable
  organization: OrganizationTable
  member: MemberTable
  connection: ConnectionTable
  notification: NotificationTable
  delivery: DeliveryTable
}
