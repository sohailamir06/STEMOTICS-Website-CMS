import { Outlet } from 'react-router';
import { Sidebar } from './components/layout/Sidebar.jsx';
import { TopBar } from './components/layout/TopBar.jsx';

// Layout for every signed-in page.
export default function App() {
  return (
    <div className="flex min-h-screen bg-surface-alt">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
