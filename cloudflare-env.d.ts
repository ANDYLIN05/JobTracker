declare module "cloudflare:workers" {
  const env: { DB: import("@cloudflare/workers-types").D1Database };
  export { env };
}
