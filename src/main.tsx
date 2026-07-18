import { createRoot } from "react-dom/client";
import "@fontsource/inter/300.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import App from "./App.tsx";
import "./index.css";
// side effect: capture beforeinstallprompt before React mounts
import "@/hooks/usePwaInstall";
// side effect: initialize i18n before first render
import "@/i18n";

createRoot(document.getElementById("root")!).render(<App />);
