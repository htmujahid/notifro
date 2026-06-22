import { useState } from "react"

import { PaletteIcon } from "lucide-react"

import { Button } from "@notifro/ui/components/button"
import { Card, CardContent } from "@notifro/ui/components/card"
import { Separator } from "@notifro/ui/components/separator"

import { useBrandKit, useUpdateBrandKit } from "../../queries/templates"

export function BrandKitSection() {
  const { data: kit } = useBrandKit()
  const updateBrandKit = useUpdateBrandKit()
  const [logoUrl, setLogoUrl] = useState(kit?.logoUrl ?? "")
  const [fontStack, setFontStack] = useState(kit?.fontStack ?? "")

  function handleSave() {
    updateBrandKit.mutate({
      logoUrl: logoUrl || null,
      fontStack: fontStack || null,
    })
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium">Brand kit</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Logo, colors, and font used in email and template rendering.
          </p>
        </div>
        <PaletteIcon className="size-4 text-muted-foreground" />
      </div>
      <Card size="sm">
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-8">
            <div>
              <p className="text-sm font-medium">Logo URL</p>
              <p className="text-xs text-muted-foreground">
                Absolute URL to your logo image.
              </p>
            </div>
            <input
              className="w-64 rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-8">
            <div>
              <p className="text-sm font-medium">Font stack</p>
              <p className="text-xs text-muted-foreground">
                CSS font-family value for email templates.
              </p>
            </div>
            <input
              className="w-64 rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={fontStack}
              onChange={(e) => setFontStack(e.target.value)}
              placeholder="Inter, sans-serif"
            />
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={updateBrandKit.isPending}
              onClick={handleSave}
            >
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
