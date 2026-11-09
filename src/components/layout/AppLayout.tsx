import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-muted/40 text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav />
        <main className="flex-1 w-full max-w-[1500px] mx-auto p-3 sm:p-5 md:p-7 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
