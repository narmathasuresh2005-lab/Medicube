
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Kiosk from "./pages/Kiosk";
import FrontDesk from "./pages/FrontDesk";
import NurseDashboard from "./NurseDashboard";
import Hall from "./pages/Hall";
import Analytics from "./pages/Analytics";

import SidebarLayout from "./components/SidebarLayout";

function App() {
  return (
    <BrowserRouter basename="/Medicube">
      <Routes>
        <Route element={<SidebarLayout />}>
          <Route path="/" element={<Kiosk />} />
          <Route path="/front-desk" element={<FrontDesk />} />
          <Route path="/nurse" element={<NurseDashboard />} />
          <Route path="/waiting-hall" element={<Hall />} />
          <Route path="/analytics" element={<Analytics />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
