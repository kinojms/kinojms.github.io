import { notFound } from "next/navigation";
import "katex/dist/katex.min.css";
import { Meta, Schema } from "@once-ui-system/core";
import { Metadata } from "next";
import { baseURL, about, person, work } from "@/resources";
import { ScrollToHash } from "@/components";
import { loadProjects, findProject } from "@/lib/content/load";
import { ProjectView } from "@/components/views/ProjectView";

type Params = { params: Promise<{ slug: string | string[] }> };

const slugOf = async (params: Params["params"]) => {
  const { slug } = await params;
  return Array.isArray(slug) ? slug.join("/") : slug || "";
};

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return loadProjects().map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const project = findProject(await slugOf(params));
  if (!project) return {};
  return Meta.generate({
    title: project.title,
    description: project.summary,
    baseURL: baseURL,
    image: project.images[0],
    path: `${work.path}/${project.slug}`,
  });
}

export default async function Project({ params }: Params) {
  const project = findProject(await slugOf(params));
  if (!project) notFound();

  return (
    <>
      <Schema
        as="blogPosting"
        baseURL={baseURL}
        path={`${work.path}/${project.slug}`}
        title={project.title}
        description={project.summary}
        datePublished={project.publishedAt}
        dateModified={project.publishedAt}
        image={project.images[0]}
        author={{
          name: person.name,
          url: `${baseURL}${about.path}`,
          image: `${baseURL}${person.avatar}`,
        }}
      />
      <ProjectView project={project} projects={loadProjects()} />
      <ScrollToHash />
    </>
  );
}
