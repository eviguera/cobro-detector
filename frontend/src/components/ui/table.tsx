import * as React from "react"
import { cn } from "@/lib/utils"

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  function Table({ className, ...props }, ref) {
    return (
      <div className="relative w-full overflow-x-auto">
        <table ref={ref} className={cn("ledger-table caption-bottom", className)} {...props} />
      </div>
    )
  }
)
Table.displayName = "Table"

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  function TableHeader({ className, ...props }, ref) {
    return <thead ref={ref} className={cn("bg-secondary/40", className)} {...props} />
  }
)
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  function TableBody({ className, ...props }, ref) {
    return <tbody ref={ref} className={cn("", className)} {...props} />
  }
)
TableBody.displayName = "TableBody"

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  function TableRow({ className, ...props }, ref) {
    return <tr ref={ref} className={cn("", className)} {...props} />
  }
)
TableRow.displayName = "TableRow"

const TableHeaderCell = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  function TableHeaderCell({ className, ...props }, ref) {
    return <th ref={ref} className={cn("", className)} {...props} />
  }
)
TableHeaderCell.displayName = "TableHeaderCell"

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  function TableCell({ className, ...props }, ref) {
    return <td ref={ref} className={cn("", className)} {...props} />
  }
)
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  function TableCaption({ className, ...props }, ref) {
    return <caption ref={ref} className={cn("mt-4 text-xs text-muted-foreground", className)} {...props} />
  }
)
TableCaption.displayName = "TableCaption"

export { Table, TableHeader, TableBody, TableRow, TableHeaderCell, TableCell, TableCaption }
