import React from "react";

type LegalDocumentContentProps = {
  content: string;
};

const splitParagraphs = (content: string) =>
  content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

export function LegalDocumentContent({ content }: LegalDocumentContentProps) {
  const paragraphs = splitParagraphs(content);

  return (
    <div className="space-y-5 text-base leading-relaxed text-slate-200">
      {paragraphs.map((paragraph, index) => (
        <p key={`${paragraph.slice(0, 20)}-${index}`}>
          {paragraph.split("\n").map((line, lineIndex, lines) => (
            <React.Fragment key={`${line}-${lineIndex}`}>
              {line}
              {lineIndex < lines.length - 1 ? <br /> : null}
            </React.Fragment>
          ))}
        </p>
      ))}
    </div>
  );
}
