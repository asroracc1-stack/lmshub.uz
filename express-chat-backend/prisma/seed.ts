import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding started...");

  // Clean DB
  await prisma.message.deleteMany({});
  await prisma.conversationParticipant.deleteMany({});
  await prisma.conversation.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.group.deleteMany({});
  await prisma.organization.deleteMany({});

  // 1. Create Organizations
  const orgA = await prisma.organization.create({
    data: { name: "LMS Academy (Org A)" },
  });

  const orgB = await prisma.organization.create({
    data: { name: "Science School (Org B)" },
  });

  // 2. Create SuperAdmin
  const superAdmin = await prisma.user.create({
    data: {
      fullName: "Davron SuperAdmin",
      email: "superadmin@lms.uz",
      role: "SUPER_ADMIN",
    },
  });

  // 3. Create Admin A
  const adminA = await prisma.user.create({
    data: {
      fullName: "Alisher Admin A",
      email: "admina@lms.uz",
      role: "ADMIN",
      organizationId: orgA.id,
    },
  });

  // 4. Create Teacher A
  const teacherA = await prisma.user.create({
    data: {
      fullName: "Nodir Teacher A",
      email: "teachera@lms.uz",
      role: "TEACHER",
      organizationId: orgA.id,
    },
  });

  // 5. Create Group A
  const groupA = await prisma.group.create({
    data: {
      name: "Math-101",
      organizationId: orgA.id,
      teacherId: teacherA.id,
    },
  });

  // 6. Create Students A and Parents A
  const studentA1 = await prisma.user.create({
    data: {
      fullName: "Sardor Student A1",
      email: "studenta1@lms.uz",
      role: "STUDENT",
      organizationId: orgA.id,
      groupId: groupA.id,
    },
  });

  const parentA1 = await prisma.user.create({
    data: {
      fullName: "Sardor's Parent (Parent A1)",
      email: "parenta1@lms.uz",
      role: "PARENT",
      organizationId: orgA.id,
    },
  });

  // Connect parent to student
  await prisma.user.update({
    where: { id: studentA1.id },
    data: { parentId: parentA1.id },
  });

  const studentA2 = await prisma.user.create({
    data: {
      fullName: "Javohir Student A2",
      email: "studenta2@lms.uz",
      role: "STUDENT",
      organizationId: orgA.id,
      groupId: groupA.id,
    },
  });

  const parentA2 = await prisma.user.create({
    data: {
      fullName: "Javohir's Parent (Parent A2)",
      email: "parenta2@lms.uz",
      role: "PARENT",
      organizationId: orgA.id,
    },
  });

  await prisma.user.update({
    where: { id: studentA2.id },
    data: { parentId: parentA2.id },
  });

  // --- ORG B SEEDING ---

  // 7. Create Admin B
  const adminB = await prisma.user.create({
    data: {
      fullName: "Bekzod Admin B",
      email: "adminb@lms.uz",
      role: "ADMIN",
      organizationId: orgB.id,
    },
  });

  // 8. Create Teacher B
  const teacherB = await prisma.user.create({
    data: {
      fullName: "Malika Teacher B",
      email: "teacherb@lms.uz",
      role: "TEACHER",
      organizationId: orgB.id,
    },
  });

  // 9. Create Group B
  const groupB = await prisma.group.create({
    data: {
      name: "Physics-201",
      organizationId: orgB.id,
      teacherId: teacherB.id,
    },
  });

  // 10. Create Students B and Parents B
  const studentB1 = await prisma.user.create({
    data: {
      fullName: "Olim Student B1",
      email: "studentb1@lms.uz",
      role: "STUDENT",
      organizationId: orgB.id,
      groupId: groupB.id,
    },
  });

  const parentB1 = await prisma.user.create({
    data: {
      fullName: "Olim's Parent (Parent B1)",
      email: "parentb1@lms.uz",
      role: "PARENT",
      organizationId: orgB.id,
    },
  });

  await prisma.user.update({
    where: { id: studentB1.id },
    data: { parentId: parentB1.id },
  });

  const studentB2 = await prisma.user.create({
    data: {
      fullName: "Shirin Student B2",
      email: "studentb2@lms.uz",
      role: "STUDENT",
      organizationId: orgB.id,
      groupId: groupB.id,
    },
  });

  const parentB2 = await prisma.user.create({
    data: {
      fullName: "Shirin's Parent (Parent B2)",
      email: "parentb2@lms.uz",
      role: "PARENT",
      organizationId: orgB.id,
    },
  });

  await prisma.user.update({
    where: { id: studentB2.id },
    data: { parentId: parentB2.id },
  });

  console.log("Seeding complete!");
  console.log("Sample Users created:");
  console.log(`- SuperAdmin: superadmin@lms.uz (${superAdmin.id})`);
  console.log(`- Admin A: admina@lms.uz (${adminA.id})`);
  console.log(`- Teacher A: teachera@lms.uz (${teacherA.id})`);
  console.log(`- Student A1: studenta1@lms.uz (${studentA1.id})`);
  console.log(`- Parent A1: parenta1@lms.uz (${parentA1.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
