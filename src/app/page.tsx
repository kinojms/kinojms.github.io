import { Schema, Meta } from "@once-ui-system/core";
import { home, about, person, baseURL } from "@/resources";
import { loadContent } from "@/lib/content/load";
import { HomeView } from "@/components/views/HomeView";

export async function generateMetadata() {
  return Meta.generate({
    title: home.title,
    description: home.description,
    baseURL: baseURL,
    path: home.path,
    image: home.image,
  });
}

export default function Home() {
  const content = loadContent();
  return (
    <>
      <Schema
        as="webPage"
        baseURL={baseURL}
        path={home.path}
        title={home.title}
        description={home.description}
        image={home.image}
        author={{
          name: person.name,
          url: `${baseURL}${about.path}`,
          image: `${baseURL}${person.avatar}`,
        }}
      />
      <HomeView
        home={content.home}
        aboutTitle={content.about.title}
        avatar={content.site.person.avatar}
        projects={content.projects}
      />
    </>
  );
}
