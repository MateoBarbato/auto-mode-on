import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TaskItem } from "@/components/task-item"
import { EmptyState } from "@/components/dashboard-ui"
import type { TaskWithRefs } from "@/lib/types"

export function TaskList({
  pendingTasks,
  completedTasks,
  showProject = false,
}: {
  pendingTasks: TaskWithRefs[]
  completedTasks: TaskWithRefs[]
  showProject?: boolean
}) {
  return (
    <Tabs defaultValue="pending">
      <TabsList>
        <TabsTrigger value="pending">Pendientes ({pendingTasks.length})</TabsTrigger>
        <TabsTrigger value="completed">Completadas ({completedTasks.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="pending" className="mt-4">
        {pendingTasks.length === 0 ? (
          <EmptyState message="No hay tareas pendientes en este periodo." />
        ) : (
          <div className="flex flex-col gap-2">
            {pendingTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                owner={{ name: task.ownerName, avatar: task.ownerAvatar }}
                projectName={showProject ? task.projectName : undefined}
              />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="completed" className="mt-4">
        {completedTasks.length === 0 ? (
          <EmptyState message="No hay tareas completadas en este periodo." />
        ) : (
          <div className="flex flex-col gap-2">
            {completedTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                owner={{ name: task.ownerName, avatar: task.ownerAvatar }}
                projectName={showProject ? task.projectName : undefined}
              />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
