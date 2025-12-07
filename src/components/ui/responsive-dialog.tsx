
"use client"

import * as React from "react"
import { useMediaQuery } from "@/hooks/use-media-query"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
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
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        {children}
      </Dialog>
    )
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      {children}
    </Sheet>
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
        return <DialogContent className={className}>{children}</DialogContent>
    }
    return <SheetContent side="right" className={className}>{children}</SheetContent>
}


export const ResponsiveDialogHeader = SheetHeader;
export const ResponsiveDialogFooter = SheetFooter;
export const ResponsiveDialogTitle = SheetTitle;
export const ResponsiveDialogDescription = SheetDescription;
export const ResponsiveDialogClose = SheetClose;
