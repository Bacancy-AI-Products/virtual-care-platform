import {
  PrismaClient,
  Role,
  AppointmentStatus,
  Gender,
} from "../generated/prisma";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const hash = (pw: string) => bcrypt.hash(pw, 10);

// Relative date helpers
const daysFromNow = (n: number, hour = 10, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, minute, 0, 0);
  return d;
};

// ─── Availability builder (all weekdays for a given time window) ──────────────
function availability(startTime: string, endTime: string, weekdays: number[]) {
  return weekdays.map((weekday) => ({
    weekday,
    startTime,
    endTime,
    slotDuration: 30,
  }));
}

async function main() {
  console.log("🌱 Seeding BacancyTeleCare database...\n");

  // ─── SPECIALIZATIONS ─────────────────────────────────────────────────────────

  const SPECIALIZATIONS = [
    { id: "general_physician", name: "General Physician" },
    { id: "family_medicine", name: "Family Medicine" },
    { id: "internal_medicine", name: "Internal Medicine" },
    { id: "pediatrician", name: "Pediatrician" },
    {
      id: "gynecologist_obstetrician",
      name: "Gynecologist / Obstetrician (OB-GYN)",
    },
    { id: "fertility_specialist", name: "Fertility Specialist" },
    { id: "dermatologist", name: "Dermatologist" },
    { id: "cosmetologist", name: "Cosmetologist" },
    { id: "trichologist", name: "Trichologist" },
    { id: "cardiologist", name: "Cardiologist" },
    { id: "cardiac_surgeon", name: "Cardiac Surgeon" },
    { id: "orthopedic_doctor", name: "Orthopedic Doctor" },
    { id: "rheumatologist", name: "Rheumatologist" },
    { id: "sports_medicine_specialist", name: "Sports Medicine Specialist" },
    { id: "neurologist", name: "Neurologist" },
    { id: "neurosurgeon", name: "Neurosurgeon" },
    { id: "psychiatrist", name: "Psychiatrist" },
    { id: "psychologist", name: "Psychologist" },
    { id: "psychotherapist", name: "Psychotherapist" },
    { id: "gastroenterologist", name: "Gastroenterologist" },
    { id: "hepatologist", name: "Hepatologist" },
    { id: "ent_specialist", name: "ENT Specialist (Otolaryngologist)" },
    { id: "nephrologist", name: "Nephrologist" },
    { id: "urologist", name: "Urologist" },
    { id: "endocrinologist", name: "Endocrinologist" },
    { id: "diabetologist", name: "Diabetologist" },
    { id: "pulmonologist", name: "Pulmonologist" },
    { id: "oncologist", name: "Oncologist" },
    { id: "hematologist", name: "Hematologist" },
    { id: "ophthalmologist", name: "Ophthalmologist" },
    { id: "optometrist", name: "Optometrist" },
    { id: "dentist", name: "Dentist" },
    { id: "orthodontist", name: "Orthodontist" },
    { id: "oral_surgeon", name: "Oral Surgeon" },
    { id: "general_surgeon", name: "General Surgeon" },
    { id: "plastic_surgeon", name: "Plastic Surgeon" },
    { id: "vascular_surgeon", name: "Vascular Surgeon" },
    { id: "radiologist", name: "Radiologist" },
    { id: "pathologist", name: "Pathologist" },
    {
      id: "emergency_medicine_specialist",
      name: "Emergency Medicine Specialist",
    },
    { id: "critical_care_specialist", name: "Critical Care Specialist" },
    { id: "ayurveda", name: "Ayurveda" },
    { id: "homeopathy", name: "Homeopathy" },
    { id: "unani", name: "Unani" },
    { id: "siddha", name: "Siddha" },
  ];

  await prisma.specialization.createMany({
    data: SPECIALIZATIONS,
    skipDuplicates: true,
  });
  console.log(`✅ Seeded ${SPECIALIZATIONS.length} specializations`);

  // ─── DOCTORS ───────────────────────────────────────────────────────────────

  const CITY_LIST = [
    "New York",
    "Los Angeles",
    "Chicago",
    "Houston",
    "Phoenix",
    "Philadelphia",
    "San Antonio",
    "San Diego",
    "Dallas",
    "San Jose",
  ] as const;

  // DoctorProfile.specialization stores Specialization.id values (e.g. "cardiologist")
  const doctorSeeds = [
    {
      name: "Dr. Sarah Johnson",
      email: "sarah.johnson@telecare.dev",
      specialization: "general_physician",
      experienceYears: 8,
      bio: "General physician focused on preventive care and chronic disease management. Committed to patient education and holistic wellness.",
      consultationFee: 50,
      city: "New York",
      state: "New York",
      availability: availability("09:00", "17:00", [1, 2, 3, 4, 5]), // Mon–Fri
    },
    {
      name: "Dr. Michael Chen",
      email: "michael.chen@telecare.dev",
      specialization: "cardiologist",
      experienceYears: 15,
      bio: "Board-certified cardiologist specializing in heart failure, arrhythmia, and preventive cardiology. Published researcher with 40+ peer-reviewed papers.",
      consultationFee: 150,
      city: "Los Angeles",
      state: "California",
      availability: availability("10:00", "16:00", [1, 3, 5]), // Mon/Wed/Fri
    },
    {
      name: "Dr. Olivia Parker",
      email: "priya.patel@telecare.dev",
      specialization: "dermatologist",
      experienceYears: 6,
      bio: "Dermatologist specializing in acne, eczema, psoriasis, and cosmetic procedures. Passionate about skin health for all skin types.",
      consultationFee: 100,
      city: "Chicago",
      state: "Illinois",
      availability: availability("11:00", "17:00", [2, 4]), // Tue/Thu
    },
    {
      name: "Dr. James Wilson",
      email: "james.wilson@telecare.dev",
      specialization: "pediatrician",
      experienceYears: 10,
      bio: "Pediatrician providing compassionate care for newborns through adolescents. Special interest in developmental milestones and childhood nutrition.",
      consultationFee: 75,
      city: "Houston",
      state: "Texas",
      availability: availability("08:00", "14:00", [1, 2, 3, 4, 5]), // Mon–Fri
    },
    {
      name: "Dr. Emily Rodriguez",
      email: "emily.rodriguez@telecare.dev",
      specialization: "neurologist",
      experienceYears: 12,
      bio: "Neurologist with expertise in migraines, epilepsy, and multiple sclerosis. Uses evidence-based approaches and telemedicine-friendly treatment plans.",
      consultationFee: 200,
      city: "Phoenix",
      state: "Arizona",
      availability: availability("14:00", "19:00", [1, 2, 3]), // Mon/Tue/Wed
    },
    // Additional doctors to reach ~30–40 total with varied specializations
    {
      name: "Dr. Lauren Mitchell",
      email: "ananya.rao@telecare.dev",
      specialization: "general_physician",
      experienceYears: 9,
      bio: "General physician with a focus on lifestyle medicine and chronic disease reversal.",
      consultationFee: 60,
      city: "Philadelphia",
      state: "Pennsylvania",
      availability: availability("10:00", "18:00", [1, 2, 3, 4, 6]),
    },
    {
      name: "Dr. Ethan Cooper",
      email: "arjun.mehta@telecare.dev",
      specialization: "psychiatrist",
      experienceYears: 11,
      bio: "Psychiatrist specializing in mood disorders, anxiety, and telepsychiatry-based follow-up care.",
      consultationFee: 140,
      city: "San Antonio",
      state: "Texas",
      availability: availability("15:00", "21:00", [1, 3, 5]),
    },
    {
      name: "Dr. Emily Carter",
      email: "kavya.nair@telecare.dev",
      specialization: "gynecologist_obstetrician",
      experienceYears: 13,
      bio: "OB-GYN with experience in high-risk pregnancies and adolescent gynecology.",
      consultationFee: 130,
      city: "San Diego",
      state: "California",
      availability: availability("09:00", "14:00", [1, 2, 4, 6]),
    },
    {
      name: "Dr. Jason Miller",
      email: "rohan.singh@telecare.dev",
      specialization: "orthopedic_doctor",
      experienceYears: 10,
      bio: "Orthopedic specialist treating sports injuries, joint pain, and post-surgical rehabilitation.",
      consultationFee: 120,
      city: "Dallas",
      state: "Texas",
      availability: availability("16:00", "21:00", [2, 3, 5]),
    },
    {
      name: "Dr. Hannah Brooks",
      email: "meera.kapoor@telecare.dev",
      specialization: "endocrinologist",
      experienceYears: 14,
      bio: "Endocrinologist managing diabetes, thyroid disorders, and metabolic syndromes.",
      consultationFee: 160,
      city: "San Jose",
      state: "California",
      availability: availability("09:00", "13:00", [1, 3, 5]),
    },
    {
      name: "Dr. Daniel Rivera",
      email: "sameer.ali@telecare.dev",
      specialization: "pulmonologist",
      experienceYears: 8,
      bio: "Pulmonologist focusing on asthma, COPD, and post-COVID lung recovery.",
      consultationFee: 140,
      city: "New York",
      state: "New York",
      availability: availability("11:00", "17:00", [2, 3, 4]),
    },
    {
      name: "Dr. Madison Lee",
      email: "neha.verma@telecare.dev",
      specialization: "dermatologist",
      experienceYears: 7,
      bio: "Dermatologist with special interest in acne, pigmentation, and hair disorders.",
      consultationFee: 110,
      city: "Chicago",
      state: "Illinois",
      availability: availability("10:00", "16:00", [1, 3, 6]),
    },
    {
      name: "Dr. Brandon Scott",
      email: "vikram.desai@telecare.dev",
      specialization: "diabetologist",
      experienceYears: 9,
      bio: "Diabetologist helping patients achieve tight glycemic control with practical plans.",
      consultationFee: 100,
      city: "Houston",
      state: "Texas",
      availability: availability("08:00", "12:00", [1, 2, 3, 4, 5]),
    },
    {
      name: "Dr. Chloe Adams",
      email: "sanya.bose@telecare.dev",
      specialization: "psychologist",
      experienceYears: 6,
      bio: "Clinical psychologist providing CBT and mindfulness-based therapies.",
      consultationFee: 90,
      city: "Phoenix",
      state: "Arizona",
      availability: availability("13:00", "19:00", [2, 4, 6]),
    },
    {
      name: "Dr. Jacob Turner",
      email: "rahul.chaturvedi@telecare.dev",
      specialization: "gastroenterologist",
      experienceYears: 12,
      bio: "Gastroenterologist experienced in functional bowel disorders and liver disease.",
      consultationFee: 170,
      city: "Philadelphia",
      state: "Pennsylvania",
      availability: availability("09:00", "15:00", [1, 2, 4]),
    },
    {
      name: "Dr. Megan Foster",
      email: "tanya.gill@telecare.dev",
      specialization: "fertility_specialist",
      experienceYears: 10,
      bio: "Fertility specialist with experience in IUI, IVF, and fertility counseling.",
      consultationFee: 200,
      city: "San Antonio",
      state: "Texas",
      availability: availability("10:00", "14:00", [1, 3, 5]),
    },
    {
      name: "Dr. Ryan Howard",
      email: "nitin.kulkarni@telecare.dev",
      specialization: "sports_medicine_specialist",
      experienceYears: 7,
      bio: "Sports medicine specialist managing athletic injuries and return-to-sport programs.",
      consultationFee: 130,
      city: "San Diego",
      state: "California",
      availability: availability("17:00", "21:00", [1, 3, 5]),
    },
    {
      name: "Dr. Natalie Brooks",
      email: "aditi.sharma@telecare.dev",
      specialization: "psychiatrist",
      experienceYears: 8,
      bio: "Psychiatrist with interest in perinatal mental health and anxiety disorders.",
      consultationFee: 150,
      city: "Dallas",
      state: "Texas",
      availability: availability("11:00", "18:00", [2, 3, 5]),
    },
    {
      name: "Dr. Andrew Collins",
      email: "karan.malhotra@telecare.dev",
      specialization: "cardiologist",
      experienceYears: 10,
      bio: "Interventional cardiologist focusing on preventive cardiology and post-PCI follow-up.",
      consultationFee: 180,
      city: "San Jose",
      state: "California",
      availability: availability("09:00", "13:00", [1, 2, 3]),
    },
    {
      name: "Dr. Grace Morgan",
      email: "pooja.iyer@telecare.dev",
      specialization: "pediatrician",
      experienceYears: 5,
      bio: "Pediatrician focusing on childhood nutrition, growth monitoring, and vaccination follow-ups.",
      consultationFee: 80,
      city: "New York",
      state: "New York",
      availability: availability("09:00", "13:00", [2, 4, 6]),
    },
    {
      name: "Dr. Imran Qureshi",
      email: "imran.qureshi@telecare.dev",
      specialization: "pulmonologist",
      experienceYears: 9,
      bio: "Pulmonologist managing chronic respiratory illness and sleep apnea.",
      consultationFee: 150,
      city: "Denver",
      state: "Colorado",
      availability: availability("10:00", "16:00", [1, 3, 5]),
    },
    // Low-activity / edge-case doctors
    {
      name: "Dr. Lauren Reed",
      email: "shruti.menon@telecare.dev",
      specialization: "ayurveda",
      experienceYears: 6,
      bio: "Ayurveda practitioner specializing in lifestyle-based interventions and chronic pain.",
      consultationFee: 70,
      city: "Chicago",
      state: "Illinois",
      availability: availability("10:00", "16:00", [1, 3, 6]),
    },
    {
      name: "Dr. Steven Ross",
      email: "manish.gupta@telecare.dev",
      specialization: "homeopathy",
      experienceYears: 15,
      bio: "Homeopathy practitioner with interest in allergy and respiratory conditions.",
      consultationFee: 60,
      city: "Houston",
      state: "Texas",
      availability: availability("11:00", "17:00", [2, 4, 6]),
    },
    {
      name: "Dr. Rebecca Hayes",
      email: "leena.das@telecare.dev",
      specialization: "dentist",
      experienceYears: 4,
      bio: "Dentist focused on preventive dentistry, restorations, and tele-dentistry triage.",
      consultationFee: 90,
      city: "Phoenix",
      state: "Arizona",
      availability: availability("10:00", "15:00", [1, 3, 5]),
    },
    {
      name: "Dr. Rachel Price",
      email: "arpita.banerjee@telecare.dev",
      specialization: "ophthalmologist",
      experienceYears: 8,
      bio: "Ophthalmologist treating refractive errors, cataracts (offline), and digital eye strain.",
      consultationFee: 120,
      city: "Philadelphia",
      state: "Pennsylvania",
      availability: availability("12:00", "18:00", [2, 4, 6]),
    },
    {
      name: "Dr. Mark Phillips",
      email: "suresh.reddy@telecare.dev",
      specialization: "urologist",
      experienceYears: 10,
      bio: "Urologist dealing with kidney stones, prostate issues, and urinary infections.",
      consultationFee: 170,
      city: "San Antonio",
      state: "Texas",
      availability: availability("09:00", "13:00", [1, 3, 5]),
    },
    {
      name: "Dr. Ashley Bennett",
      email: "nisha.kulshreshtha@telecare.dev",
      specialization: "radiologist",
      experienceYears: 9,
      bio: "Radiologist offering tele-reporting and second-opinion reads on imaging.",
      consultationFee: 190,
      city: "San Diego",
      state: "California",
      availability: availability("14:00", "19:00", [1, 2, 4]),
    },
    {
      name: "Dr. Sydney Clark",
      email: "farah.siddiqui@telecare.dev",
      specialization: "critical_care_specialist",
      experienceYears: 11,
      bio: "Critical care specialist supporting ICU follow-up consults and discharge planning.",
      consultationFee: 210,
      city: "Dallas",
      state: "Texas",
      availability: availability("16:00", "21:00", [2, 3, 5]),
    },
    {
      name: "Dr. Tyler James",
      email: "rajeev.kumar@telecare.dev",
      specialization: "general_physician",
      experienceYears: 3,
      bio: "General physician early in career, keen on telemedicine and digital triage.",
      consultationFee: 40,
      city: "San Jose",
      state: "California",
      availability: availability("10:00", "16:00", [1, 2, 3, 4, 5]),
    },
    {
      name: "Dr. Brooke Allen",
      email: "shalini.sinha@telecare.dev",
      specialization: "internal_medicine",
      experienceYears: 7,
      bio: "Internal medicine specialist for complex multi-system diseases.",
      consultationFee: 150,
      city: "New York",
      state: "New York",
      availability: availability("09:00", "13:00", [1, 3, 5]),
    },
    {
      name: "Dr. Logan Harris",
      email: "ajay.yadav@telecare.dev",
      specialization: "nephrologist",
      experienceYears: 10,
      bio: "Nephrologist working with CKD and dialysis follow-ups through teleconsults.",
      consultationFee: 180,
      city: "Los Angeles",
      state: "California",
      availability: availability("11:00", "17:00", [2, 4]),
    },
    {
      name: "Dr. El Green",
      email: "el.green@telecare.dev",
      specialization: "oncologist",
      experienceYears: 12,
      bio: "Oncologist providing second opinions and survivorship care.",
      consultationFee: 220,
      city: "Chicago",
      state: "Illinois",
      availability: availability("15:00", "20:00", [1, 3]),
    },
  ];

  const doctors: { user: any; profile: any }[] = [];

  for (const d of doctorSeeds) {
    const pw = await hash("Demo@1234");

    const user = await prisma.user.upsert({
      where: { email: d.email },
      update: {},
      create: {
        name: d.name,
        email: d.email,
        passwordHash: pw,
        role: Role.DOCTOR,
        emailVerified: true,
        doctorProfile: {
          create: {
            specialization: d.specialization,
            experienceYears: d.experienceYears,
            bio: d.bio,
            consultationFee: d.consultationFee,
            city: d.city ?? null,
            state: d.state ?? null,
            verified: true,
            isActive: true,
          },
        },
      },
      include: { doctorProfile: true },
    });

    const profile = user.doctorProfile!;

    // Create availability rows only if none exist yet
    const existingAvail = await prisma.doctorAvailability.count({
      where: { doctorId: profile.id },
    });
    if (existingAvail === 0) {
      await prisma.doctorAvailability.createMany({
        data: d.availability.map((a) => ({ doctorId: profile.id, ...a })),
      });
    }

    doctors.push({ user, profile });
    console.log(`✅ Doctor: ${d.email}`);
  }

  // ─── PATIENTS ──────────────────────────────────────────────────────────────

  const patientSeeds = [
    {
      name: "John Doe",
      email: "john.doe@telecare.com",
      dob: new Date("1990-01-15"),
      gender: Gender.MALE,
      bloodGroup: "A+",
      phone: "+1 212-555-0101",
      city: "New York",
    },
    {
      name: "Aisha Khan",
      email: "aisha.khan@telecare.com",
      dob: new Date("1988-05-22"),
      gender: Gender.FEMALE,
      bloodGroup: "O+",
      phone: "+1 310-555-0102",
      city: "Los Angeles",
    },
    {
      name: "Robert Smith",
      email: "robert.smith@telecare.com",
      dob: new Date("1975-11-03"),
      gender: Gender.MALE,
      bloodGroup: "B+",
      phone: "+1 312-555-0103",
      city: "Chicago",
    },
    {
      name: "Mia Johnson",
      email: "priya.sharma@telecare.com",
      dob: new Date("1995-03-10"),
      gender: Gender.FEMALE,
      bloodGroup: "AB+",
      phone: "+1 713-555-0104",
      city: "Houston",
    },
    {
      name: "Noah Williams",
      email: "rahul.jain@telecare.com",
      dob: new Date("1992-07-21"),
      gender: Gender.MALE,
      bloodGroup: "O-",
      phone: "+1 602-555-0105",
      city: "Phoenix",
    },
    {
      name: "Ava Thompson",
      email: "sneha.patel@telecare.com",
      dob: new Date("1986-11-02"),
      gender: Gender.FEMALE,
      bloodGroup: "B+",
      phone: "+1 215-555-0106",
      city: "Philadelphia",
    },
    {
      name: "Liam Anderson",
      email: "aman.singh@telecare.com",
      dob: new Date("1983-09-15"),
      gender: Gender.MALE,
      bloodGroup: "A-",
      phone: "+1 210-555-0107",
      city: "San Antonio",
    },
    {
      name: "Farah Ali",
      email: "farah.ali@telecare.com",
      dob: new Date("1998-12-25"),
      gender: Gender.FEMALE,
      bloodGroup: "O+",
      phone: "+1 619-555-0108",
      city: "San Diego",
    },
    {
      name: "Ethan Martinez",
      email: "vikram.rao@telecare.com",
      dob: new Date("1970-04-18"),
      gender: Gender.MALE,
      bloodGroup: "B-",
      phone: "+1 214-555-0109",
      city: "Dallas",
    },
    {
      name: "Sophia Wilson",
      email: "neha.gupta@telecare.com",
      dob: new Date("1993-01-09"),
      gender: Gender.FEMALE,
      bloodGroup: "A+",
      phone: "+1 408-555-0110",
      city: "San Jose",
    },
    {
      name: "James Clark",
      email: "karan.arora@telecare.com",
      dob: new Date("1989-06-30"),
      gender: Gender.MALE,
      bloodGroup: "AB-",
      phone: "+1 347-555-0111",
      city: "New York",
    },
    {
      name: "Olivia Davis",
      email: "lata.iyer@telecare.com",
      dob: new Date("1965-02-14"),
      gender: Gender.FEMALE,
      bloodGroup: "O+",
      phone: "+1 323-555-0112",
      city: "Los Angeles",
    },
    {
      name: "Benjamin Lewis",
      email: "mohit.verma@telecare.com",
      dob: new Date("2001-10-05"),
      gender: Gender.MALE,
      bloodGroup: "A+",
      phone: "+1 773-555-0113",
      city: "Chicago",
    },
    {
      name: "Sara Thomas",
      email: "sara.thomas@telecare.com",
      dob: new Date("1999-08-12"),
      gender: Gender.FEMALE,
      bloodGroup: "B+",
      phone: "+1 832-555-0114",
      city: "Houston",
    },
    {
      name: "Henry Walker",
      email: "yusuf.khan@telecare.com",
      dob: new Date("1980-03-03"),
      gender: Gender.MALE,
      bloodGroup: "O+",
      phone: "+1 602-555-0115",
      city: "Phoenix",
    },
    {
      name: "Charlotte Moore",
      email: "anjali.mehta@telecare.com",
      dob: new Date("1997-05-27"),
      gender: Gender.FEMALE,
      bloodGroup: "AB+",
      phone: "+1 215-555-0116",
      city: "Philadelphia",
    },
    {
      name: "Daniel Young",
      email: "rohit.kulkarni@telecare.com",
      dob: new Date("1984-11-19"),
      gender: Gender.MALE,
      bloodGroup: "B+",
      phone: "+1 210-555-0117",
      city: "San Antonio",
    },
    {
      name: "Amelia Gonzalez",
      email: "divya.reddy@telecare.com",
      dob: new Date("1991-09-08"),
      gender: Gender.FEMALE,
      bloodGroup: "O-",
      phone: "+1 619-555-0118",
      city: "San Diego",
    },
    {
      name: "Logan Perez",
      email: "imran.shaikh@telecare.com",
      dob: new Date("1978-12-02"),
      gender: Gender.MALE,
      bloodGroup: "A+",
      phone: "+1 214-555-0119",
      city: "Dallas",
    },
    {
      name: "Harper Rivera",
      email: "pooja.nair@telecare.com",
      dob: new Date("1987-04-28"),
      gender: Gender.FEMALE,
      bloodGroup: "B-",
      phone: "+1 408-555-0120",
      city: "San Jose",
    },
    {
      name: "Mason King",
      email: "gaurav.mishra@telecare.com",
      dob: new Date("1994-02-16"),
      gender: Gender.MALE,
      bloodGroup: "AB+",
      phone: "+1 212-555-0121",
      city: "New York",
    },
    {
      name: "Ella Scott",
      email: "riya.chawla@telecare.com",
      dob: new Date("2000-07-13"),
      gender: Gender.FEMALE,
      bloodGroup: "O+",
      phone: "+1 310-555-0122",
      city: "Los Angeles",
    },
    {
      name: "Carter Green",
      email: "naveen.joshi@telecare.com",
      dob: new Date("1972-01-04"),
      gender: Gender.MALE,
      bloodGroup: "A-",
      phone: "+1 312-555-0123",
      city: "Chicago",
    },
    {
      name: "Abigail Baker",
      email: "shreya.banerjee@telecare.com",
      dob: new Date("1996-06-22"),
      gender: Gender.FEMALE,
      bloodGroup: "B+",
      phone: "+1 713-555-0124",
      city: "Houston",
    },
    {
      name: "Wyatt Hill",
      email: "aditya.rao@telecare.com",
      dob: new Date("1982-10-29"),
      gender: Gender.MALE,
      bloodGroup: "O+",
      phone: "+1 602-555-0125",
      city: "Phoenix",
    },
    {
      name: "Scarlett Adams",
      email: "kriti.jain@telecare.com",
      dob: new Date("1990-09-11"),
      gender: Gender.FEMALE,
      bloodGroup: "A+",
      phone: "+1 215-555-0126",
      city: "Philadelphia",
    },
    {
      name: "Hudson Rivera",
      email: "siddharth.malhotra@telecare.com",
      dob: new Date("1985-03-07"),
      gender: Gender.MALE,
      bloodGroup: "B+",
      phone: "+1 210-555-0127",
      city: "San Antonio",
    },
    {
      name: "Lily Barnes",
      email: "anu.joseph@telecare.com",
      dob: new Date("1999-01-19"),
      gender: Gender.FEMALE,
      bloodGroup: "O+",
      phone: "+1 619-555-0128",
      city: "San Diego",
    },
    {
      name: "Jack Mitchell",
      email: "prateek.saxena@telecare.com",
      dob: new Date("1979-08-04"),
      gender: Gender.MALE,
      bloodGroup: "AB+",
      phone: "+1 214-555-0129",
      city: "Dallas",
    },
    {
      name: "Grace Ramirez",
      email: "zainab.hussain@telecare.com",
      dob: new Date("1992-12-30"),
      gender: Gender.FEMALE,
      bloodGroup: "A-",
      phone: "+1 408-555-0130",
      city: "San Jose",
    },
  ];

  const patients: { user: any; record: any }[] = [];

  for (const p of patientSeeds) {
    const pw = await hash("Demo@1234");

    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: {},
      create: {
        name: p.name,
        email: p.email,
        passwordHash: pw,
        role: Role.PATIENT,
        emailVerified: true,
        patient: {
          create: {
            dateOfBirth: p.dob,
            gender: p.gender,
            bloodGroup: p.bloodGroup,
            phone: p.phone,
            city: p.city,
          },
        },
      },
      include: { patient: true },
    });

    patients.push({ user, record: user.patient! });
    console.log(`✅ Patient:  ${p.email}`);
  }

  // Aliases for key doctors and a few special-case patients
  const [drSarah, drChen, drPriya, drWilson, drEmily] = doctors.map(
    (d) => d.profile,
  );
  const [john, aisha, robert, priyaSharma, rahulJain] = patients.map(
    (p) => p.record,
  );

  // ─── APPOINTMENTS ──────────────────────────────────────────────────────────
  // Wipe existing seed appointments/prescriptions so re-runs are clean.
  const seedPatientIds = patients.map((p) => p.record.id);
  await prisma.appointment.deleteMany({
    where: { patientId: { in: seedPatientIds } },
  });
  await prisma.prescription.deleteMany({
    where: { patientId: { in: seedPatientIds } },
  });

  const busyDoctorIds = [
    drSarah.id,
    drChen.id,
    drPriya.id,
    drWilson.id,
    drEmily.id,
  ];

  const apptData: {
    patientId: string;
    doctorId: string;
    scheduledAt: Date;
    status: AppointmentStatus;
    reason?: string;
  }[] = [];

  // John – mixed history with chronic follow-ups + live test appointment
  apptData.push(
    {
      patientId: john.id,
      doctorId: drSarah.id,
      scheduledAt: daysFromNow(
        0,
        new Date().getHours(),
        new Date().getMinutes() + 90,
      ),
      status: AppointmentStatus.CONFIRMED,
      reason: "General health check-up and blood pressure review",
    },
    {
      patientId: john.id,
      doctorId: drChen.id,
      scheduledAt: daysFromNow(1, 11, 0),
      status: AppointmentStatus.PENDING,
      reason: "Routine ECG follow-up",
    },
    {
      patientId: john.id,
      doctorId: drPriya.id,
      scheduledAt: daysFromNow(-3, 14, 0),
      status: AppointmentStatus.COMPLETED,
      reason: "Skin rash on forearm",
    },
    {
      patientId: john.id,
      doctorId: drSarah.id,
      scheduledAt: daysFromNow(-14, 10, 30),
      status: AppointmentStatus.COMPLETED,
      reason: "Flu symptoms and fever",
    },
    // Reschedule pattern: cancelled then new confirmed
    {
      patientId: john.id,
      doctorId: drChen.id,
      scheduledAt: daysFromNow(-1, 10, 0),
      status: AppointmentStatus.CANCELLED_BY_PATIENT,
      reason: "Follow-up for chest discomfort (cancelled)",
    },
    {
      patientId: john.id,
      doctorId: drChen.id,
      scheduledAt: daysFromNow(2, 10, 30),
      status: AppointmentStatus.CONFIRMED,
      reason: "Rescheduled follow-up for chest discomfort",
    },
  );

  // Aisha – paediatrics + neurology with cancellations and no-show
  apptData.push(
    {
      patientId: aisha.id,
      doctorId: drWilson.id,
      scheduledAt: daysFromNow(2, 9, 0),
      status: AppointmentStatus.PENDING,
      reason: "Child health consultation for son",
    },
    {
      patientId: aisha.id,
      doctorId: drPriya.id,
      scheduledAt: daysFromNow(5, 13, 0),
      status: AppointmentStatus.CONFIRMED,
      reason: "Annual skin check",
    },
    {
      patientId: aisha.id,
      doctorId: drEmily.id,
      scheduledAt: daysFromNow(-7, 15, 0),
      status: AppointmentStatus.COMPLETED,
      reason: "Recurring migraines, seeking long-term treatment plan",
    },
    {
      patientId: aisha.id,
      doctorId: drChen.id,
      scheduledAt: daysFromNow(-10, 10, 0),
      status: AppointmentStatus.CANCELLED_BY_PATIENT,
      reason: "Heart palpitations check",
    },
    {
      patientId: aisha.id,
      doctorId: drEmily.id,
      scheduledAt: daysFromNow(-2, 18, 0),
      status: AppointmentStatus.NO_SHOW,
      reason: "Missed follow-up migraine consultation",
    },
  );

  // Robert – chronic multi-specialist history
  apptData.push(
    {
      patientId: robert.id,
      doctorId: drSarah.id,
      scheduledAt: daysFromNow(0, new Date().getHours() + 2, 0),
      status: AppointmentStatus.CONFIRMED,
      reason: "Diabetes management and medication review",
    },
    {
      patientId: robert.id,
      doctorId: drEmily.id,
      scheduledAt: daysFromNow(3, 16, 0),
      status: AppointmentStatus.PENDING,
      reason: "Persistent headaches after work",
    },
    {
      patientId: robert.id,
      doctorId: drChen.id,
      scheduledAt: daysFromNow(-30, 11, 0),
      status: AppointmentStatus.COMPLETED,
      reason: "Chest tightness during exercise",
    },
    {
      patientId: robert.id,
      doctorId: drPriya.id,
      scheduledAt: daysFromNow(-5, 12, 0),
      status: AppointmentStatus.CANCELLED_BY_DOCTOR,
      reason: "Psoriasis consultation",
    },
    {
      patientId: robert.id,
      doctorId: drSarah.id,
      scheduledAt: daysFromNow(-20, 10, 0),
      status: AppointmentStatus.COMPLETED,
      reason: "Long-term diabetes follow-up and HbA1c review",
    },
  );

  // Priya Sharma – only cancelled appointments
  apptData.push(
    {
      patientId: priyaSharma.id,
      doctorId: drPriya.id,
      scheduledAt: daysFromNow(-4, 11, 0),
      status: AppointmentStatus.CANCELLED_BY_PATIENT,
      reason: "Dermatology consult (cancelled)",
    },
    {
      patientId: priyaSharma.id,
      doctorId: drChen.id,
      scheduledAt: daysFromNow(-1, 15, 0),
      status: AppointmentStatus.CANCELLED_BY_DOCTOR,
      reason: "Chest pain evaluation (doctor unavailable)",
    },
  );

  // Rahul Jain – only upcoming appointments
  apptData.push(
    {
      patientId: rahulJain.id,
      doctorId: drSarah.id,
      scheduledAt: daysFromNow(3, 9, 30),
      status: AppointmentStatus.CONFIRMED,
      reason: "Annual health check-up",
    },
    {
      patientId: rahulJain.id,
      doctorId: drChen.id,
      scheduledAt: daysFromNow(10, 11, 0),
      status: AppointmentStatus.PENDING,
      reason: "Preventive cardiology baseline assessment",
    },
  );

  // Remaining patients: clustered appointments across busy and moderate doctors
  const remainingPatients = patients.slice(5); // skip first five handled above
  const otherDoctorIds = doctors
    .map((d) => d.profile.id)
    .filter((id) => !busyDoctorIds.includes(id));

  remainingPatients.forEach((p, idx) => {
    const patient = p.record;
    const baseDayOffset = (idx % 6) - 3; // spread across a +/-3 day window

    // Completed appointment with a busy doctor
    apptData.push({
      patientId: patient.id,
      doctorId: busyDoctorIds[idx % busyDoctorIds.length],
      scheduledAt: daysFromNow(baseDayOffset, 10 + (idx % 5), 0),
      status: AppointmentStatus.COMPLETED,
      reason: "Follow-up consultation for chronic condition",
    });

    // Upcoming appointment with a moderate/low doctor
    apptData.push({
      patientId: patient.id,
      doctorId: otherDoctorIds[idx % otherDoctorIds.length],
      scheduledAt: daysFromNow(5 + (idx % 7), 9 + (idx % 4), 30),
      status: AppointmentStatus.CONFIRMED,
      reason: "Planned follow-up visit",
    });

    // Occasionally add a cancelled or no-show
    if (idx % 3 === 0) {
      apptData.push({
        patientId: patient.id,
        doctorId: busyDoctorIds[(idx + 1) % busyDoctorIds.length],
        scheduledAt: daysFromNow(-7, 12, 0),
        status:
          idx % 2 === 0
            ? AppointmentStatus.CANCELLED_BY_PATIENT
            : AppointmentStatus.NO_SHOW,
        reason: "Missed or cancelled appointment for routine review",
      });
    }
  });

  const appointments = await prisma.appointment.createMany({ data: apptData });
  console.log(`\n✅ Created ${appointments.count} appointments`);

  // ─── PRESCRIPTIONS & REPORT FILES FOR COMPLETED APPOINTMENTS ───────────────

  const completedAppts = await prisma.appointment.findMany({
    where: {
      patientId: { in: seedPatientIds },
      status: AppointmentStatus.COMPLETED,
    },
    select: { id: true, doctorId: true, patientId: true, scheduledAt: true },
  });

  for (const appt of completedAppts.slice(0, 20)) {
    const prescription = await prisma.prescription.create({
      data: {
        doctorId: appt.doctorId,
        patientId: appt.patientId,
        appointmentId: appt.id,
        notes:
          "Follow the prescribed medication and lifestyle recommendations. Seek immediate help if symptoms worsen.",
        items: {
          create: [
            {
              drugName: "Tab. Metformin 500mg",
              dosage: "500 mg",
              frequency: "Twice daily",
              duration: "30 days",
              instructions: "Take after meals.",
            },
            {
              drugName: "Tab. Vitamin D3 60,000 IU",
              dosage: "One tablet",
              frequency: "Once weekly",
              duration: "8 weeks",
              instructions: "Take with a fatty meal.",
            },
          ],
        },
      },
    });

    const patientUser = await prisma.patient.findUnique({
      where: { id: appt.patientId },
      select: { userId: true },
    });
    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { id: appt.doctorId },
      select: { userId: true },
    });
    if (!patientUser || !doctorProfile) continue;

    await prisma.file.createMany({
      data: [
        {
          ownerId: patientUser.userId,
          appointmentId: appt.id,
          uploadedById: doctorProfile.userId,
          type: "REPORT",
          storageKey: `reports/${appt.patientId}/${appt.id}/lab-cbc-${appt.scheduledAt.toISOString().slice(0, 10)}.pdf`,
          originalName: "Complete Blood Count.pdf",
          mimeType: "application/pdf",
          sizeBytes: BigInt(120_000),
        },
        {
          ownerId: patientUser.userId,
          appointmentId: appt.id,
          uploadedById: doctorProfile.userId,
          type: "IMAGE",
          storageKey: `images/${appt.patientId}/${appt.id}/scan-${appt.scheduledAt.toISOString().slice(0, 10)}.png`,
          originalName: "Scan Image.png",
          mimeType: "image/png",
          sizeBytes: BigInt(450_000),
        },
      ],
    });
  }

  // ─── SUMMARY ───────────────────────────────────────────────────────────────

  // Fetch the live-test appointment for the URL
  const liveAppt = await prisma.appointment.findFirst({
    where: {
      patientId: john.id,
      doctorId: drSarah.id,
      status: AppointmentStatus.CONFIRMED,
    },
    orderBy: { scheduledAt: "asc" },
  });

  console.log("\n" + "═".repeat(60));
  console.log("  DEMO CREDENTIALS  (password same for all: Demo@1234)");
  console.log("═".repeat(60));
  console.log(`\n  DOCTORS (total: ${doctorSeeds.length})`);
  console.log("  ─────────────────────────────────────────────────────");
  for (const d of doctorSeeds.slice(0, 10)) {
    console.log(`  ${d.name.padEnd(25)} ${d.email}`);
  }
  if (doctorSeeds.length > 10) {
    console.log(`  ...and ${doctorSeeds.length - 10} more doctors`);
  }
  console.log(`\n  PATIENTS (total: ${patientSeeds.length})`);
  console.log("  ─────────────────────────────────────────────────────");
  for (const p of patientSeeds.slice(0, 10)) {
    console.log(`  ${p.name.padEnd(25)} ${p.email}`);
  }
  if (patientSeeds.length > 10) {
    console.log(`  ...and ${patientSeeds.length - 10} more patients`);
  }
  console.log("\n  All passwords:  Demo@1234");
  console.log("\n" + "─".repeat(60));
  console.log("  LIVE VIDEO TEST  (appointment in ~90 minutes)");
  console.log("─".repeat(60));
  if (liveAppt) {
    console.log(`  Appointment ID : ${liveAppt.id}`);
    console.log(
      `  Scheduled at   : ${liveAppt.scheduledAt.toLocaleTimeString()}`,
    );
    console.log(`  Patient login  : john.doe@telecare.com`);
    console.log(`  Doctor login   : sarah.johnson@telecare.dev`);
    console.log(
      `  Patient URL    : http://localhost:3000/patient/consultation/${liveAppt.id}`,
    );
    console.log(
      `  Doctor URL     : http://localhost:3000/doctor/consultation/${liveAppt.id}`,
    );
  }
  console.log("═".repeat(60) + "\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
