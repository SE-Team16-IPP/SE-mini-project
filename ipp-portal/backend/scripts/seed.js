// Creates demo accounts, listings and an aptitude test. Safe to run more than once.
require("dotenv").config();
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../src/models/User");
const Listing = require("../src/models/Listing");
const Test = require("../src/models/Test");

const DEMO = [
  { name: "Demo Admin", email: "admin@ipp.test", password: "Admin@123", role: "Admin" },
  { name: "Demo Recruiter", email: "recruiter@ipp.test", password: "Recruiter@123", role: "Recruiter" },
  { name: "Demo Student", email: "student@ipp.test", password: "Student@123", role: "Student" },
];

const days = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

async function main() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ipp");

  const users = {};
  for (const u of DEMO) {
    let doc = await User.findOne({ email: u.email });
    if (!doc) doc = await User.create({ ...u, password: await bcrypt.hash(u.password, 10) });
    users[u.role] = doc;
  }

  if ((await Listing.countDocuments({ recruiter: users.Recruiter._id })) === 0) {
    await Listing.create([
      {
        recruiter: users.Recruiter._id,
        title: "Web Developer Intern",
        company: "Acme Technologies",
        description: "Build features for our React and Node.js products with a mentor.",
        requiredSkills: ["React", "Node.js", "MongoDB"],
        location: "Bengaluru",
        duration: "3 months",
        stipend: 15000,
        deadline: days(30),
      },
      {
        recruiter: users.Recruiter._id,
        title: "Data Analyst Intern",
        company: "Northwind Analytics",
        description: "Clean data, build dashboards and present insights to the product team.",
        requiredSkills: ["Python", "SQL", "Excel"],
        location: "Remote",
        duration: "6 months",
        stipend: 20000,
        deadline: days(20),
      },
      {
        recruiter: users.Recruiter._id,
        title: "QA Engineer Intern",
        company: "Globex Software",
        description: "Write and run test plans and automate regression tests.",
        requiredSkills: ["Testing", "Selenium", "JavaScript"],
        location: "Hyderabad",
        duration: "4 months",
        stipend: 12000,
        deadline: days(14),
      },
    ]);
  }

  if ((await Test.countDocuments()) === 0) {
    await Test.create({
      title: "Quantitative Aptitude 1",
      category: "Quant",
      timeLimitMinutes: 10,
      createdBy: users.Admin._id,
      questions: [
        { text: "What is 15% of 200?", options: ["20", "25", "30", "35"], correctIndex: 2 },
        { text: "A train travels 120 km in 2 hours. What is its speed?", options: ["50 km/h", "60 km/h", "70 km/h", "80 km/h"], correctIndex: 1 },
        { text: "What comes next: 2, 6, 12, 20, ?", options: ["28", "30", "32", "36"], correctIndex: 1 },
        { text: "If 3x + 5 = 20, what is x?", options: ["3", "4", "5", "6"], correctIndex: 2 },
        { text: "The average of 10, 20 and 30 is:", options: ["15", "20", "25", "30"], correctIndex: 1 },
      ],
    });
    await Test.create({
      title: "Logical Reasoning 1",
      category: "Logical",
      timeLimitMinutes: 8,
      createdBy: users.Admin._id,
      questions: [
        { text: "All cats are animals. Some animals are pets. Which must be true?", options: ["All cats are pets", "Some cats may be pets", "No cat is a pet", "All pets are cats"], correctIndex: 1 },
        { text: "Find the odd one out: Apple, Banana, Carrot, Mango", options: ["Apple", "Banana", "Carrot", "Mango"], correctIndex: 2 },
        { text: "If MONDAY is coded as NPOEBZ, how is FRIDAY coded?", options: ["GSJEBZ", "GSJEAZ", "GRJEBZ", "GSKEBZ"], correctIndex: 0 },
      ],
    });
  }

  console.log("Seed complete. Demo logins:");
  DEMO.forEach((u) => console.log(`  ${u.role}: ${u.email} / ${u.password}`));
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
