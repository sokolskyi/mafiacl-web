import { proxyMcl } from "@/lib/mclProxy";

/** /mcl/standings.html и другие страницы MCL (файлы во вложенных папках идут через rewrites в next.config.ts). */
export async function GET(_req: Request, ctx: RouteContext<"/mcl/[file]">) {
  const { file } = await ctx.params;
  return proxyMcl(file);
}
