import { useQuery } from "@tanstack/react-query"

import { useApiClient } from "@notifro/api-client/context"

interface HealthResponse {
  status: "ok" | "error"
  db: "ok" | "error"
  queue: "ok" | "error"
  ts: string
}

function StatusBadge({ value }: { value: "ok" | "error" }) {
  return (
    <span
      style={{ color: value === "ok" ? "green" : "red", fontWeight: "bold" }}
    >
      {value === "ok" ? "Operational" : "Degraded"}
    </span>
  )
}

export function StatusView() {
  const api = useApiClient()

  const { data, isPending, isError } = useQuery<HealthResponse>({
    queryKey: ["health"],
    queryFn: async () => {
      const res = await fetch(`${api.baseURL}/health`, {
        credentials: "include",
      })
      return res.json() as Promise<HealthResponse>
    },
    refetchInterval: 30_000,
  })

  return (
    <div>
      <h1>System Status</h1>
      {isPending && <p>Checking status…</p>}
      {isError && <p>Could not reach the server.</p>}
      {data && (
        <table>
          <tbody>
            <tr>
              <td>Database</td>
              <td>
                <StatusBadge value={data.db} />
              </td>
            </tr>
            <tr>
              <td>Queue</td>
              <td>
                <StatusBadge value={data.queue} />
              </td>
            </tr>
            <tr>
              <td>Overall</td>
              <td>
                <StatusBadge value={data.status} />
              </td>
            </tr>
          </tbody>
        </table>
      )}
      {data && <p>Last checked: {new Date(data.ts).toLocaleString()}</p>}
    </div>
  )
}
