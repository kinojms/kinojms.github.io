import type { Metadata } from "next";
import { EditorApp } from "@/components/editor/EditorApp";

// The Content-Security-Policy <meta> is added to the exported HTML by scripts/inject-csp.mjs.
export const metadata: Metadata = {
  title: "Edit portfolio",
  robots: { index: false, follow: false, nocache: true },
};

export default function EditPage() {
  return <EditorApp />;
}
