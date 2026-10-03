// CertWise - role information and the "Find my role" quiz
//
// salary and demand come from public 2026 reports (see sources). They are a rough guide:
// fresher pay depends mostly on the type of company (IT services vs product) and the city.
// Re-check the sources before the demo.

const SOURCES = {
  naukriApr: { name: "Naukri JobSpeak, April 2026", url: "https://www.naukri.com/blog/naukri-jobspeak-april-26-growth-in-insurance-leads-the-pack-banking-and-it-sectors/" },
  isr2026:   { name: "India Skills Report 2026", url: "https://news.careers360.com/india-skills-report-2026-employability-56-35-pc-ai-tools-digital-gig-economy-workforce-global-talent-hub/amp" },
  teamlease: { name: "TeamLease Digital Skills & Salary Primer 2025-26", url: "https://business.teamleasedigital.com/digital-skills-and-salary-primer-fy2025-26/" },
  tlGap:     { name: "TeamLease Digital talent-gap report (YourStory, Sept 2026)", url: "https://yourstory.com/2026/09/talent-gap-genai-cloud-india-stands-53-60-teamlease-digital-report" },
  hyring:    { name: "Hyring fresher salary guide 2026", url: "https://hyring.com/blog/fresher-salary-guide-india-2026/" },
  devSal:    { name: "Futurense: software developer salary 2026", url: "https://futurense.com/blog/software-developer-salary-in-india" },
  ppHigh:    { name: "PlacementPreparation: high-paying jobs for freshers", url: "https://www.placementpreparation.io/blog/high-paying-jobs-for-freshers/" },
  socSal:    { name: "SOC analyst salary India 2026 (GrowAI)", url: "https://growai.in/soc-analyst-salary-india-2026-complete-breakdown/" }
};

// one line shown under every salary: local reference for Pune students
const PUNE_NOTE = { text: "Freshers in Pune average ₹4 - 9 LPA across roles", src: ["hyring"] };

const ROLE_INFO = {
  dev: {
    what: "Writes the code behind apps and systems, fixes bugs and adds features.",
    subjects: ["Programming (C / Python)", "Data Structures", "OOP (Java / C++)", "DBMS", "Operating Systems", "Software Engineering"],
    learnNext: ["One language deeply (Java, Python or C++)", "DSA practice", "Git & GitHub", "SQL", "Building REST APIs"],
    project: "Build a small app with a database (e.g. a library or hostel-mess manager) and put it on GitHub.",
    demand: { label: "IT under pressure", note: "Naukri JobSpeak, April 2026: IT hiring remained under pressure, while AI/ML hiring grew 32%.", src: ["naukriApr"] },
    salary: { range: "₹3.5 - 5 LPA at IT services firms; ₹12 - 22 LPA at product companies", src: ["devSal"] }
  },
  web: {
    what: "Builds websites and web apps - the part users see and the server behind it.",
    subjects: ["Web Technologies", "DBMS", "Programming (JavaScript)", "Software Engineering", "Computer Networks (how HTTP works)"],
    learnNext: ["HTML, CSS, JavaScript well", "React", "Node.js & Express", "Git & GitHub", "Responsive design"],
    project: "Make your own portfolio site plus one full web app with login and a database.",
    demand: { label: "IT under pressure", note: "Naukri JobSpeak, April 2026: IT hiring remained under pressure, while AI/ML hiring grew 32%.", src: ["naukriApr"] },
    salary: { range: "₹4 - 10 LPA for web developers", src: ["ppHigh"] }
  },
  cloud: {
    what: "Sets up and runs servers and cloud services, and automates how software is shipped.",
    subjects: ["Operating Systems (Linux)", "Computer Networks", "Cloud Computing (elective)", "DBMS", "Programming / scripting"],
    learnNext: ["Linux command line", "One cloud: AWS or Azure", "Docker", "CI/CD (GitHub Actions / Jenkins)", "Shell or Python scripting"],
    project: "Host a small web app on a cloud free tier with Docker and an automatic deploy from GitHub.",
    demand: { label: "In demand", note: "India Skills Report 2026: cloud computing is one of the most in-demand skills. TeamLease Digital reports a 53-60% talent gap in GenAI and cloud skills.", src: ["isr2026", "tlGap"] },
    salary: { range: "₹6 - 12 LPA for cloud engineers; TeamLease: ₹7 - 8.5 LPA for AI and cloud freshers", src: ["ppHigh", "teamlease"] }
  },
  sec: {
    what: "Protects systems and data - watches for attacks, finds weaknesses and responds to incidents.",
    subjects: ["Computer Networks", "Operating Systems", "Information / Network Security & Cryptography", "DBMS (SQL injection!)", "Programming"],
    learnNext: ["Networking basics (TCP/IP, ports)", "Linux", "How web attacks work (OWASP Top 10)", "A SIEM tool (e.g. Splunk free training)", "Python for scripts"],
    project: "Build a home lab (two VMs), capture traffic with Wireshark, and write up what you found.",
    demand: { label: "In demand", note: "India Skills Report 2026: cybersecurity is one of the most in-demand skills.", src: ["isr2026"] },
    salary: { range: "₹5 - 12 LPA for cybersecurity analysts; SOC analyst freshers start from about ₹3.5 LPA", src: ["ppHigh", "socSal"] }
  },
  data: {
    what: "Turns data into answers - cleans it, analyses it and builds dashboards for decisions.",
    subjects: ["Probability & Statistics", "DBMS (SQL)", "Programming (Python)", "Engineering Maths"],
    learnNext: ["SQL (joins, group by)", "Excel / Google Sheets", "Power BI or Tableau", "Python with pandas", "Basic statistics"],
    project: "Pick a public dataset (e.g. cricket or rainfall), clean it and publish a dashboard with 3 clear insights.",
    demand: { label: "In demand", note: "India Skills Report 2026: data analytics is one of the most in-demand skills.", src: ["isr2026"] },
    salary: { range: "₹4 - 10 LPA for data analysts", src: ["ppHigh"] }
  },
  ai: {
    what: "Builds models that learn from data - predictions, recommendations, language and image features.",
    subjects: ["Probability & Statistics", "Linear Algebra / Engineering Maths", "Programming (Python)", "Data Structures", "AI / Machine Learning electives"],
    learnNext: ["Python well", "Statistics & linear algebra", "scikit-learn", "Deep learning (PyTorch)", "Working with LLM APIs"],
    project: "Train a small model on a real dataset, explain its accuracy honestly, and deploy it as a simple web demo.",
    demand: { label: "Growing fast", note: "Naukri JobSpeak, April 2026: AI/ML hiring grew 32%, while IT hiring remained under pressure.", src: ["naukriApr"] },
    salary: { range: "₹5 - 15 LPA for AI/ML freshers; TeamLease: ₹7 - 8.5 LPA for AI and cloud freshers", src: ["hyring", "teamlease"] }
  }
};

// Each option gives points to one or more roles.
const QUIZ = [
  {
    q: "Which subject do you enjoy most (or think you will)?",
    options: [
      { text: "Programming / Data Structures", pts: { dev: 3, ai: 1 } },
      { text: "Web Technologies (making web pages)", pts: { web: 3, dev: 1 } },
      { text: "Operating Systems / Linux commands", pts: { cloud: 3, sec: 1 } },
      { text: "Computer Networks", pts: { sec: 2, cloud: 2 } },
      { text: "Probability & Statistics / Maths", pts: { data: 2, ai: 2 } },
      { text: "DBMS / SQL", pts: { data: 2, dev: 1, web: 1 } }
    ]
  },
  {
    q: "Which task sounds most fun?",
    options: [
      { text: "Build an app or feature people will use", pts: { dev: 3, web: 1 } },
      { text: "Make a website look and feel great", pts: { web: 3 } },
      { text: "Set up servers and automate deployments", pts: { cloud: 3 } },
      { text: "Find how a system can be broken, then fix it", pts: { sec: 3 } },
      { text: "Turn messy data into charts that answer a question", pts: { data: 3 } },
      { text: "Teach a computer to predict or recognise things", pts: { ai: 3 } }
    ]
  },
  {
    q: "When something breaks, what do you enjoy doing?",
    options: [
      { text: "Tracing the logic step by step in the code", pts: { dev: 2, ai: 1 } },
      { text: "Fixing the layout until it looks right", pts: { web: 2 } },
      { text: "Reading logs and settings to find the cause", pts: { cloud: 2, sec: 1 } },
      { text: "Working out whether someone attacked it", pts: { sec: 2 } },
      { text: "Checking the numbers to see what changed", pts: { data: 2 } }
    ]
  },
  {
    q: "How do you feel about maths and statistics?",
    options: [
      { text: "I like it", pts: { ai: 3, data: 2 } },
      { text: "It's okay", pts: { data: 1, dev: 1, sec: 1, cloud: 1 } },
      { text: "I'd rather avoid it", pts: { web: 2, cloud: 1, dev: 1 } }
    ]
  },
  {
    q: "What kind of result motivates you most?",
    options: [
      { text: "Seeing something on screen right away", pts: { web: 3 } },
      { text: "A program that solves a hard problem", pts: { dev: 3, ai: 1 } },
      { text: "A system that never goes down", pts: { cloud: 3 } },
      { text: "Keeping people and their data safe", pts: { sec: 3 } },
      { text: "An insight that helps someone decide", pts: { data: 3 } },
      { text: "A smart feature that feels like magic", pts: { ai: 3 } }
    ]
  },
  {
    q: "How do you feel about the command line (terminal)?",
    options: [
      { text: "I love it", pts: { cloud: 2, sec: 2 } },
      { text: "Fine when I need it", pts: { dev: 1, data: 1, ai: 1 } },
      { text: "I prefer visual tools", pts: { web: 1, data: 1 } }
    ]
  },
  {
    q: "Which news story would you click first?",
    options: [
      { text: "A new app launch", pts: { dev: 2, web: 1 } },
      { text: "A big website outage", pts: { cloud: 2 } },
      { text: "A data breach", pts: { sec: 2 } },
      { text: "A chart about elections or cricket stats", pts: { data: 2 } },
      { text: "A new AI model", pts: { ai: 2 } },
      { text: "A beautiful website redesign", pts: { web: 2 } }
    ]
  },
  {
    q: "How do you like to work?",
    options: [
      { text: "Building new things from scratch", pts: { dev: 2, web: 1 } },
      { text: "Keeping things running smoothly", pts: { cloud: 2 } },
      { text: "Investigating and solving puzzles", pts: { sec: 2, data: 1 } },
      { text: "Explaining findings to people", pts: { data: 2 } },
      { text: "Experimenting and trying ideas", pts: { ai: 2 } }
    ]
  }
];

if (typeof module !== "undefined") {
  module.exports = { ROLE_INFO, QUIZ, SOURCES, PUNE_NOTE };
}
