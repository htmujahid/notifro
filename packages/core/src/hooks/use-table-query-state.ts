import { useCallback, useMemo } from "react"

import {
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
  useQueryStates,
} from "nuqs"

import type {
  OnChangeFn,
  PaginationState,
  SortingState,
} from "@tanstack/react-table"

import type { ListParams } from "@renderical/api-client/types"
import type { ManualTableState } from "@renderical/ui-primitives/components/use-data-table"

interface UseTableQueryStateOptions {
  defaultSort: string
  defaultOrder: "asc" | "desc"
  defaultPageSize?: number
  filterKeys?: string[]
  searchKey?: string
}

interface UseTableQueryStateReturn {
  listParams: ListParams
  tableState: Omit<ManualTableState, "pageCount">
  filters: Record<string, string>
  setFilter: (key: string, value: string | null) => void
}

export function useTableQueryState({
  defaultSort,
  defaultOrder,
  defaultPageSize = 10,
  filterKeys = [],
  searchKey,
}: UseTableQueryStateOptions): UseTableQueryStateReturn {
  const filterParsers = useMemo(
    () =>
      Object.fromEntries(
        filterKeys.map((k) => [k, parseAsString.withDefault("")])
      ),
    [filterKeys.join(",")]
  )

  const [state, setState] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    perPage: parseAsInteger.withDefault(defaultPageSize),
    sort: parseAsString.withDefault(defaultSort),
    order: parseAsStringEnum(["asc", "desc"]).withDefault(defaultOrder),
    ...filterParsers,
  })

  const page = state.page as number
  const perPage = state.perPage as number
  const sort = state.sort as string
  const order = state.order as "asc" | "desc"
  const filterValues = state as unknown as Record<string, string | null>

  const sorting = useMemo<SortingState>(
    () => (sort ? [{ id: sort, desc: order === "desc" }] : []),
    [sort, order]
  )

  const onSortingChange = useCallback<OnChangeFn<SortingState>>(
    (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater
      const first = next[0]
      setState({
        sort: first ? first.id : defaultSort,
        order: first ? (first.desc ? "desc" : "asc") : defaultOrder,
        page: 1,
      })
    },
    [sorting, setState, defaultSort, defaultOrder]
  )

  const pagination = useMemo<PaginationState>(
    () => ({ pageIndex: page - 1, pageSize: perPage }),
    [page, perPage]
  )

  const onPaginationChange = useCallback<OnChangeFn<PaginationState>>(
    (updater) => {
      const next =
        typeof updater === "function" ? updater(pagination) : updater
      setState({ page: next.pageIndex + 1, perPage: next.pageSize })
    },
    [pagination, setState]
  )

  const filters = useMemo(() => {
    const out: Record<string, string> = {}
    for (const k of filterKeys) {
      const v = filterValues[k]
      if (v) out[k] = v
    }
    return out
  }, [filterKeys.join(","), ...filterKeys.map((k) => filterValues[k])])

  const setFilter = useCallback(
    (key: string, value: string | null) => {
      setState({ [key]: value || "", page: 1 })
    },
    [setState]
  )

  const globalFilter = searchKey ? (filterValues[searchKey] ?? "") : ""

  const onGlobalFilterChange = useCallback<OnChangeFn<string>>(
    (updater) => {
      if (!searchKey) return
      const next =
        typeof updater === "function" ? updater(globalFilter) : updater
      setState({ [searchKey]: next || "", page: 1 })
    },
    [searchKey, globalFilter, setState]
  )

  const listParams = useMemo<ListParams>(
    () => ({
      limit: perPage,
      offset: (page - 1) * perPage,
      sort,
      order,
      ...filters,
    }),
    [perPage, page, sort, order, filters]
  )

  const tableState = useMemo<Omit<ManualTableState, "pageCount">>(
    () => ({
      sorting,
      onSortingChange,
      pagination,
      onPaginationChange,
      ...(searchKey ? { globalFilter, onGlobalFilterChange } : {}),
    }),
    [
      sorting,
      onSortingChange,
      pagination,
      onPaginationChange,
      searchKey,
      globalFilter,
      onGlobalFilterChange,
    ]
  )

  return { listParams, tableState, filters, setFilter }
}
