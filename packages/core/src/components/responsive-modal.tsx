import * as React from "react"

import { useApp } from "@renderical/app/app/context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@renderical/ui/components/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@renderical/ui/components/drawer"

const ModalModeCtx = React.createContext(false)

export function ResponsiveModal({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}) {
  const { isMobile } = useApp()
  return (
    <ModalModeCtx.Provider value={isMobile}>
      {isMobile ? (
        <Drawer open={open} onOpenChange={onOpenChange}>
          {children}
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={onOpenChange}>
          {children}
        </Dialog>
      )}
    </ModalModeCtx.Provider>
  )
}

export function ResponsiveModalContent({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  const isMobile = React.useContext(ModalModeCtx)
  if (isMobile) {
    return (
      <DrawerContent>
        {children}
        <div style={{ paddingBottom: "env(safe-area-inset-bottom)" }} />
      </DrawerContent>
    )
  }
  return <DialogContent className={className}>{children}</DialogContent>
}

export function ResponsiveModalHeader({
  children,
}: {
  children: React.ReactNode
}) {
  const isMobile = React.useContext(ModalModeCtx)
  if (isMobile) return <DrawerHeader>{children}</DrawerHeader>
  return <DialogHeader>{children}</DialogHeader>
}

export function ResponsiveModalTitle({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const isMobile = React.useContext(ModalModeCtx)
  if (isMobile)
    return <DrawerTitle className={className}>{children}</DrawerTitle>
  return <DialogTitle className={className}>{children}</DialogTitle>
}

export function ResponsiveModalDescription({
  children,
}: {
  children: React.ReactNode
}) {
  const isMobile = React.useContext(ModalModeCtx)
  if (isMobile) return <DrawerDescription>{children}</DrawerDescription>
  return <DialogDescription>{children}</DialogDescription>
}

export function ResponsiveModalBody({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const isMobile = React.useContext(ModalModeCtx)
  const base = isMobile ? "px-4 pb-2" : ""
  return (
    <div className={[base, className].filter(Boolean).join(" ")}>
      {children}
    </div>
  )
}

export function ResponsiveModalFooter({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const isMobile = React.useContext(ModalModeCtx)
  if (isMobile)
    return <DrawerFooter className={className}>{children}</DrawerFooter>
  return <DialogFooter className={className}>{children}</DialogFooter>
}
