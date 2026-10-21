// Kept for the template's (disabled) blog components; renders through the shared Markdown renderer.
import { Markdown } from "@/components/Markdown";

export function CustomMDX({ source }: { source: string }) {
  return <Markdown source={source} />;
}
