"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Users, FolderKanban, Building2, ListTodo, Inbox } from "lucide-react"

type NavChild = { href: string; label: string; icon: typeof FolderKanban }
type NavItem = { href: string; label: string; icon: typeof FolderKanban; children?: NavChild[] }

const nav: NavItem[] = [
  { href: "/", label: "Resumen", icon: LayoutDashboard },
  { href: "/people", label: "Personas", icon: Users },
  {
    href: "/tasks",
    label: "Tareas",
    icon: ListTodo,
    children: [
      { href: "/tasks/projects", label: "Proyectos", icon: FolderKanban },
      { href: "/tasks/general", label: "Generales", icon: Inbox },
    ],
  },
]

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href)
}

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-sidebar-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
          <Building2 className="h-4.5 w-4.5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">Halketon</p>
          <p className="text-xs text-sidebar-foreground/60">Operations</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4">
        <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/45">
          Espacio de trabajo
        </p>
        <ul className="flex flex-col gap-1">
          {nav.map((item) => {
            const active = isActive(pathname, item.href)
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>

                {item.children && active ? (
                  <ul className="mt-1 flex flex-col gap-1 pl-7">
                    {item.children.map((child) => {
                      const childActive = pathname.startsWith(child.href)
                      const ChildIcon = child.icon
                      return (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            className={cn(
                              "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                              childActive
                                ? "bg-sidebar-accent/70 text-sidebar-accent-foreground font-medium"
                                : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
                            )}
                          >
                            <ChildIcon className="h-3.5 w-3.5" />
                            {child.label}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                ) : null}
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-medium">
            ER
          </div>
          <div className="leading-tight">
            <p className="text-sm font-medium">Elena Ruiz</p>
            <p className="text-xs text-sidebar-foreground/55">Directora Ejecutiva</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

export function MobileNav() {
  const pathname = usePathname()
  // Flatten parent + children for the horizontal mobile bar.
  const items: NavChild[] = [
    { href: "/", label: "Resumen", icon: LayoutDashboard },
    { href: "/people", label: "Personas", icon: Users },
    { href: "/tasks/projects", label: "Proyectos", icon: FolderKanban },
    { href: "/tasks/general", label: "Generales", icon: Inbox },
  ]
  return (
    <nav className="md:hidden sticky top-0 z-20 flex items-center gap-1 overflow-x-auto border-b border-border bg-sidebar px-3 py-2 text-sidebar-foreground">
      {items.map((item) => {
        const active = isActive(pathname, item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm whitespace-nowrap",
              active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
