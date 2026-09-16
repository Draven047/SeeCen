// Local-only production preview with passive performance measurements for browser QA.
// Run: bun scripts/landing-preview.mjs, then visit /?measure=1.
import { resolve, extname } from "node:path";

const root = resolve(import.meta.dir, "../dist");
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json",
};
const measurements = `<script>
  (() => {
    const params = new URLSearchParams(location.search);
    if (params.has('reduced')) {
      const original = window.matchMedia.bind(window);
      window.matchMedia = query => {
        const result = original(query);
        return new Proxy(result, { get(target, key) { if (key === 'matches' && query.includes('prefers-reduced-motion')) return true; const value = Reflect.get(target, key); return typeof value === 'function' ? value.bind(target) : value; } });
      };
    }
    if (params.has('no-webgl')) {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, ...args) { return type.startsWith('webgl') ? null : original.call(this, type, ...args); };
    }
    const metrics = { lcpMs: null, cls: 0, longTasks: 0, viewport: [innerWidth, innerHeight], profile: 'Local production build; no CPU/network throttling' };
    const publish = () => {
      const output = document.getElementById('landing-performance');
      if (output) output.textContent = JSON.stringify(metrics);
    };
    new PerformanceObserver(list => { for (const e of list.getEntries()) metrics.lcpMs = Math.round(e.startTime); publish(); }).observe({ type: 'largest-contentful-paint', buffered: true });
    let windowStart = 0, lastShift = 0, windowScore = 0;
    new PerformanceObserver(list => {
      for (const e of list.getEntries()) {
        if (e.hadRecentInput) continue;
        if (e.startTime - lastShift > 1000 || e.startTime - windowStart > 5000) { windowScore = 0; windowStart = e.startTime; }
        windowScore += e.value; lastShift = e.startTime; metrics.cls = Math.max(metrics.cls, windowScore);
      }
      publish();
    }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver(list => { metrics.longTasks += list.getEntries().length; publish(); }).observe({ type: 'longtask', buffered: true });
    document.addEventListener('DOMContentLoaded', () => {
      const output = document.createElement('output'); output.id = 'landing-performance'; output.hidden = true; document.body.append(output); publish();
      const button = document.createElement('button'); button.textContent = 'Test WebGL context loss'; button.style.cssText = 'position:fixed;bottom:8px;right:8px;z-index:9999;background:white;color:black;padding:8px;font-size:11px;border:1px solid black';
      button.onclick = () => { const canvas = document.querySelector('.lp-webgl'); const gl = canvas?.getContext('webgl2'); gl?.getExtension('WEBGL_lose_context')?.loseContext(); }; document.body.append(button);
    });
  })();
</script>`;

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: Number(process.env.PORT || 4173),
  async fetch(request) {
    const url = new URL(request.url);
    const requested = resolve(root, `.${decodeURIComponent(url.pathname)}`);
    if (!requested.startsWith(`${root}/`) && requested !== root)
      return new Response("Forbidden", { status: 403 });
    const file = Bun.file(requested);
    const isAsset = extname(requested) !== "";
    if (isAsset && (await file.exists()))
      return new Response(file, {
        headers: { "Content-Type": types[extname(requested)] || file.type },
      });
    if (isAsset) return new Response("Not found", { status: 404 });
    let html = await Bun.file(resolve(root, "index.html")).text();
    if (url.searchParams.has("measure"))
      html = html
        .replace("<head>", `<head>${measurements}`)
        .replace(
          /<script id="vite-plugin-pwa:register-sw"[^>]*><\/script>/,
          "",
        );
    return new Response(html, {
      headers: { "Content-Type": "text/html", "Cache-Control": "no-cache" },
    });
  },
});
console.log(`Production preview: http://127.0.0.1:${server.port}/?measure=1`);
