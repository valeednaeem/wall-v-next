"use client";

import { useState, useEffect } from "react";

interface LegalPageContentProps {
  html: string;
}

export default function LegalPageContent({ html }: LegalPageContentProps) {
  const [sanitized, setSanitized] = useState("");

  useEffect(() => {
    import("isomorphic-dompurify").then((DOMPurify) => {
      setSanitized(
        DOMPurify.default.sanitize(html, {
          ALLOWED_TAGS: [
            "h1", "h2", "h3", "h4", "h5", "h6",
            "p", "br", "hr", "pre", "code",
            "blockquote", "ul", "ol", "li", "dl", "dt", "dd",
            "table", "thead", "tbody", "tfoot", "tr", "th", "td",
            "a", "img", "figure", "figcaption",
            "strong", "em", "b", "i", "u", "s", "sub", "sup",
            "div", "span", "section", "article", "aside", "header", "footer", "main",
            "details", "summary",
          ],
          ALLOWED_ATTR: [
            "href", "src", "alt", "title", "width", "height",
            "class", "id", "style",
            "target", "rel",
            "colspan", "rowspan", "scope",
            "data-*",
          ],
          ALLOW_DATA_ATTR: true,
        })
      );
    });
  }, [html]);

  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
