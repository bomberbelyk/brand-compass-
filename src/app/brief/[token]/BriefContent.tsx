"use client";

import React from "react";

type Props = { markdown: string };

export default function BriefContent({ markdown }: Props) {
  const sections = parseMarkdownSections(markdown);

  return (
    <div className="brief-sections">
      {sections.map((section, i) => (
        <div key={i} className="brief-section">
          {section.heading && (
            <h2 className="brief-section-heading">{section.heading}</h2>
          )}
          <div className="brief-section-body">
            {section.items.map((item, j) => {
              if (item.type === "subheading") {
                return <h3 key={j} className="brief-subheading">{item.text}</h3>;
              }
              if (item.type === "list") {
                return (
                  <li key={j} className="brief-list-item">
                    <InlineText text={item.text} />
                  </li>
                );
              }
              return (
                <p key={j} className="brief-paragraph">
                  <InlineText text={item.text} />
                </p>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// Renders inline **bold** and *italic* within a text node
function InlineText({ text }: { text: string }) {
  const parts = parseInline(text);
  return (
    <>
      {parts.map((part, i) => {
        if (part.bold) return <strong key={i}>{part.text}</strong>;
        if (part.italic) return <em key={i}>{part.text}</em>;
        return <React.Fragment key={i}>{part.text}</React.Fragment>;
      })}
    </>
  );
}

type InlinePart = { text: string; bold?: boolean; italic?: boolean };

function parseInline(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  // Match **bold** or *italic*
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index) });
    if (m[2] !== undefined) parts.push({ text: m[2], bold: true });
    else if (m[3] !== undefined) parts.push({ text: m[3], italic: true });
    last = m.index + m[0].length;
  }

  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

type BlockItem = { type: "paragraph" | "list" | "subheading"; text: string };
type Section = { heading: string | null; items: BlockItem[] };

function parseMarkdownSections(markdown: string): Section[] {
  const lines = markdown.split("\n");
  const sections: Section[] = [];
  let current: Section = { heading: null, items: [] };

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (current.heading !== null || current.items.length > 0) sections.push(current);
      current = { heading: line.slice(3).trim(), items: [] };
    } else if (line.startsWith("### ")) {
      current.items.push({ type: "subheading", text: line.slice(4).trim() });
    } else if (line.startsWith("# ")) {
      // h1 shown as page title — skip
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      current.items.push({ type: "list", text: line.slice(2) });
    } else if (line.trim()) {
      current.items.push({ type: "paragraph", text: line });
    }
  }

  if (current.heading !== null || current.items.length > 0) sections.push(current);
  return sections.filter((s) => s.heading !== null || s.items.length > 0);
}
