// CertWise - the jobs a certificate leads to: demand and fresher salary
//
// salary and demand come from public 2026 reports (see SOURCES). They are a rough guide:
// fresher pay depends mostly on the type of company (IT services vs product) and the city.
// The monthly refresh (refresh/refresh.mjs) re-checks them and shows the newest verified figures.

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
    demand: { label: "IT under pressure", note: "Naukri JobSpeak, April 2026: IT hiring remained under pressure, while AI/ML hiring grew 32%.", src: ["naukriApr"] },
    salary: { range: "₹3.5 - 5 LPA at IT services firms; ₹12 - 22 LPA at product companies", src: ["devSal"] }
  },
  web: {
    what: "Builds websites and web apps - the part users see and the server behind it.",
    demand: { label: "IT under pressure", note: "Naukri JobSpeak, April 2026: IT hiring remained under pressure, while AI/ML hiring grew 32%.", src: ["naukriApr"] },
    salary: { range: "₹4 - 10 LPA for web developers", src: ["ppHigh"] }
  },
  cloud: {
    what: "Sets up and runs servers and cloud services, and automates how software is shipped.",
    demand: { label: "In demand", note: "India Skills Report 2026: cloud computing is one of the most in-demand skills. TeamLease Digital reports a 53-60% talent gap in GenAI and cloud skills.", src: ["isr2026", "tlGap"] },
    salary: { range: "₹6 - 12 LPA for cloud engineers; TeamLease: ₹7 - 8.5 LPA for AI and cloud freshers", src: ["ppHigh", "teamlease"] }
  },
  sec: {
    what: "Protects systems and data - watches for attacks, finds weaknesses and responds to incidents.",
    demand: { label: "In demand", note: "India Skills Report 2026: cybersecurity is one of the most in-demand skills.", src: ["isr2026"] },
    salary: { range: "₹5 - 12 LPA for cybersecurity analysts; SOC analyst freshers start from about ₹3.5 LPA", src: ["ppHigh", "socSal"] }
  },
  data: {
    what: "Turns data into answers - cleans it, analyses it and builds dashboards for decisions.",
    demand: { label: "In demand", note: "India Skills Report 2026: data analytics is one of the most in-demand skills.", src: ["isr2026"] },
    salary: { range: "₹4 - 10 LPA for data analysts", src: ["ppHigh"] }
  },
  ai: {
    what: "Builds models that learn from data - predictions, recommendations, language and image features.",
    demand: { label: "Growing fast", note: "Naukri JobSpeak, April 2026: AI/ML hiring grew 32%, while IT hiring remained under pressure.", src: ["naukriApr"] },
    salary: { range: "₹5 - 15 LPA for AI/ML freshers; TeamLease: ₹7 - 8.5 LPA for AI and cloud freshers", src: ["hyring", "teamlease"] }
  }
};

if (typeof module !== "undefined") {
  module.exports = { ROLE_INFO, SOURCES, PUNE_NOTE };
}
