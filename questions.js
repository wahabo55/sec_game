// Quiz questions data
export const questions = [
  {
    id: 1,
    difficulty: "easy",
    question: "ما هي الركائز الثلاثة لأمن المعلومات؟",
    choices: [
      "التشفير، النسخ الاحتياطي، التحقق الثنائي",
      "السرية، التكامل، التوافر",
      "السرعة، السعة، القوة",
      "الحماية، النسخ، الإدارة"
    ],
    answer: "السرية، التكامل، التوافر",
    points: 100,
    timeLimit: 15
  },
  {
    id: 2,
    difficulty: "easy",
    question: "ما هو الهدف الأساسي من أمن المعلومات؟",
    choices: [
      "تسريع الأجهزة",
      "تحسين الإنترنت",
      "حماية البيانات من الوصول غير المصرح به",
      "زيادة حجم التخزين"
    ],
    answer: "حماية البيانات من الوصول غير المصرح به",
    points: 100,
    timeLimit: 15
  },
  {
    id: 3,
    difficulty: "medium",
    question: "ما هو التصيد الاحتيالي (Phishing)؟",
    choices: [
      "هجوم لتشفير البيانات وطلب فدية",
      "خداع المستخدمين للكشف عن معلومات حساسة",
      "تشفير البيانات للحماية",
      "تنزيل تطبيقات ضارة تلقائيًا"
    ],
    answer: "خداع المستخدمين للكشف عن معلومات حساسة",
    points: 150,
    timeLimit: 20
  },
  {
    id: 4,
    difficulty: "medium",
    question: "أي مما يلي يعتبر تهديداً شائعاً لأمن المعلومات؟",
    choices: [
      "استخدام الطابعة",
      "حذف البريد الإلكتروني",
      "البرمجيات الخبيثة",
      "تشغيل جدار الحماية"
    ],
    answer: "البرمجيات الخبيثة",
    points: 150,
    timeLimit: 20
  },
  {
    id: 5,
    difficulty: "hard",
    question: "ما هي الطريقة التي يعتمد فيها المهاجم على التلاعب النفسي؟",
    choices: [
      "الهندسة الاجتماعية",
      "التشفير",
      "التنصت على الشبكة",
      "التحقق بخطوتين"
    ],
    answer: "الهندسة الاجتماعية",
    points: 200,
    timeLimit: 25
  },
  {
    id: 6,
    difficulty: "hard",
    question: "ما هي فائدة برنامج مكافحة الفيروسات؟",
    choices: [
      "زيادة سرعة الإنترنت",
      "تشغيل البرامج تلقائيًا",
      "فحص وإزالة البرامج الضارة",
      "تحميل التطبيقات من الإنترنت"
    ],
    answer: "فحص وإزالة البرامج الضارة",
    points: 200,
    timeLimit: 25
  },
  {
    id: 7,
    difficulty: "easy",
    question: "ما هو دور جدار الحماية (Firewall)؟",
    choices: [
      "إرسال الرسائل النصية",
      "تشغيل البرامج تلقائيًا",
      "منع الوصول غير المصرح به",
      "زيادة سرعة المعالج"
    ],
    answer: "منع الوصول غير المصرح به",
    points: 100,
    timeLimit: 15
  },
  {
    id: 8,
    difficulty: "medium",
    question: "متى يجب تحديث برامج الأمان؟",
    choices: [
      "كل خمس سنوات",
      "عند حدوث عطل فقط",
      "بشكل منتظم",
      "بعد كل عملية تسجيل دخول"
    ],
    answer: "بشكل منتظم",
    points: 150,
    timeLimit: 20
  },
  {
    id: 9,
    difficulty: "hard",
    question: "أي من التالي يعتبر وسيلة لحماية البيانات المتحركة؟",
    choices: [
      "ترك الهاتف بدون قفل",
      "استخدام كلمات مرور ضعيفة",
      "تطبيق سياسات أمنية للأجهزة المحمولة",
      "إلغاء التحديثات الأمنية"
    ],
    answer: "تطبيق سياسات أمنية للأجهزة المحمولة",
    points: 200,
    timeLimit: 25
  },
  {
    id: 10,
    difficulty: "hard",
    question: "ما هي الخطوة الأولى في إدارة المخاطر؟",
    choices: [
      "المعالجة",
      "المراقبة والتقييم",
      "تحديد المخاطر",
      "تحديث البرامج"
    ],
    answer: "تحديد المخاطر",
    points: 200,
    timeLimit: 25
  }
];

// Helper functions
export function getQuestionById(id) {
  return questions.find(q => q.id === id);
}

export function getQuestionsByDifficulty(difficulty) {
  return questions.filter(q => q.difficulty === difficulty);
}

export function getTotalQuestions() {
  return questions.length;
}

export function shuffleQuestions() {
  const shuffled = [...questions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
