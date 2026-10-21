import { About, Blog, Gallery, Home, Newsletter, Person, Social, Work } from "@/types";

const person: Person = {
  firstName: "Justin",
  lastName: "Sacdalan",
  name: "Justin Morrie Sacdalan",
  role: "Computer Science student · Software developer",
  avatar: "/images/justin-avatar.png",
  email: "sacdalanjme@gmail.com",
  location: "Asia/Manila",
  languages: ["English", "Filipino"],
  locale: "en",
};

const social: Social = [
  { name: "GitHub", icon: "github", link: "https://github.com/kinojms", essential: true },
  { name: "LinkedIn", icon: "linkedin", link: "https://www.linkedin.com/in/justin-sacdalan/", essential: true },
  { name: "Email", icon: "email", link: `mailto:${person.email}`, essential: true },
];

const newsletter: Newsletter = { display: false, title: <>Updates</>, description: <>Project updates</> };

const home: Home = {
  path: "/",
  image: "/images/og/home.jpg",
  label: "Home",
  title: "Justin Morrie Sacdalan — Developer & creative",
  description: "Selected software projects by Justin Sacdalan: mobile apps, creative web experiences, games and systems.",
  headline: <>Building useful things, and curious ones.</>,
  featured: { display: true, title: <>Latest project · Gastos.io ↗</>, href: "/work/gastos-io" },
  subline: <>I’m Justin, a Computer Science student at De La Salle University. I build practical tools, playful interfaces and digital experiences that connect technology with creativity.</>,
};

const about: About = {
  path: "/about", label: "About", title: "About Justin Morrie Sacdalan",
  description: "Meet Justin Morrie Sacdalan: Computer Science student, developer and digital creative at De La Salle University.",
  tableOfContent: { display: false, subItems: false },
  avatar: { display: true },
  calendar: { display: false, link: "" },
  intro: { display: true, title: "Introduction", description: <>I work across mobile, web and systems programming. My public projects range from an offline-first expense tracker and a workout deckbuilder to interactive web experiments and a C++ OS emulator. Browse the work below or get in touch about a project.</> },
  work: { display: false, title: "Work experience", experiences: [] },
  studies: { display: false, title: "Studies", institutions: [] },
  technical: {
    display: true, title: "What I build", skills: [
      { title: "Web & mobile", description: <>React, Next.js, TypeScript, JavaScript, Kotlin and installable web apps.</>, tags: [], images: [] },
      { title: "Games & systems", description: <>Experiments in Godot/GDScript and C++ systems programming.</>, tags: [], images: [] },
    ],
  },
};
const blog: Blog = { path: "/blog", label: "Blog", title: "Writing", description: "Writing by Justin Sacdalan" };
const work: Work = { path: "/work", label: "Projects", title: "Selected projects", description: "Software projects by Justin Sacdalan" };
const gallery: Gallery = { path: "/gallery", label: "Gallery", title: "Gallery", description: "Gallery", images: [] };
export { person, social, newsletter, home, about, blog, work, gallery };
