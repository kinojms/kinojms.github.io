// Adapter: the editable content lives in /content (JSON + Markdown) so the in-site editor
// can read and write it. This file maps it onto the shapes the Once UI template expects.
import { About, Blog, Gallery, Home, Newsletter, Person, Social, Work } from "@/types";
import siteJson from "../../content/site.json";
import homeJson from "../../content/home.json";
import aboutJson from "../../content/about.json";
import workJson from "../../content/work.json";
// Link-preview image, regenerated from the content on every build by scripts/og/generate.mjs.
import og from "./og.json";

const person: Person = {
  ...siteJson.person,
  location: siteJson.person.location as Person["location"],
  locale: "en",
};

const social: Social = siteJson.social.map((s) => ({ ...s, essential: s.essential ?? true })) as Social;

const newsletter: Newsletter = { display: false, title: "Updates", description: "Project updates" };

const home: Home = {
  path: "/",
  image: og.home,
  label: "Home",
  title: homeJson.title,
  description: homeJson.description,
  headline: homeJson.headline,
  featured: homeJson.featured,
  subline: homeJson.subline,
};

const about: About = {
  path: "/about",
  label: "About",
  title: aboutJson.title,
  description: aboutJson.description,
  tableOfContent: { display: false, subItems: false },
  avatar: { display: true },
  calendar: { display: false, link: "" },
  intro: { display: false, title: "", description: "" },
  work: { display: false, title: "", experiences: [] },
  studies: { display: false, title: "", institutions: [] },
  technical: { display: false, title: "", skills: [] },
};

const blog: Blog = { path: "/blog", label: "Blog", title: "Writing", description: "Writing by Justin Sacdalan" };
const work: Work = { path: "/work", label: "Projects", title: workJson.title, description: workJson.description };
const gallery: Gallery = { path: "/gallery", label: "Gallery", title: "Gallery", description: "Gallery", images: [] };

export { person, social, newsletter, home, about, blog, work, gallery };
