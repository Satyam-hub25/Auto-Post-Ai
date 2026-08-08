import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { Landing } from "./pages/Templates";
import { Dashboard } from "./pages/Dashboard";
import { PostDetail } from "./pages/PostDetail";
import { Editorial } from "./pages/Editorial";
import { Analytics } from "./pages/Analytics";
function App() {
  return (
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      {" "}
      <Routes>
        {" "}
        <Route path="/" element={<Landing />} />{" "}
        <Route element={<AppShell />}>
          {" "}
          <Route path="/dashboard/:agentId" element={<Dashboard />} />{" "}
          <Route path="/post/:agentId/:postId" element={<PostDetail />} />{" "}
          <Route path="/editorial/:agentId" element={<Editorial />} />{" "}
          <Route path="/analytics/:agentId" element={<Analytics />} />{" "}
        </Route>{" "}
      </Routes>{" "}
    </BrowserRouter>
  );
}
export default App;
