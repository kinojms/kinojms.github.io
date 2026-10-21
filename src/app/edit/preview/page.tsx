import type { Metadata } from "next";
import { PreviewApp } from "@/components/editor/PreviewApp";

export const metadata: Metadata = {
  title: "Preview",
  robots: { index: false, follow: false, nocache: true },
};

export default function PreviewPage() {
  return <PreviewApp />;
}
