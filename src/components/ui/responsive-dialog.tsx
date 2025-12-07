
"use client"

import * as React from "react"
import { useMediaQuery } from "@/hooks/use-media-query"
import {
  Dialog as DesktopDialog,
  DialogContent as DesktopDialogContent,
  DialogDescription,
  DialogHeader as DesktopDialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter as DesktopDialogFooter,
} from "@/components/ui/dialog"
import {
  Sheet as MobileSheet,
  SheetContent as MobileSheetContent,
  SheetDescription,
  SheetHeader as MobileSheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
  SheetFooter as MobileSheetFooter,
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
    return <MobileSheetContent side="right" className={className}>{children}</MobileSheetContent>
}


export const ResponsiveDialogHeader = ({className, ...props}: React.HTMLAttributes<HTMLDivElement>) => {
    const isDesktop = useMediaQuery("(min-width: 768px)");
    if(isDesktop) {
        return <DesktopDialogHeader className={className} {...props} />
    }
    return <MobileSheetHeader className={className} {...props} />
}

export const ResponsiveDialogFooter = ({className, ...props}: React.HTMLAttributes<HTMLDivElement>) => {
     const isDesktop = useMediaQuery("(min-width: 768px)");
    if(isDesktop) {
        return <DesktopDialogFooter className={className} {...props} />
    }
    return <MobileSheetFooter className={className} {...props} />
}
export const ResponsiveDialogTitle = DialogTitle;
export const ResponsiveDialogDescription = DialogDescription;
export const ResponsiveDialogClose = DialogClose;
