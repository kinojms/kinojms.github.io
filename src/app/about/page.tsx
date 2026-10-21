import { Metadata } from "next";
import { Schema } from "@once-ui-system/core";
import { about, baseURL, home, person } from "@/resources";
import { loadContent } from "@/lib/content/load";
import { AboutView } from "@/components/views/AboutView";

export const metadata: Metadata = {
  title: about.title,
  description: about.description,
  alternates: { canonical: `${baseURL}/about` },
  openGraph: { title: about.title, description: about.description, images: [home.image] },
};

export default function About() {
  const content = loadContent();
  return (
    <>
      <Schema
        as="webPage"
        baseURL={baseURL}
        title={about.title}
        description={about.description}
        path={about.path}
        image={home.image}
        author={{ name: person.name, url: `${baseURL}/about`, image: `${baseURL}${person.avatar}` }}
      />
      <AboutView site={content.site} about={content.about} />
    </>
  );
}
