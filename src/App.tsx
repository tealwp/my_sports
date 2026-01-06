import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LeagueDashboard } from "./pages/LeagueDashboard";
import { TeamDashboard } from "./pages/TeamDashboard";
import { nhlAdapter } from "./sports/nhl";

// In the future, you can import nbaAdapter here
function App() {
  return (
    <BrowserRouter basename="/my_sports">
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-slate-900 text-white p-4">
          <div className="container mx-auto flex gap-6">
            <a href="/my_sports/" className="font-bold text-xl">
              MySports
            </a>
            <a href="/my_sports/nhl" className="hover:text-gray-300">
              NHL
            </a>
            <span className="text-gray-500 cursor-not-allowed">
              NBA (Coming Soon)
            </span>
          </div>
        </nav>

        <main className="container mx-auto">
          <Routes>
            {/* TODO: create landing page */}
            <Route path="/" element={<Navigate to="/nhl" replace />} />

            {/* NHL Routes - We pass the specific adapter to the generic view */}
            <Route
              path="/nhl"
              element={<LeagueDashboard adapter={nhlAdapter} />}
            />
            <Route
              path="/nhl/team/:teamId"
              element={<TeamDashboard adapter={nhlAdapter} />}
            />

            {/* 
               Future routes:
               <Route path="/nba" element={<LeagueDashboard adapter={nbaAdapter} />} />
            */}
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
