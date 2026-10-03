// CertWise - data for the genuineness check
//
// VERIFY_METHODS: how each issuer lets anyone check that a certificate is real.
//   domains : the official websites a real verification link must be on
//   path    : (optional) what a real verification link contains, e.g. "/badges/"
//   idRe    : (optional) the format of the certificate ID, e.g. Red Hat "123-456-789"
//   page    : the official page where you check it
//   how     : what to do, in plain words
//   src     : proof links for all of the above
//
// FAKE_UNIS: the UGC list of fake universities (February 2026). A degree from these is not valid.

const VERIFY_METHODS = {
  credly: {
    name: "Credly digital badge",
    domains: ["credly.com", "youracclaim.com"], path: "/badges/",
    page: "https://www.credly.com/",
    how: "Open the badge link (credly.com/badges/...). Credly shows who issued it, to whom, and when.",
    src: [{ name: "AWS: certification badges are issued on Credly", url: "https://aws.amazon.com/certification/certification-digital-badges/" },
          { name: "Cisco: digital badges on Credly", url: "https://www.cisco.com/site/us/en/learn/training-certifications/certifications/digital-badges/index.html" },
          { name: "HashiCorp certification badges on Credly", url: "https://developer.hashicorp.com/certifications" }]
  },
  googlecloud: {
    name: "Google Cloud digital credential",
    domains: ["credly.com", "accredible.com", "credential.net"], path: "",
    page: "https://www.credly.com/organizations/google-cloud/badges",
    how: "Open the credential link. Google Cloud badges are on Credly; older certificates are on Accredible (credential.net).",
    src: [{ name: "Google Cloud Skills Boost: teamed up with Credly", url: "https://support.google.com/qwiklabs/answer/14779166" },
          { name: "Accredible: Google Cloud's earlier credentials", url: "https://accredible.com/blog/a-q-a-session-with-john-at-google" }]
  },
  mslearn: {
    name: "Microsoft Learn share link",
    domains: ["learn.microsoft.com"], path: "",
    page: "https://learn.microsoft.com/en-us/credentials/certifications/view-share-transcript",
    how: "Ask for the Microsoft Learn share link to the certification or transcript (the profile must be public).",
    src: [{ name: "Microsoft Learn: view and share your transcript", url: "https://learn.microsoft.com/en-us/credentials/certifications/view-share-transcript" }]
  },
  coursera: {
    name: "Coursera verify link",
    domains: ["coursera.org"], path: "/verify/",
    page: "https://www.coursera.org/",
    how: "Every Coursera certificate has a link like coursera.org/verify/CODE in its corner. Open it to see Coursera's own record.",
    src: [{ name: "Coursera blog: the verify URL on every certificate", url: "https://blog.coursera.org/the-anatomy-of-a-verified-certificate-shareable" }]
  },
  nptel: {
    name: "NPTEL QR code",
    domains: ["nptel.ac.in"], path: "/noc/",
    page: "https://nptel.ac.in/",
    how: "Scan the QR code on the certificate. It opens the same certificate from NPTEL's own records on nptel.ac.in.",
    src: [{ name: "NPTEL certificates: 'verified by scanning the QR code' (college NAAC file)", url: "https://naac2024.sjctnc.edu.in/assets/C_1/1.3.2/Course_Certificates/SWAYAM_NPTEL_CC/SWAYAM-NPTEL_Certificates-2020-2021.pdf" }]
  },
  redhat: {
    name: "Red Hat certification ID",
    domains: ["redhat.com"], path: "",
    idRe: "^\\d{3}-\\d{3}-\\d{3}$", idHint: "123-456-789",
    page: "https://rhtapps.redhat.com/verify",
    how: "Enter the certificate number (format 123-456-789) on Red Hat's verify page. Only current certifications show up.",
    src: [{ name: "Red Hat Certification Central: verify", url: "https://rhtapps.redhat.com/verify" }]
  },
  comptia: {
    name: "CompTIA verification code",
    domains: ["comptia.org", "certmetrics.com", "credly.com"], path: "",
    page: "https://verify.comptia.org/",
    how: "Enter the verification code printed on the CompTIA certificate at verify.comptia.org - it shows the status and date.",
    src: [{ name: "CompTIA help: PDF certificate and verification code", url: "https://help.comptia.org/hc/en-us/articles/14048858212884-How-Do-I-Download-a-PDF-Copy-of-My-Certification" }]
  },
  isc2: {
    name: "ISC2 member verification",
    domains: ["isc2.org", "credly.com"], path: "",
    page: "https://www.isc2.org/MemberVerification",
    how: "Enter the holder's last name and ISC2 member ID on ISC2's member verification page.",
    src: [{ name: "How to verify an ISC2 certification (Destination Certification)", url: "https://destcert.com/resources/cissp-verification/" }]
  },
  eccouncil: {
    name: "EC-Council ASPEN verify",
    domains: ["eccouncil.org"], path: "",
    page: "https://aspen.eccouncil.org/Verify",
    how: "Check the certification number on EC-Council's ASPEN verify page.",
    src: [{ name: "EC-Council ASPEN verify page", url: "https://aspen.eccouncil.org/Verify" }]
  },
  linuxfoundation: {
    name: "Linux Foundation verify",
    domains: ["linuxfoundation.org", "credly.com"], path: "",
    page: "https://training.linuxfoundation.org/certification/verify/",
    how: "Check the certificate ID on the Linux Foundation verify page, or open the holder's Credly badge.",
    src: [{ name: "Linux Foundation certification verify page", url: "https://training.linuxfoundation.org/certification/verify/" }]
  },
  oracle: {
    name: "Oracle CertView / Credly",
    domains: ["oracle.com", "credly.com"], path: "",
    page: "https://www.oracle.com/education/",
    how: "Oracle only confirms a certification when the holder publishes it from CertView, or shares the Credly badge.",
    src: [{ name: "Oracle certification badges on Credly", url: "https://blogs.oracle.com/oracleuniversity/post/oracle-certification-badges-just-got-a-new-look" }]
  },
  hackerrank: {
    name: "HackerRank certificate link",
    domains: ["hackerrank.com"], path: "/certificates/",
    page: "https://www.hackerrank.com/skills-verification",
    how: "Open the link hackerrank.com/certificates/ID - HackerRank shows the certificate from its own records.",
    src: [{ name: "HackerRank: download and share your certificate", url: "https://hackerrank-community-knowledge-base.help.usepylon.com/articles/2077861863-download-certificate" }]
  },
  kaggle: {
    name: "Kaggle certificate link",
    domains: ["kaggle.com"], path: "/learn/certification/",
    page: "https://www.kaggle.com/learn",
    how: "Open the link kaggle.com/learn/certification/USER/COURSE.",
    src: [{ name: "Example Kaggle certificate link", url: "https://kaggle.com/learn/certification/simranpanthi/intro-to-machine-learning" }]
  },
  fcc: {
    name: "freeCodeCamp certification link",
    domains: ["freecodecamp.org"], path: "/certification/",
    page: "https://www.freecodecamp.org/learn",
    how: "Open the link freecodecamp.org/certification/USER/CERTIFICATE (the profile must be public).",
    src: [{ name: "freeCodeCamp forum: sharing your certification link", url: "https://forum.freecodecamp.org/t/how-do-you-share-your-certificates/299268" }]
  },
  unknownpage: {
    name: "No public verification page found",
    domains: [], path: "",
    page: null,
    how: "We could not find a public page where anyone can check this issuer's certificates. Ask the issuer how employers can verify it.",
    src: []
  },
  none: {
    name: "Cannot be verified online",
    domains: [], path: "",
    page: null,
    how: "This kind of certificate has no official record anyone can check. Anyone can make one, so employers can't tell a real one from a fake.",
    src: []
  }
};

// which method each certificate in data/certs.js uses
const CERT_VERIFY = {
  "aws-ccp": "credly", "aws-saa": "credly", "aws-ai": "credly",
  "az-900": "mslearn", "az-104": "mslearn", "pl-300": "mslearn",
  "gcp-cdl": "googlecloud",
  "rhcsa": "redhat",
  "cka": "linuxfoundation",
  "terraform": "credly",
  "secplus": "comptia",
  "isc2-cc": "isc2", "cissp": "isc2",
  "ceh": "eccouncil",
  "ccna": "credly", "netacad": "credly",
  "google-cyber": "coursera", "google-data": "coursera", "ml-spec": "coursera", "meta-fe": "coursera",
  "kaggle": "kaggle",
  "tf-dev": "unknownpage",
  "nptel": "nptel",
  "oracle-java-found": "oracle", "oracle-java-se": "oracle",
  "fcc": "fcc",
  "hackerrank": "hackerrank",
  "springboard": "unknownpage",
  "workshop": "none", "participation": "none", "paid-internship": "none"
};

// UGC list, February 2026 - names exactly as listed, with place
const FAKE_UNIS = [
  "Christ New Testament Deemed University, Guntur",
  "Bible Open University of India, Visakhapatnam",
  "Indian Institute of Alternative Medicine, Arunachal Pradesh",
  "World Peace of United Nations University (WPUNU), Pitampura, Delhi",
  "Institute of Management and Engineering, Kotla Mubarakpur, Delhi",
  "All India Institute of Public & Physical Health Sciences (AIIPHS), Delhi",
  "Commercial University Ltd., Daryaganj, Delhi",
  "United Nations University, Delhi",
  "Vocational University, Delhi",
  "ADR-Centric Juridical University, Rajendra Place, Delhi",
  "Indian Institute of Science and Engineering, New Delhi",
  "Viswakarma Open University for Self-Employment, Sanjay Enclave, Delhi",
  "Adhyatmik Vishwavidyalaya (Spiritual University), Rohini, Delhi",
  "National Institute of Management Solution, Janakpuri, New Delhi",
  "Mountain Institute of Management & Technology, Nehru Place, New Delhi",
  "Magic & Art University, Faridabad",
  "Daksha University (Vocational and Life Skill Education), Ranchi",
  "Sarva Bharatiya Shiksha Peeth, Tumkur",
  "Global Human Peace University, Rajaji Nagar, Bengaluru",
  "International Islamic University of Prophetic Medicine (IIUPM), Kerala",
  "St. John's University, Kishanattam, Kerala",
  "Raja Arabic University, Nagpur",
  "National Backward Krushi Vidyapeeth, Solapur",
  "Usha Latchumanan College of Education, Vazhapadiyar Nagar, Puducherry",
  "Sree Bodhi Academy of Higher Education, Thilaspet, Puducherry",
  "Rajeev Gandhi Institute of Technology & Management, Bhiwadi, Alwar",
  "Gandhi Hindi Vidyapith, Prayag, Allahabad",
  "National University of Electro Complex Homeopathy, Kanpur",
  "Netaji Subhash Chandra Bose University (Open University), Aligarh",
  "Bhartiya Shiksha Parishad, Lucknow",
  "Indian Institute of Alternative Medicine, Kolkata",
  "Institute of Alternative Medicine and Oncology, Kolkata"
];

const FAKE_UNIS_SRC = { name: "UGC fake universities list, February 2026 (Careers360)",
                        url: "https://university.careers360.com/articles/ugc-fake-universities-in-india-2026" };

if (typeof module !== "undefined") {
  module.exports = { VERIFY_METHODS, CERT_VERIFY, FAKE_UNIS, FAKE_UNIS_SRC };
}
