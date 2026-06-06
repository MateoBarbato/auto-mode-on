"use client"

import type { NavIconName } from "@/lib/nav"
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  ListTodo,
  Inbox,
  Globe,
  UserCog,
  Settings,
  type LucideIcon,
} from "lucide-react"

const ICONS: Record<NavIconName, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  users: Users,
  "list-todo": ListTodo,
  "folder-kanban": FolderKanban,
  inbox: Inbox,
  globe: Globe,
  "user-cog": UserCog,
  settings: Settings,
}

export function NavIcon({ name, className }: { name: NavIconName; className?: string }) {
  const Icon = ICONS[name]
  return <Icon className={className} />
}
