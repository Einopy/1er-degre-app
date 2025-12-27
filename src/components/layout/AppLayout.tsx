// app/AppLayout.tsx
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from './AppSidebar'
import { Separator } from '@/components/ui/separator'
import { Outlet } from 'react-router-dom'
import { DebugLocation } from '@/components/debug/DebugLocation' // <-- AJOUT

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <SidebarProvider defaultOpen={true}>
        <AppSidebar />

        <main className="relative z-0 flex-1 overflow-auto bg-background w-full">
          <div className="flex items-center gap-2 border-b px-4 py-2 md:hidden bg-background">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-6" />
            <span className="font-bold text-green-600">1er degré</span>
          </div>

          <div className="w-full p-6">
            <div className="mx-auto max-w-3xl">
              <Outlet />
            </div>
          </div>

          {/* Petit widget de debug en bas à droite */}
          <DebugLocation />
        </main>
      </SidebarProvider>
    </div>
  )
}