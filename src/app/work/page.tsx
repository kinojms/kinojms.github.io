import { Meta, Schema } from "@once-ui-system/core";
import { baseURL, about, home, person, work } from "@/resources";
import { loadContent } from "@/lib/content/load";
import { WorkView } from "@/components/views/WorkView";

export async function generateMetadata() {
  return Meta.generate({
    title: work.title,
    description: work.description,
    baseURL: baseURL,
    image: home.image,
    path: work.path,
  });
}

export default function Work() {
  const content = loadContent();
  return (
    <>
      <Schema
        as="webPage"
        baseURL={baseURL}
        path={work.path}
        title={work.title}
        description={work.description}
        image={home.image}
        author={{
          name: person.name,
          url: `${baseURL}${about.path}`,
          image: `${baseURL}${person.avatar}`,
        }}
      />
      <WorkView work={content.work} projects={content.projects} />
    </>
  );
}
