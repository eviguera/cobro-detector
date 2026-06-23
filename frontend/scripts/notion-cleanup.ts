import { Client } from "@notionhq/client";

const token = process.env.NOTION_TOKEN;
const parentPageId = process.env.NOTION_PAGE_ID;

if (!token || !parentPageId) {
  console.error("ERROR: NOTION_TOKEN y NOTION_PAGE_ID requeridos.");
  process.exit(1);
}

interface PageEntry {
  id: string;
  title: string;
  created: string;
}

const notion = new Client({ auth: token! });

async function main(): Promise<void> {
  const children = await notion.blocks.children.list({
    block_id: parentPageId!,
    page_size: 100,
  });

  const childPages = children.results.filter((b) => "child_page" in b && b.type === "child_page");
  console.log(`Encontradas ${childPages.length} sub-páginas.\n`);

  const groups = new Map<string, PageEntry[]>();
  let archived = 0;

  for (const page of childPages) {
    const id = page.id;
    const pageData = page as { child_page: { title: string }; created_time: string };
    const title = pageData.child_page?.title || "";

    try {
      const blocks = await notion.blocks.children.list({ block_id: id, page_size: 1 });
      const isEmpty = blocks.results.length === 0;

      const entry: PageEntry = { id, title, created: pageData.created_time || "" };

      if (!groups.has(title)) {
        groups.set(title, []);
      }
      groups.get(title)!.push(entry);

      if (isEmpty) {
        console.log(`  🗑️  Archivando vacía: "${title}"`);
        await notion.blocks.delete({ block_id: id });
        archived++;
      } else {
        console.log(`  ✅ Conservando: "${title}"`);
      }
    } catch (err) {
      console.error(`  ⚠️  Error con "${title}":`, err instanceof Error ? err.message : err);
    }
  }

  // Archive older duplicates (keep newest)
  for (const [, entries] of Array.from(groups.entries())) {
    if (entries.length <= 1) continue;
    entries.sort((a: PageEntry, b: PageEntry) => new Date(b.created).getTime() - new Date(a.created).getTime());
    for (let i = 1; i < entries.length; i++) {
      console.log(`  🗑️  Archivando duplicado: "${entries[i].title}"`);
      try {
        await notion.blocks.delete({ block_id: entries[i].id });
        archived++;
      } catch (err) {
        console.error(`  ⚠️  Error:`, err instanceof Error ? err.message : err);
      }
    }
  }

  console.log(`\n✅ Limpieza completada. ${archived} páginas archivadas.`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
