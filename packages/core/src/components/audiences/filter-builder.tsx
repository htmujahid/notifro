import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { PlusIcon, TrashIcon } from "lucide-react"

export type FilterOp =
  | "eq"
  | "neq"
  | "gt"
  | "lt"
  | "gte"
  | "lte"
  | "contains"
  | "in"

export interface FilterClause {
  field: string
  op: FilterOp
  value: string
}

export const OP_LABELS: Record<FilterOp, string> = {
  eq: "equals",
  neq: "not equals",
  gt: "greater than",
  lt: "less than",
  gte: ">=",
  lte: "<=",
  contains: "contains",
  in: "is one of",
}

export function FilterBuilder({
  clauses,
  onChange,
}: {
  clauses: FilterClause[]
  onChange: (clauses: FilterClause[]) => void
}) {
  function addClause() {
    onChange([...clauses, { field: "", op: "eq", value: "" }])
  }

  function removeClause(i: number) {
    onChange(clauses.filter((_, idx) => idx !== i))
  }

  function updateClause(i: number, patch: Partial<FilterClause>) {
    onChange(clauses.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  }

  return (
    <div className="flex flex-col gap-2">
      {clauses.map((clause, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            placeholder="attribute (e.g. plan)"
            value={clause.field}
            onChange={(e) => updateClause(i, { field: e.target.value })}
            className="w-36"
          />
          <Select
            value={clause.op}
            onValueChange={(v) => updateClause(i, { op: v as FilterOp })}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(OP_LABELS) as FilterOp[]).map((op) => (
                <SelectItem key={op} value={op}>
                  {OP_LABELS[op]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="value"
            value={clause.value}
            onChange={(e) => updateClause(i, { value: e.target.value })}
            className="flex-1"
          />
          <Button variant="ghost" size="icon" onClick={() => removeClause(i)}>
            <TrashIcon className="size-3.5 text-muted-foreground" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="w-fit gap-1.5"
        onClick={addClause}
      >
        <PlusIcon className="size-3.5" />
        Add condition
      </Button>
    </div>
  )
}
