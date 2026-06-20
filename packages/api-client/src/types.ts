export interface ListParams {
  limit?: number
  cursor?: string
  sort?: string
  order?: "asc" | "desc"
  [filter: string]: string | number | boolean | undefined
}

export interface ListResponse<T> {
  data: T[]
  nextCursor: string | null
}

export interface ApiResponse<T> {
  data: T
}
