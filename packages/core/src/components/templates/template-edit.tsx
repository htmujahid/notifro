import { useState } from "react"

import { EyeIcon, HistoryIcon, SaveIcon } from "lucide-react"
import { useNavigate } from "react-router"

import { Button } from "@notifro/ui/components/button"

import {
  useCreateTemplate,
  useDeleteTemplate,
  useRenderPreview,
  useRestoreVersion,
  useTemplate,
  useTemplateVersions,
  useUpdateTemplate,
} from "../../queries/templates"
import { VersionRow } from "./version-row"

interface Props {
  templateId?: string
}

export function TemplateEditView({ templateId }: Props) {
  const navigate = useNavigate()
  const isNew = !templateId

  const { data: template, isLoading } = useTemplate(templateId ?? "")
  const createTemplate = useCreateTemplate()
  const updateTemplate = useUpdateTemplate()
  const deleteTemplate = useDeleteTemplate()
  const renderPreview = useRenderPreview()
  const { data: versionsData } = useTemplateVersions(templateId ?? "")
  const restoreVersion = useRestoreVersion()

  const versions = versionsData?.pages.flatMap((p) => p.data) ?? []

  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [description, setDescription] = useState("")
  const [defaultLocale, setDefaultLocale] = useState("en")
  const [contentJson, setContentJson] = useState(
    '{\n  "subject": "",\n  "body": { "text": "" }\n}'
  )
  const [contentError, setContentError] = useState("")
  const [previewData, setPreviewData] = useState("{}")
  const [previewResult, setPreviewResult] = useState<Record<
    string,
    unknown
  > | null>(null)
  const [tab, setTab] = useState<"editor" | "history">("editor")
  const [initialized, setInitialized] = useState(false)

  if (!isLoading && template && !initialized) {
    setName(template.name)
    setSlug(template.slug)
    setDescription(template.description ?? "")
    setDefaultLocale(template.defaultLocale)
    try {
      setContentJson(JSON.stringify(JSON.parse(template.content), null, 2))
    } catch {
      setContentJson(template.content)
    }
    setInitialized(true)
  }

  function validateContent(): Record<string, unknown> | null {
    try {
      const parsed = JSON.parse(contentJson) as Record<string, unknown>
      setContentError("")
      return parsed
    } catch {
      setContentError("Content must be valid JSON")
      return null
    }
  }

  async function handleSave() {
    const content = validateContent()
    if (!content) return

    if (isNew) {
      const created = await createTemplate.mutateAsync({
        name,
        slug,
        description: description || undefined,
        defaultLocale,
        content,
      })
      navigate(`/templates/${created.id}`)
    } else {
      await updateTemplate.mutateAsync({
        id: templateId!,
        name,
        slug,
        description: description || undefined,
        defaultLocale,
        content,
      })
    }
  }

  async function handlePreview() {
    if (!templateId) return
    const content = validateContent()
    if (!content) return
    try {
      const data = JSON.parse(previewData) as Record<string, unknown>
      const result = await renderPreview.mutateAsync({ id: templateId, data })
      setPreviewResult(result.content)
    } catch {
      setPreviewResult(null)
    }
  }

  if (!isNew && isLoading) {
    return <div className="text-sm text-muted-foreground">Loading…</div>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {isNew ? "New template" : name || "Edit template"}
          </h1>
          {!isNew && (
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {template?.slug}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={deleteTemplate.isPending}
              onClick={() =>
                deleteTemplate.mutate(templateId!, {
                  onSuccess: () => navigate("/templates"),
                })
              }
            >
              Delete
            </Button>
          )}
          <Button
            size="sm"
            disabled={createTemplate.isPending || updateTemplate.isPending}
            onClick={handleSave}
          >
            <SaveIcon className="mr-1.5 size-3.5" />
            {isNew ? "Create" : "Save"}
          </Button>
        </div>
      </div>

      <div className="flex gap-1 border-b">
        {(["editor", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? "border-b-2 border-foreground text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "editor" ? (
              <>
                <EyeIcon className="size-3.5" />
                Editor
              </>
            ) : (
              <>
                <HistoryIcon className="size-3.5" />
                History
              </>
            )}
          </button>
        ))}
      </div>

      {tab === "editor" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Name</label>
              <input
                className="rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Welcome email"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Slug</label>
              <input
                className="rounded-md border bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="welcome-email"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Default locale</label>
                <input
                  className="rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={defaultLocale}
                  onChange={(e) => setDefaultLocale(e.target.value)}
                  placeholder="en"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Description</label>
              <input
                className="rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Content (JSON)</label>
              <textarea
                className="h-64 rounded-md border bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={contentJson}
                onChange={(e) => {
                  setContentJson(e.target.value)
                  setContentError("")
                }}
                spellCheck={false}
              />
              {contentError && (
                <p className="text-xs text-destructive">{contentError}</p>
              )}
            </div>
          </div>

          {!isNew && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">
                  Preview data (JSON)
                </label>
                <textarea
                  className="h-32 rounded-md border bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={previewData}
                  onChange={(e) => setPreviewData(e.target.value)}
                  spellCheck={false}
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={renderPreview.isPending}
                onClick={handlePreview}
              >
                <EyeIcon className="mr-1.5 size-3.5" />
                Render preview
              </Button>
              {previewResult && (
                <div className="rounded-lg bg-muted/40 p-4">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Rendered output
                  </p>
                  <pre className="overflow-x-auto font-mono text-xs">
                    {JSON.stringify(previewResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "history" && (
        <div className="flex flex-col gap-3">
          {versions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No version history yet. Edit and save this template to create a
              snapshot.
            </p>
          ) : (
            versions.map((v) => (
              <VersionRow
                key={v.id}
                v={v}
                restoring={restoreVersion.isPending}
                onRestore={() =>
                  restoreVersion.mutate({
                    templateId: templateId!,
                    version: v.version,
                  })
                }
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}
