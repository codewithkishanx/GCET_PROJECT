import MarkdownIt from "markdown-it";
import sanitizeHtml from "sanitize-html";

const markdown = new MarkdownIt({
  html: false, // raw HTML in user content is never interpreted
  linkify: true,
  breaks: false,
  typographer: false,
});

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: [
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "br",
    "hr",
    "strong",
    "em",
    "del",
    "blockquote",
    "ul",
    "ol",
    "li",
    "a",
    "img",
    "code",
    "pre",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "span",
  ],
  allowedAttributes: {
    a: ["href", "title", "rel"],
    img: ["src", "alt", "title"],
    code: ["class"],
    span: ["class"],
    th: ["align"],
    td: ["align"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["http", "https"] },
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer nofollow" }),
    img: sanitizeHtml.simpleTransform("img", { loading: "lazy", referrerpolicy: "no-referrer" }),
  },
  disallowedTagsMode: "discard",
};

/**
 * Renders authored Markdown to sanitized HTML. The same function is used by the
 * API for read responses, so a client cannot accidentally render unsafe markup.
 */
export function renderMarkdown(source: string): string {
  const rendered = markdown.render(source);
  return sanitizeHtml(rendered, sanitizeOptions);
}

export function sanitizePlainText(source: string): string {
  return sanitizeHtml(source, { allowedTags: [], allowedAttributes: {} }).trim();
}
