import React from "react";

type LegalDocumentContentProps = {
  content: string;
};

type MarkdownBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "list"; items: string[] }
  | { type: "paragraph"; lines: string[] };

// A heading line ends its block even with no blank line after it, so «## Title» followed by a list reads
// as a heading and a list, not as one paragraph of raw text.
const splitBlocks = (content: string) =>
  content
    .split(/\n{2,}/)
    .flatMap((block) => block.split(/\n(?=#)|(?<=^#[^\n]*)\n/m))
    .map((block) => block.trim())
    .filter(Boolean);

const parseMarkdown = (content: string): MarkdownBlock[] =>
  splitBlocks(content).map((block) => {
    if (block.startsWith("#")) {
      const match = block.match(/^(#{1,3})\s+(.*)$/);
      if (match) {
        return { type: "heading", level: match[1].length, text: match[2].trim() };
      }
    }

    const lines = block.split("\n").map((line) => line.trim());
    const isList = lines.every((line) => line.startsWith("- "));
    if (isList) {
      return {
        type: "list",
        items: lines.map((line) => line.replace(/^- /, "").trim()).filter(Boolean),
      };
    }

    return { type: "paragraph", lines };
  });

// **bold** inside a line; nothing else of Markdown is needed in these documents.
const inline = (text: string) =>
  text.split(/(\*\*[^*]+\*\*)/).map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={index} className="font-semibold text-tone-white">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    )
  );

export function LegalDocumentContent({ content }: LegalDocumentContentProps) {
  const blocks = parseMarkdown(content);

  return (
    <div className="space-y-5 text-base leading-relaxed text-tone-200">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const HeadingTag = block.level === 1 ? "h2" : block.level === 2 ? "h3" : "h4";
          return (
            <HeadingTag
              key={`heading-${block.text}-${index}`}
              className="text-lg font-semibold text-tone-white"
            >
              {block.text}
            </HeadingTag>
          );
        }

        if (block.type === "list") {
          return (
            <ul key={`list-${index}`} className="list-disc space-y-2 pl-5 text-tone-200">
              {block.items.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`}>{inline(item)}</li>
              ))}
            </ul>
          );
        }

        return (
          <p key={`paragraph-${index}`}>
            {block.lines.map((line, lineIndex, lines) => (
              <React.Fragment key={`${line}-${lineIndex}`}>
                {inline(line)}
                {lineIndex < lines.length - 1 ? <br /> : null}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
