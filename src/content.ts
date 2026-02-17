export const meta = {
  name: "Dylan Geraci",
  email: "dylangeraci.dev@gmail.com",
  linkedin: "https://www.linkedin.com/in/dylangeraci/",
  github: "https://github.com/Dylan-Geraci",
  resumePath: "/images/Resume_DylanGeraci.pdf",
  headshotPath: "/images/headshot_first.jpeg",
  siteUrl: "https://dylangeraci.com",
};

export const about = {
  headline: "Software Engineer & AI/ML Enthusiast",
  bio: "Hi, I'm Dylan, a senior Computer Science student at Cal State Fullerton passionate about creating innovative solutions with real-world impact. I'm a growth-minded, full-stack software engineer with experience building apps and services across a wide range of languages and technologies. My enthusiasm lies in crafting software that turns complex problems into robust, scalable solutions — always learning, always building.",
  education: {
    school: "California State University, Fullerton",
    degree: "B.S. Computer Science",
    gpa: "3.97",
    graduation: "May 2026",
  },
};

export interface ExperienceEntry {
  role: string;
  company: string;
  companyUrl?: string;
  date: string;
  summary: string;
  tags: string[];
}

export const experience: ExperienceEntry[] = [
  {
    role: "Software Engineer Intern",
    company: "Crete Robotics Solutions",
    date: "Oct 2025 — Present",
    summary: "Architecting a FastAPI backend with 30+ REST endpoints, real-time WebSocket messaging with JWT auth, and MongoDB persistence for an AI-powered task marketplace. Integrated Google Gemini AI for NLP-based query parsing to improve task matching accuracy.",
    tags: ["Python", "FastAPI", "MongoDB", "AI/ML", "REST APIs", "WebSockets"],
  },
  {
    role: "Software Engineer Intern",
    company: "Yembo",
    companyUrl: "https://www.emit-light.com/lightwall",
    date: "Sep 2025 — Jan 2026",
    summary: "Rebuilt a multi-threaded Python system orchestrating 16 microcontrollers for real-time AI interaction, and engineered a speech recognition pipeline using whisper.cpp achieving 2–4s response latency. Deployed a production AI installation serving continuous live interaction during a multi-month museum exhibition.",
    tags: ["Python", "Embedded Systems", "Speech Recognition", "AI/ML", "whisper.cpp"],
  },
  {
    role: "Peer Advisor",
    company: "Project RAISE",
    companyUrl: "https://www.fullerton.edu/projectraise/",
    date: "Jul 2025 — Present",
    summary: "Mentoring 40+ STEM transfer students through 1-on-1 advising, technical guidance, and academic planning. Delivering technical presentations and workshops to 100+ students on software engineering and career development.",
    tags: ["Mentoring", "Leadership", "STEM Education"],
  },
  {
    role: "Artificial Intelligence Officer",
    company: "ACM",
    companyUrl: "https://acmcsuf.com",
    date: "May 2025 — Present",
    summary: "Serving as a board member for the AI Team, conducting Data Science and ML workshops for 35+ students covering feature engineering, model training, and evaluation. Increased workshop attendance by 50% by developing real-world programming demo applications.",
    tags: ["Technical Communication", "Project Planning", "AI/ML"],
  },
  {
    role: "Instructor",
    company: "MIT's Day of AI — NextEdu Lab",
    companyUrl: "https://dayofai.org",
    date: "Jun 2025 — Sep 2025",
    summary: "Taught MIT AI concepts using Scratch, DALL·E, and ChatGPT, guiding students through hands-on activities and prompt-based AI interactions in a collaborative learning environment.",
    tags: ["Artificial Intelligence", "Machine Learning", "Teaching"],
  },
  {
    role: "Sales and Service Expert",
    company: "24 Hour Fitness",
    date: "Jun 2022 — Aug 2025",
    summary: "Led a team of 10 while providing daily support to 800+ members, consistently exceeding 130% of monthly revenue goals.",
    tags: ["Sales", "Customer Service", "Team Collaboration"],
  },
];

export interface ProjectEntry {
  title: string;
  description: string;
  tags: string[];
  image?: string;
  imagePosition?: string;
  links: { label: string; url: string }[];
}

export const projects: ProjectEntry[] = [
  {
    title: "SessionLog",
    description:
      "Full-stack practice analytics platform that enables musicians to track sessions, visualize progress, and maintain consistency through real-time analytics, goal tracking, and secure PostgreSQL-backed storage.",
    tags: ["Next.js", "TypeScript", "Supabase", "PostgreSQL", "Tailwind CSS", "Full-Stack", "Database Design"],
    image: "/images/session_log.png",
    links: [
      { label: "Live App", url: "https://www.getsessionlog.com" },
      { label: "Source Code", url: "https://github.com/Dylan-Geraci/music-practice-analytics" },
    ],
  },
  {
    title: "ParkSafe-LA",
    description:
      "ML system predicting parking citation risk using 23+ million LA citation records. Deployed full-stack web app.",
    tags: ["Python", "Flask", "React", "Machine Learning", "Data Engineering", "Vercel"],
    image: "/images/parksafe_image.png",
    links: [
      { label: "Open App", url: "https://www.park-safe-la.com" },
      { label: "Source Code", url: "https://github.com/Dylan-Geraci/ParkSafe-LA" },
    ],
  },
  {
    title: "Carelink — AI Memory Companion",
    description:
      "Offline-first AI-powered memory companion for caregivers supporting individuals with dementia and Alzheimer's. Features audio transcription, event summarization, and secure encrypted local storage.",
    tags: ["Python", "FastAPI", "Next.js", "Tailwind CSS", "SQLite", "LLM Integration"],
    image: "/images/carelink_picture.png",
    imagePosition: "center 75%",
    links: [
      { label: "Source Code", url: "https://github.com/amirValiulla32/Carelink" },
    ],
  },
  // {
  //   title: "Cloud Infrastructure Migration",
  //   description:
  //     "Led enterprise VM migration to Azure with CI/CD automation. Improved deployment success rate by 55% through optimized pipelines and reduced setup time by 40% with Azure CLI scripting.",
  //   tags: ["Azure", "Linux", "CI/CD", "DevOps", "Cloud Architecture"],
  //   image: "/images/migration_picture.png",
  //   links: [],
  // },
];

export const skills = {
  languages: ["Python", "JavaScript", "TypeScript", "C++", "Java", "SQL", "C", "HTML", "CSS", "R"],
  frameworks: ["FastAPI", "React.js", "Next.js", "Node.js", "Express.js", "Django", "Flask", "Tailwind CSS"],
  tools: ["Git", "Docker", "Kubernetes", "PyTorch", "TensorFlow", "Vercel", "Railway", "Supabase"],
  infrastructure: ["PostgreSQL", "MongoDB", "MySQL", "SQLite", "AWS", "Google Cloud", "Azure", "Oracle Cloud", "Cloudflare"],
};

export const sections = [
  { id: "about", label: "About" },
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "contact", label: "Contact" },
] as const;
