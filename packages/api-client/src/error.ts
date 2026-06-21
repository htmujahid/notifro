export type ApiErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "validation_error"
  | "internal_error"
  | string

export interface ApiErrorDetail {
  path?: string[]
  message: string
}

export class ApiClientError extends Error {
  readonly code: ApiErrorCode
  readonly details?: ApiErrorDetail[]
  readonly status: number

  constructor(
    code: ApiErrorCode,
    message: string,
    status: number,
    details?: ApiErrorDetail[]
  ) {
    super(message)
    this.name = "ApiClientError"
    this.code = code
    this.status = status
    this.details = details
  }
}

export function isApiError(
  e: unknown,
  code?: ApiErrorCode
): e is ApiClientError {
  if (!(e instanceof ApiClientError)) return false
  if (code !== undefined) return e.code === code
  return true
}
