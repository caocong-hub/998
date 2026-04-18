import { PrismaClient, QuestionType, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_USER_ID = "demo-user-998";
const DEMO_COURSE_ID = "demo-course-998";
const DEMO_CHAPTER_1_ID = "demo-chapter-998-1";
const DEMO_CHAPTER_2_ID = "demo-chapter-998-2";
const DEMO_QUIZ_ID = "demo-quiz-998-1";
const DEMO_CATEGORY_NAME = "Group998 Demo Category";

const SAMPLE_VIDEO_URL =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

async function main() {
  // Avoid prisma.upsert on MongoDB (may require replica-set transactions).
  // Use flat creates (no nested relation writes) for the same reason.

  const existingUser = await prisma.user.findUnique({
    where: { id: DEMO_USER_ID },
  });
  const userPayload = {
    email: "998@example.com",
    name: "Account 998",
    rollNo: "998",
    role: UserRole.TEACHER,
    emailVerified: new Date(),
  };
  if (existingUser) {
    await prisma.user.update({
      where: { id: DEMO_USER_ID },
      data: userPayload,
    });
  } else {
    await prisma.user.create({
      data: { id: DEMO_USER_ID, ...userPayload },
    });
  }

  const existingTeacher = await prisma.teacher.findUnique({
    where: { email: "998@example.com" },
  });
  if (!existingTeacher) {
    await prisma.teacher.create({ data: { email: "998@example.com" } });
  }

  let category = await prisma.category.findUnique({
    where: { name: DEMO_CATEGORY_NAME },
  });
  if (!category) {
    category = await prisma.category.create({
      data: { name: DEMO_CATEGORY_NAME },
    });
  }

  await prisma.course.deleteMany({ where: { id: DEMO_COURSE_ID } });

  await prisma.course.create({
    data: {
      id: DEMO_COURSE_ID,
      userId: DEMO_USER_ID,
      title: "Group998 Demo: Introduction to Intelligent Tutoring",
      description:
        "Demo course with two chapters and a chapter quiz. Sign in with the demo account to browse, unlock video, and take the quiz.",
      isPublished: true,
      categoryId: category.id,
    },
  });

  await prisma.chapter.create({
    data: {
      id: DEMO_CHAPTER_1_ID,
      courseId: DEMO_COURSE_ID,
      title: "Chapter 1 — Orientation and motivation",
      description: "What adaptive learning systems are and how this demo is structured.",
      position: 0,
      isPublished: true,
      isFree: true,
      videoUrl: SAMPLE_VIDEO_URL,
    },
  });

  await prisma.chapter.create({
    data: {
      id: DEMO_CHAPTER_2_ID,
      courseId: DEMO_COURSE_ID,
      title: "Chapter 2 — Learning pathways and quiz",
      description: "Reinforce core ideas with a short quiz.",
      position: 1,
      isPublished: true,
      isFree: true,
      videoUrl: SAMPLE_VIDEO_URL,
    },
  });

  await prisma.quiz.create({
    data: {
      id: DEMO_QUIZ_ID,
      chapterId: DEMO_CHAPTER_2_ID,
      title: "Chapter check-in",
      description: "Multiple-choice questions on key concepts from this chapter.",
      timeline: 30,
      isPublished: true,
      position: 0,
    },
  });

  await prisma.question.create({
    data: {
      quizId: DEMO_QUIZ_ID,
      text: "One core goal of an adaptive tutoring system is to:",
      type: QuestionType.MCQ,
      option1: "Keep every learner on the same fixed pace",
      option2: "Adjust content and pace based on the learner's state",
      option3: "Remove the instructor entirely",
      option4: "Only play pre-recorded video",
      answer: "Adjust content and pace based on the learner's state",
    },
  });

  await prisma.question.create({
    data: {
      quizId: DEMO_QUIZ_ID,
      text: "Which of the following is least likely to appear in a typical learner profile?",
      type: QuestionType.MCQ,
      option1: "Estimated mastery of skills",
      option2: "Engagement and behavior signals",
      option3: "The server's CPU model name",
      option4: "Common mistakes and weak areas",
      answer: "The server's CPU model name",
    },
  });

  const existingPurchase = await prisma.purchase.findUnique({
    where: {
      userId_courseId: {
        userId: DEMO_USER_ID,
        courseId: DEMO_COURSE_ID,
      },
    },
  });
  if (!existingPurchase) {
    await prisma.purchase.create({
      data: {
        userId: DEMO_USER_ID,
        courseId: DEMO_COURSE_ID,
      },
    });
  }

  console.log("Demo seed OK: user", DEMO_USER_ID, "course", DEMO_COURSE_ID);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
