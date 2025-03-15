import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { TestGraderProvider } from "./context/TestGraderContext";

createRoot(document.getElementById("root")!).render(
  <TestGraderProvider>
    <App />
  </TestGraderProvider>
);
