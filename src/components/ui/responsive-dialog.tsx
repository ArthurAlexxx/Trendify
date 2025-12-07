
"use client"

import * as React from "react"
import { useMediaQuery } from "@/hooks/use-media-query"
import {
  Dialog as DesktopDialog,
  DialogContent as DesktopDialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter
} from "@/components/ui/dialog"
import {
  Sheet as MobileSheet,
  SheetContent as MobileSheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
  SheetFooter
} from "@/components/ui/sheet"

interface ResponsiveDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  children: React.ReactNode;
}

export function ResponsiveDialog({ isOpen, onOpenChange, children }: ResponsiveDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")

  if (isDesktop) {
    return (
      <DesktopDialog open={isOpen} onOpenChange={onOpenChange}>
        {children}
      </DesktopDialog>
    )
  }

  return (
    <MobileSheet open={isOpen} onOpenChange={onOpenChange}>
      {children}
    </MobileSheet>
  )
}

interface ResponsiveDialogTriggerProps {
    children: React.ReactNode;
    asChild?: boolean;
}

export const ResponsiveDialogTrigger = ({ children, asChild = true }: ResponsiveDialogTriggerProps) => {
    const isDesktop = useMediaQuery("(min-width: 768px)")
    if (isDesktop) {
        return <DialogTrigger asChild={asChild}>{children}</DialogTrigger>
    }
    return <SheetTrigger asChild={asChild}>{children}</SheetTrigger>
}

interface ResponsiveDialogContentProps {
  children: React.ReactNode;
  className?: string;
}

export const ResponsiveDialogContent = ({ children, className }: ResponsiveDialogContentProps) => {
    const isDesktop = useMediaQuery("(min-width: 768px)")
    if (isDesktop) {
        return <DesktopDialogContent className={className}>{children}</DesktopDialogContent>
    }
    // No p-0 here, padding is handled by header/content/footer
    return <MobileSheetContent side="right" className={className}>{children}</MobileSheetContent>
}


export const ResponsiveDialogHeader = DialogHeader;
export const ResponsiveDialogFooter = DialogFooter;
export const ResponsiveDialogTitle = DialogTitle;
export const ResponsiveDialogDescription = DialogDescription;
export const ResponsiveDialogClose = DialogClose;
