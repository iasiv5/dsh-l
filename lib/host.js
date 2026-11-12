// src/host.mjs
var name = "dsh-l";
var inject = ["webServer"];
var BUILD = true ? "5ed3d76b6102" : "dev";
function apply(ctx) {
  ctx.effect(() => {
    const dispose = ctx.webServer.register({
      kind: "exact",
      path: "/dsh-l/health",
      handler: (req, res) => {
        const body = Buffer.from(JSON.stringify({ ok: true, name, build: BUILD }));
        res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "content-length": String(body.length) });
        res.end(body);
      }
    });
    return () => {
      try {
        dispose?.();
      } catch {
      }
    };
  }, "dsh-l:runtime");
}
export {
  apply,
  inject,
  name
};
