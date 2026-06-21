export class ApiError extends Error {
  constructor(
    public readonly httpStatus: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export function validationHook(
  result: { success: boolean; error?: unknown },
  c: any
): Response | void {
  if (!result.success) {
    return c.json(
      {
        error: {
          code: "validation_error",
          message: "Validation failed",
          details: result.error,
        },
      },
      422
    )
  }
}

export const Errors = {
  unauthenticated: () =>
    new ApiError(401, "unauthenticated", "Authentication required"),
  forbidden: () => new ApiError(403, "forbidden", "Insufficient permissions"),
  notFound: (resource = "Resource") =>
    new ApiError(404, "not_found", `${resource} not found`),
  badRequest: (msg: string, details?: unknown) =>
    new ApiError(400, "bad_request", msg, details),
  validationError: (details?: unknown) =>
    new ApiError(422, "validation_error", "Validation failed", details),
  internal: () => new ApiError(500, "internal_error", "Internal server error"),
}
