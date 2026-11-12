export const name = "dsh-l";
export const inject = ["webServer"];

const BUILD = typeof __DSH_L_BUILD__ === "string" ? __DSH_L_BUILD__ : "dev";

export function apply(ctx) {
  ctx.effect(() => {
    const dispose = ctx.webServer.register({
      kind: "exact",
      path: "/dsh-l/health",
      handler: (req, res) => {
        const body = Buffer.from(JSON.stringify({ ok: true, name, build: BUILD }));
        res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "content-length": String(body.length) });
        res.end(body);
      },
    });
    return () => { try { dispose?.(); } catch {} };
  }, "dsh-l:runtime");
}
