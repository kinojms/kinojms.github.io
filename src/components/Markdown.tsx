// Markdown rendering shared by the site (build time) and the editor preview (browser).
// Raw HTML is never rendered; react-markdown also drops javascript: and other unsafe URLs.
import React, { ReactNode } from "react";
import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { slugify as transliterate } from "transliteration";
import {
  HeadingLink,
  Text,
  InlineCode,
  Media,
  SmartLink,
  List,
  ListItem,
  Line,
  Row,
} from "@once-ui-system/core";
import { CodeBlock } from "@once-ui-system/core/code";

// Math between $$ and $$ is rendered with KaTeX; single dollars stay plain text, so prices are safe.
const remarkPlugins = [remarkGfm, [remarkMath, { singleDollarTextMath: false }]] as any;
const rehypePlugins = [rehypeKatex] as any;

/** Plain text of rendered children, used for heading anchors. */
export function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (React.isValidElement(node)) return textOf((node.props as { children?: ReactNode }).children);
  return "";
}

export function headingSlug(str: string): string {
  return transliterate(str.replace(/&/g, " and "), { lowercase: true, separator: "-" }).replace(/-{2,}/g, "-");
}

type Props = { node?: unknown; children?: ReactNode; [key: string]: unknown };

function SiteLink({ node, href = "", children, ...rest }: Props & { href?: string }) {
  if (href.startsWith("/"))
    return (
      <SmartLink href={href} {...rest}>
        {children}
      </SmartLink>
    );
  if (href.startsWith("#"))
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
      {children}
    </a>
  );
}

function heading(as: "h1" | "h2" | "h3" | "h4" | "h5" | "h6") {
  const H = ({ node, children }: Props) => (
    <HeadingLink marginTop="24" marginBottom="12" as={as} id={headingSlug(textOf(children))}>
      {children}
    </HeadingLink>
  );
  H.displayName = as;
  return H;
}

function Paragraph({ children }: Props) {
  return (
    <Text style={{ lineHeight: "175%" }} variant="body-default-m" onBackground="neutral-medium" marginTop="8" marginBottom="12">
      {children}
    </Text>
  );
}

function Image({ src, alt }: Props & { src?: string; alt?: string }) {
  if (!src) return null;
  return (
    <Media
      marginTop="8"
      marginBottom="16"
      enlarge
      radius="m"
      border="neutral-alpha-medium"
      sizes="(max-width: 960px) 100vw, 960px"
      alt={alt || ""}
      src={src}
    />
  );
}

function Code({ children }: Props) {
  return <InlineCode>{children}</InlineCode>;
}

function Pre({ children }: Props) {
  const child = React.isValidElement(children) ? (children.props as { className?: string; children?: ReactNode }) : null;
  if (child?.className?.startsWith("language-")) {
    const language = child.className.replace("language-", "");
    return (
      <CodeBlock
        marginTop="8"
        marginBottom="16"
        codes={[{ code: textOf(child.children).replace(/\n$/, ""), language, label: language.charAt(0).toUpperCase() + language.slice(1) }]}
        copyButton
      />
    );
  }
  return <pre>{children}</pre>;
}

const listOf = (as: "ul" | "ol") => {
  const L = ({ children }: Props) => <List as={as}>{children}</List>;
  L.displayName = as;
  return L;
};

function Item({ children }: Props) {
  return (
    <ListItem marginTop="4" marginBottom="8" style={{ lineHeight: "175%" }}>
      {children}
    </ListItem>
  );
}

function Rule() {
  return (
    <Row fillWidth horizontal="center">
      <Line maxWidth="40" />
    </Row>
  );
}

/** Once UI styled elements, for project write-ups. */
export const articleComponents = {
  p: Paragraph,
  h1: heading("h1"),
  h2: heading("h2"),
  h3: heading("h3"),
  h4: heading("h4"),
  h5: heading("h5"),
  h6: heading("h6"),
  img: Image,
  a: SiteLink,
  code: Code,
  pre: Pre,
  ol: listOf("ol"),
  ul: listOf("ul"),
  li: Item,
  hr: Rule,
} as unknown as Components;

function ProseLink({ node, href = "", children }: Props & { href?: string }) {
  if (href.startsWith("/")) return <Link href={href}>{children}</Link>;
  if (href.startsWith("#")) return <a href={href}>{children}</a>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

/** Plain HTML elements styled by the surrounding CSS module (About page). */
export const proseComponents = { a: ProseLink } as unknown as Components;

export function Markdown({ source, variant = "article" }: { source: string; variant?: "article" | "prose" }) {
  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
      components={variant === "article" ? articleComponents : proseComponents}
    >
      {source}
    </ReactMarkdown>
  );
}
