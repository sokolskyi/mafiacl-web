import { proxyMcl } from "@/lib/mclProxy";

/** /mcl/ — главная страница MCL Europe со старого сайта, с полоской MafiaCL сверху. */
export async function GET() {
  return proxyMcl("index.html");
}
