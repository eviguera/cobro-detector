/**
 * Script para subir los 6 documentos de CobroDetector a Notion.
 *
 * Uso:
 *   NOTION_TOKEN=ntn_xxx NOTION_PAGE_ID=abc123 npx ts-node scripts/notion-upload.ts
 *
 * Requisitos:
 *   1. El token debe ser de una integración interna de Notion
 *   2. La integración debe estar conectada a la página padre (Share → Invitar → tu integración)
 *   3. NOTION_PAGE_ID: el ID de 32 caracteres de la página padre (desde la URL de Notion)
 */

import { Client } from "@notionhq/client";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NOTION_RICH_TEXT_LIMIT = 2000;

function splitCodeBlock(
  content: string,
  language: string
): Array<Record<string, unknown>> {
  if (content.length <= NOTION_RICH_TEXT_LIMIT) {
    return [
      {
        type: "code",
        code: {
          rich_text: [richTextSegment(content)],
          language: language || "plain text",
        },
      },
    ];
  }

  const lines = content.split("\n");
  const blocks: Array<Record<string, unknown>> = [];
  let currentChunk = "";

  for (const line of lines) {
    const candidate = currentChunk ? currentChunk + "\n" + line : line;
    if (candidate.length > NOTION_RICH_TEXT_LIMIT && currentChunk) {
      blocks.push({
        type: "code",
        code: {
          rich_text: [richTextSegment(currentChunk)],
          language: language || "plain text",
        },
      });
      currentChunk = line;
    } else {
      currentChunk = candidate;
    }
  }

  if (currentChunk) {
    blocks.push({
      type: "code",
      code: {
        rich_text: [richTextSegment(currentChunk)],
        language: language || "plain text",
      },
    });
  }

  return blocks;
}

interface DocFile {
  filename: string;
  title: string;
  icon: string;
}

const DOCS: DocFile[] = [
  { filename: "2026-05-26-prd.md", title: "1. PRD — Requisitos de Producto", icon: "🛡️" },
  { filename: "2026-05-26-trd.md", title: "2. TRD — Requisitos Técnicos", icon: "⚙️" },
  { filename: "2026-05-26-ui-ux.md", title: "3. UI/UX — Diseño de Interfaz", icon: "🎨" },
  { filename: "2026-05-26-flujos.md", title: "4. Flujos — Diagramas de Secuencia", icon: "🔄" },
  { filename: "2026-05-26-backend-schema.md", title: "5. Backend — Schema y API", icon: "🗄️" },
  { filename: "2026-05-26-plan-implementacion.md", title: "6. Plan de Implementación", icon: "📋" },
];

function parseMarkdownToBlocks(markdown: string): Array<Record<string, unknown>> {
  const blocks: Array<Record<string, unknown>> = [];
  const lines = markdown.split("\n");
  let inCodeBlock = false;
  let codeContent = "";
  let codeLanguage = "";
  let inTable = false;
  let tableRows: string[][] = [];
  let listItems: Array<{ text: string; checked: boolean | null }> = [];

  function flushList(): void {
    if (listItems.length === 0) return;
    const hasChecks = listItems.some((item) => item.checked !== null);
    if (hasChecks) {
      for (const item of listItems) {
        blocks.push({
          type: "to_do",
          to_do: {
            rich_text: richText(item.text),
            checked: item.checked ?? false,
          },
        });
      }
    } else {
      for (const item of listItems) {
        blocks.push({
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: richText(item.text),
          },
        });
      }
    }
    listItems = [];
  }

  function flushTable(): void {
    if (tableRows.length < 2) {
      tableRows = [];
      inTable = false;
      return;
    }
    const headers = tableRows[0];
    const rows = tableRows.slice(1);
    const tableWidth = headers.length;

    const tableBlock: Record<string, unknown> = {
      type: "table",
      table: {
        table_width: tableWidth,
        has_column_header: true,
        has_row_header: false,
        children: [],
      },
    };

    const headerRow: Record<string, unknown> = {
      type: "table_row",
      table_row: {
        cells: headers.map((h) => [richTextSegment(cleanFormatting(h))]),
      },
    };
    (tableBlock.table as Record<string, unknown>).children = [headerRow];

    for (const row of rows) {
      const rowBlock: Record<string, unknown> = {
        type: "table_row",
        table_row: {
          cells: row.map((cell) => [richTextSegment(cleanFormatting(cell))]),
        },
      };
      const children = (tableBlock.table as Record<string, unknown>).children as Array<Record<string, unknown>>;
      children.push(rowBlock);
    }

    blocks.push(tableBlock);
    tableRows = [];
    inTable = false;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        blocks.push(...splitCodeBlock(codeContent.trimEnd(), codeLanguage));
        codeContent = "";
        codeLanguage = "";
        inCodeBlock = false;
      } else {
        flushList();
        flushTable();
        codeLanguage = line.trim().slice(3).trim() || "plain text";
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent += line + "\n";
      continue;
    }

    // Table — detect if this line is a table row
    if (line.startsWith("|") && line.endsWith("|")) {
      const cells = line
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim());
      // Skip separator rows like |---|---|
      if (cells.every((c) => /^[-:]+$/.test(c))) continue;
      if (!inTable) {
        flushList();
        inTable = true;
      }
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Divider
    if (/^[-*_]{3,}$/.test(line.trim())) {
      flushList();
      flushTable();
      blocks.push({ type: "divider", divider: {} });
      continue;
    }

    // Headings
    const h1Match = line.match(/^# (.+)/);
    const h2Match = line.match(/^## (.+)/);
    const h3Match = line.match(/^### (.+)/);
    if (h1Match || h2Match || h3Match) {
      flushList();
      flushTable();
      const text = (h1Match || h2Match || h3Match)![1];
      const type = h1Match ? "heading_1" : h2Match ? "heading_2" : "heading_3";
      blocks.push({
        type,
        [type]: { rich_text: richText(text) },
      });
      continue;
    }

    // Callout / blockquote
    if (line.startsWith("> ")) {
      flushList();
      flushTable();
      blocks.push({
        type: "quote",
        quote: {
          rich_text: richText(line.slice(2)),
        },
      });
      continue;
    }

    // Task list items
    const taskMatch = line.match(/^- \[(x| )\] (.+)/);
    if (taskMatch) {
      listItems.push({ text: taskMatch[2], checked: taskMatch[1] === "x" });
      continue;
    }

    // Bullet list items
    const bulletMatch = line.match(/^- (.+)/);
    if (bulletMatch && !taskMatch) {
      listItems.push({ text: bulletMatch[1], checked: null });
      continue;
    }

    // Numbered list items
    const numberedMatch = line.match(/^\d+\. (.+)/);
    if (numberedMatch) {
      flushList();
      flushTable();
      blocks.push({
        type: "numbered_list_item",
        numbered_list_item: {
          rich_text: richText(numberedMatch[1]),
        },
      });
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      flushList();
      continue;
    }

    // Paragraph
    flushList();
    flushTable();
    if (line.trim()) {
      blocks.push({
        type: "paragraph",
        paragraph: {
          rich_text: richText(line),
        },
      });
    }
  }

  // Flush any remaining
  flushList();
  flushTable();
  if (inCodeBlock && codeContent) {
    blocks.push(...splitCodeBlock(codeContent.trimEnd(), codeLanguage));
  }

  return blocks;
}

function richText(text: string): Array<Record<string, unknown>> {
  // Handle **bold** and `code` inline
  const segments: Array<Record<string, unknown>> = [];
  const regex = /(\*\*(.+?)\*\*|`(.+?)`|[^*`]+)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match[2]) {
      // Bold
      segments.push({
        type: "text",
        text: { content: match[2] },
        annotations: { bold: true },
      });
    } else if (match[3]) {
      // Inline code
      segments.push({
        type: "text",
        text: { content: match[3] },
        annotations: { code: true },
      });
    } else if (match[1]?.trim()) {
      segments.push(richTextSegment(match[1]));
    }
  }
  return segments.length > 0 ? segments : [richTextSegment(text)];
}

function richTextSegment(content: string): Record<string, unknown> {
  return {
    type: "text",
    text: { content },
  };
}

function cleanFormatting(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/`(.+?)`/g, "$1").trim();
}

async function createPageBlocks(
  notion: Client,
  pageId: string,
  blocks: Array<Record<string, unknown>>
): Promise<void> {
  const MAX_BLOCKS_PER_REQUEST = 100;
  for (let i = 0; i < blocks.length; i += MAX_BLOCKS_PER_REQUEST) {
    const chunk = blocks.slice(i, i + MAX_BLOCKS_PER_REQUEST);
    await notion.blocks.children.append({
      block_id: pageId,
      children: chunk as Array<Parameters<typeof notion.blocks.children.append>[0]["children"][number]>,
    });
  }
}

async function main(): Promise<void> {
  const token = process.env.NOTION_TOKEN;
  const parentPageId = process.env.NOTION_PAGE_ID;

  if (!token || !parentPageId) {
    console.error("ERROR: NOTION_TOKEN y NOTION_PAGE_ID son requeridos.");
    console.error(
      "Uso: NOTION_TOKEN=ntn_xxx NOTION_PAGE_ID=abc123 npx ts-node scripts/notion-upload.ts"
    );
    process.exit(1);
  }

  const notion = new Client({ auth: token });
  const specsDir = path.join(process.cwd(), "docs", "superpowers", "specs");

  console.log(`🚀 Subiendo ${DOCS.length} documentos a Notion...\n`);

  for (const doc of DOCS) {
    const filePath = path.join(specsDir, doc.filename);
    if (!fs.existsSync(filePath)) {
      console.log(`  ⚠️  ${doc.filename} no encontrado, saltando...`);
      continue;
    }

    const markdown = fs.readFileSync(filePath, "utf-8");
    const blocks = parseMarkdownToBlocks(markdown);

    console.log(`  📄 Creando: ${doc.icon} ${doc.title} (${blocks.length} bloques)...`);

    try {
      // Create the sub-page
      const page = await notion.pages.create({
        parent: { page_id: parentPageId },
        properties: {
          title: {
            title: [{ type: "text", text: { content: `${doc.icon} ${doc.title}` } }],
          },
        },
        icon: { type: "emoji", emoji: doc.icon },
      });

      // Add content blocks
      await createPageBlocks(notion, page.id, blocks);
      console.log(`  ✅ ${doc.title} — listo`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ❌ Error en ${doc.title}: ${msg}`);
    }
  }

  console.log(`\n🎉 ¡Completado! ${DOCS.length} documentos subidos a Notion.`);
  console.log(`   Revisa: https://notion.so/${parentPageId.replace(/-/g, "")}`);
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
