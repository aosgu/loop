import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import MobileApp, { type ChapterId } from "./MobileApp";

/** Below this width the mobile viewer is the default. */
const MOBILE_BREAKPOINT = 820;

const CHAPTER_IDS: ChapterId[] = ["loop", "barrier", "neuro", "upstream", "lifestyle"];

const asChapter = (v: string | undefined): ChapterId | undefined =>
  v && (CHAPTER_IDS as string[]).includes(v) ? (v as ChapterId) : undefined;

interface Route {
  mobile: boolean;
  chapter?: ChapterId;
}

/**
 * `#/m` opens the mobile viewer, `#/m/<chapter>` opens it on a given chapter,
 * `#/d` forces the full page. With no hash the viewport width decides, so a
 * desktop can preview the mobile layout without resizing the window.
 */
function parseRoute(): Route {
  const parts = window.location.hash.replace(/^#\/?/, "").toLowerCase().split("/").filter(Boolean);
  const head = parts[0];
  if (head === "d" || head === "desktop") return { mobile: false };
  if (head === "m" || head === "mobile") return { mobile: true, chapter: asChapter(parts[1]) };
  const mobile = window.innerWidth < MOBILE_BREAKPOINT;
  return { mobile, chapter: mobile ? asChapter(head) : undefined };
}

function Root() {
  const [route, setRoute] = useState<Route>(parseRoute);

  useEffect(() => {
    const sync = () => setRoute(parseRoute());
    window.addEventListener("hashchange", sync);
    window.addEventListener("resize", sync);
    document.title = "Gut to Glucose | Five Plush WebGL Chapters";
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  return route.mobile ? <MobileApp initialChapter={route.chapter} /> : <App />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
