import i18n from "i18next";
import { initReactI18next } from "react-i18next";


const en = {
  // Common
  common: {
    signIn: "Sign In", signOut: "Logout", signingIn: "Signing in…", signUp: "Sign Up", save: "Save", cancel: "Cancel",
    delete: "Delete", edit: "Edit", search: "Search", loading: "Loading…", back: "Back", next: "Next",
    submit: "Submit", continue: "Continue", close: "Close", confirm: "Confirm", required: "Required",
    email: "Email", password: "Password", firstName: "First Name", lastName: "Last Name", phone: "Phone",
    jobTitle: "Job Title", companyEmail: "Company Email", startNow: "Start Now", language: "Language",
    yes: "Yes", no: "No", invalid: "Invalid", success: "Success", error: "Error",
  },
  // Nav
  nav: {
    dashboard: "Dashboard", overview: "Overview", analyze: "Analyze", newAnalysis: "New Analysis",
    reports: "Reports", myReports: "My Reports", marketAnalysis: "Market Analysis", compare: "Compare",
    topLists: "Top Lists", tracking: "Tracking", tracked: "Tracked", campaigns: "Campaigns",
    workspace: "Workspace", settings: "Settings", logout: "Logout", toggleTheme: "Toggle theme",
    openMenu: "Open menu", closeMenu: "Close menu", bookConsultation: "Book Consultation",
  },
  // Login
  login: {
    title: "Sign in to continue", emailLabel: "Email", passwordLabel: "Password",
    submit: "Sign In", invalid: "Invalid credentials",
  },
  // Signup
  signup: {
    title: "Create a new account",
    description: "Create your account to access the influencer analysis and selection tool for your brand.",
    firstNamePh: "First name", lastNamePh: "Last name", emailPh: "Professional email",
    passwordPh: "Password", passwordConfirmPh: "Confirm password", passwordMismatch: "Passwords do not match", submit: "Create account",
    invalidEmail: "Please enter a valid email", workEmail: "Please use your company email",
    fillAll: "Please fill all fields (password at least 6 characters)",
    forgot: "Forgot password?", haveAccount: "Already have an account?", signInLink: "Sign in",
  },
  // Landing
  landing: {
    heading: "Start analyzing the right influencer for your brand",
    description: "Enter your details to access Boom Spark and start analyzing and selecting influencers based on data and metrics.",
    firstNamePh: "First name", lastNamePh: "Last name", emailPh: "Company email",
    phonePh: "Phone number", jobTitlePh: "Job title", submit: "Start Now",
    fillAll: "Please fill all fields", saveError: "An error occurred, please try again",
    haveAccount: "Already have an account?", signInLink: "Sign in",
  },
  // Forgot password
  forgot: {
    title: "Reset password",
    description: "Enter your email and we'll send you a reset link.",
    emailPh: "Email", submit: "Send link",
    sent: "A reset link has been sent to your email",
    backToLogin: "Back to login",
  },
  verify: {
    title: "Verify your email",
    description: "Enter the 6-digit code we sent to your email to activate your account.",
    codePh: "6-digit code",
    submit: "Verify",
    resend: "Resend code",
    resent: "A new code has been sent",
    sentToast: "Verification code sent to your email",
    success: "Account activated",
    enterCode: "Please enter the verification code",
    emailRequired: "Email is required",
  },
  reset: {
    title: "Set a new password",
    description: "Enter your new password below.",
    newPh: "New password",
    confirmPh: "Confirm password",
    submit: "Update password",
    success: "Password updated. Please sign in.",
    tooShort: "Password must be at least 6 characters",
    mismatch: "Passwords do not match",
    waiting: "Verifying reset link…",
  },
  // Welcome modal
  welcome: {
    title: "Welcome to Boom Spark",
    description: "The world of data and analytics, not just follower count. The tool that helps you choose the best influencers for your brand based on data.",
    startNow: "Start Now", closingIn: "Closing in {{n}} seconds",
    backTitle: "Welcome back!",
    backDescription: "Ready to discover new influencers and analyze their performance?",
    letsGo: "Let's go",
  },
  // Attempts modal
  attempts: {
    title: "You've used all your free analyses",
    subtitle: "Get a free consultation and we'll help you:",
    item1: "Identify the best-fit influencers for your brand",
    item2: "Build a custom influencer campaign strategy",
    item3: "Review your audience and influencer match",
    item4: "Receive data-driven recommendations to improve results",
    cta: "Book Free Consultation",
    waMessage: "I used Boom Spark and wanted to reach out to see how you can help me choose influencers for my campaign.",
    waGreeting: "Hi, I'm Baraq. If you need any help, message me!",
  },
  // Dashboard
  dashboard: {
    title: "Dashboard", subtitle: "Overview of your influencer analytics",
    totalInfluencers: "Total Influencers", avgEngagement: "Avg Engagement", avgQuality: "Avg Audience Quality",
    analyzeNew: "Analyze New Influencer",
    analyzeBlurb: "Paste a profile URL to generate a deep analysis report with audience, growth, content, and brand insights.",
    startAnalysis: "Start Analysis", recent: "Recent Analyses", empty: "No analyses yet",
  },
  // Analyze
  analyze: {
    title: "Analyze Influencer", subtitle: "Paste an Instagram or TikTok profile URL",
    urlPlaceholder: "https://instagram.com/username", start: "Start Analysis", analyzing: "Analyzing…",
    apiConfig: "API Configuration", complete: "Analysis Complete", viewReport: "View Report",
    limit: "You've reached your analysis limit",
    pasteOne: "Paste at least one URL", selectIndustry: "Please select an Industry",
    targeting: "Campaign Targeting", industry: "Industry", selectIndustryPh: "Select industry…",
    subCategory: "Sub-Category", subCategoryPh: "e.g. Perfumes, Skincare, eSIM…",
    gender: "Gender", selectGenderPh: "Select gender…", cities: "Target Cities", citiesPh: "e.g. Riyadh, Jeddah, Dubai",
    countries: "Target Countries", ageRange: "Target Age Range", interests: "Target Interests",
    inProgress: "Analyzing…", autoOpen: "The report will open automatically when ready.",
    timer: "Timer", readyToView: "is ready to view.",
    debugLogs: "Debug Logs", copy: "Copy", noLogs: "No logs yet",
    freeTrial: "Free trial: {{used}} / {{limit}} analyses used",
    countdownTitle: "Analyzing the account…", countdownThanks: "Thank you for your patience 😊",
    remaining: "remaining", account: "account", accounts: "accounts", elapsed: "elapsed",
    apifyKeyLabel: "Apify API Key", geminiKeyLabel: "Gemini API Key", keysSaved: "Keys are saved automatically.",
    keysHint: "— Apify & Gemini keys",
  },
  // Reports list
  reports: {
    title: "Reports", searchPh: "Search by name or username…",
    name: "Name", platform: "Platform", followers: "Followers", er: "ER", score: "Score", date: "Date",
    empty: "No reports yet",
  },
  // Settings
  settings: {
    title: "Settings", subtitle: "API keys, AI providers & Apify tools",
    apiKeys: "API Keys", providers: "AI Providers", tools: "Apify Tools",
    teamName: "Team Name", save: "Save",
  },
  // Report tabs
  report: {
    overview: "Overview", audience: "Audience", engagement: "Engagement", growth: "Growth",
    content: "Content", reach: "Reach", brand: "Brand Fit", ai: "AI Insights",
    share: "Share Report", sharingOn: "Sharing On", exportExcel: "Export Excel", exportPdf: "Export PDF",
    partialDataOnly: "Partial data only",
    interactiveMapRequires: "Interactive map requires location data",
    historicalUnavailable: "Historical data unavailable",
    historicalRequiresMeta: "Historical data requires Meta Insights API",
    highAccuracy: "High accuracy data",
    goodData: "Good data",
    approximate: "Approximate data",
    estimateBenchmarks: "Estimate based on industry benchmarks",
    calculatedFromReal: "Calculated from real posts",
    noData: "No data available",
    adminOnly: "Admin Only",
    exportCsv: "Export CSV",
    dataIntelligence: "Data Intelligence Panel",
    estimateInstagram: "Estimate based on Instagram industry benchmarks",
    notFound: "Not found.",
    analyzedOn: "Analyzed on",
    sectionsHeader: "Sections",
    locked: "Locked",
    lockedTooltip: "Available in the paid version",
    pdfSuccess: "PDF generated successfully!",
    pdfFailed: "PDF failed",
    brandCompatTitle: "Brand Compatibility Score",
    brandCompatCta: "Add brand data for an accurate compatibility score",
    brandCompatAddData: "Add brand data",
    brandCompatLoading: "Calculating brand compatibility…",
    brandCompatError: "Couldn't calculate compatibility",
    retry: "Retry",
    whyLowMatch: "Why the match is weak",
    matchDetails: "Brand compatibility details",
    mainReasonLow: "Main reason for the low score",
    mainReasonMatch: "Top reason for the compatibility score",
    real: "Real",
    estimated: "Estimated",
    aiTag: "AI",
    fieldCol: "Field", valueCol: "Value", sourceCol: "Source", reliabilityCol: "Reliability",
    reachImpressionsEstimate: "Reach Rate and Impressions are estimates — accuracy requires Meta Insights API",
  },
  // Campaigns
  campaigns: {
    title: "Campaigns", create: "New Campaign", empty: "No campaigns yet",
    name: "Name", status: "Status", budget: "Budget", startDate: "Start Date", endDate: "End Date",
  },
  // Tracked
  tracked: {
    title: "Tracked Influencers", empty: "No tracked influencers yet",
  },
  // Top lists / Compare
  topLists: { title: "Top Lists", subtitle: "Top performing influencers by category" },
  compare: { title: "Compare Influencers", subtitle: "Compare metrics side by side" },
  share: {
    unavailableTitle: "Report Unavailable",
    unavailableBody: "This report is no longer available.",
    brandTitle: "BOOM teams — Influencer Intelligence",
    poweredBy: "Powered by Boom Teams",
    brandMentions: "Brand Mentions",
    footer: "Generated by Boom Teams · boom@team.com",
  },
};

const ar: typeof en = {
  common: {
    signIn: "تسجيل الدخول", signOut: "تسجيل الخروج", signingIn: "جاري الدخول…", signUp: "إنشاء حساب",
    save: "حفظ", cancel: "إلغاء", delete: "حذف", edit: "تعديل", search: "بحث", loading: "جاري التحميل…",
    back: "رجوع", next: "التالي", submit: "إرسال", continue: "متابعة", close: "إغلاق", confirm: "تأكيد",
    required: "مطلوب", email: "البريد الإلكتروني", password: "كلمة المرور", firstName: "الاسم الأول",
    lastName: "اسم العائلة", phone: "رقم الهاتف", jobTitle: "المسمى الوظيفي",
    companyEmail: "البريد الإلكتروني للشركة", startNow: "ابدأ الآن", language: "اللغة",
    yes: "نعم", no: "لا", invalid: "غير صالح", success: "نجح", error: "خطأ",
  },
  nav: {
    dashboard: "لوحة التحكم", overview: "نظرة عامة", analyze: "تحليل", newAnalysis: "تحليل جديد",
    reports: "التقارير", myReports: "تقاريري", marketAnalysis: "تحليل السوق", compare: "مقارنة",
    topLists: "القوائم الأعلى", tracking: "المتابعة", tracked: "المتابَعون", campaigns: "الحملات",
    workspace: "مساحة العمل", settings: "الإعدادات", logout: "تسجيل الخروج", toggleTheme: "تبديل المظهر",
    openMenu: "فتح القائمة", closeMenu: "إغلاق القائمة", bookConsultation: "حجز استشارة",
  },
  login: {
    title: "سجّل الدخول للمتابعة", emailLabel: "البريد الإلكتروني", passwordLabel: "كلمة المرور",
    submit: "تسجيل الدخول", invalid: "بيانات الدخول غير صحيحة",
  },
  signup: {
    title: "إنشاء حساب جديد",
    description: "أنشئ حسابك للوصول إلى أداة تحليل واختيار الإنفلونسرز المناسبة لعلامتك التجارية.",
    firstNamePh: "الاسم الأول", lastNamePh: "اسم العائلة", emailPh: "البريد الإلكتروني الاحترافي",
    passwordPh: "كلمة المرور", passwordConfirmPh: "تأكيد كلمة المرور", passwordMismatch: "كلمتا المرور غير متطابقتين", submit: "إنشاء حساب",
    invalidEmail: "يرجى إدخال بريد إلكتروني صالح", workEmail: "يرجى استخدام بريد إلكتروني شركتك",
    fillAll: "يرجى تعبئة جميع الحقول (كلمة المرور 6 أحرف على الأقل)",
    forgot: "نسيت كلمة المرور؟", haveAccount: "لديك حساب بالفعل؟", signInLink: "تسجيل الدخول",
  },
  landing: {
    heading: "ابدأ تحليل الإنفلونسر المناسب لعلامتك التجارية",
    description: "أدخل بياناتك للوصول إلى Boom Spark والبدء بتحليل واختيار الإنفلونسرز بناءً على البيانات والأرقام.",
    firstNamePh: "الاسم الأول", lastNamePh: "اسم العائلة", emailPh: "البريد الإلكتروني للشركة",
    phonePh: "رقم الهاتف", jobTitlePh: "المسمى الوظيفي", submit: "ابدأ الآن",
    fillAll: "يرجى تعبئة جميع الحقول", saveError: "حدث خطأ، حاول مرة أخرى",
    haveAccount: "لديك حساب بالفعل؟", signInLink: "تسجيل الدخول",
  },
  forgot: {
    title: "استعادة كلمة المرور",
    description: "أدخل بريدك الإلكتروني وسنرسل لك رابط استعادة كلمة المرور.",
    emailPh: "البريد الإلكتروني", submit: "إرسال الرابط",
    sent: "تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني",
    backToLogin: "العودة لتسجيل الدخول",
  },
  verify: {
    title: "تفعيل البريد الإلكتروني",
    description: "أدخل الرمز المكون من 6 أرقام المرسل إلى بريدك الإلكتروني لتفعيل حسابك.",
    codePh: "رمز التفعيل",
    submit: "تفعيل",
    resend: "إعادة إرسال الرمز",
    resent: "تم إرسال رمز جديد",
    sentToast: "تم إرسال رمز التفعيل إلى بريدك",
    success: "تم تفعيل الحساب بنجاح",
    enterCode: "يرجى إدخال رمز التفعيل",
    emailRequired: "البريد الإلكتروني مطلوب",
  },
  reset: {
    title: "تعيين كلمة مرور جديدة",
    description: "أدخل كلمة المرور الجديدة بالأسفل.",
    newPh: "كلمة المرور الجديدة",
    confirmPh: "تأكيد كلمة المرور",
    submit: "تحديث كلمة المرور",
    success: "تم تحديث كلمة المرور. يرجى تسجيل الدخول.",
    tooShort: "يجب أن تكون كلمة المرور 6 أحرف على الأقل",
    mismatch: "كلمتا المرور غير متطابقتين",
    waiting: "جارٍ التحقق من رابط الاستعادة…",
  },
  welcome: {
    title: "مرحباً بك في Boom Spark",
    description: "عالم البيانات والتحليل، ليس فقط عدد المتابعين. الأداة التي تساعدك في اختيار أفضل الإنفلونسرز لعلامتك التجارية بناءً على البيانات.",
    startNow: "ابدأ الآن", closingIn: "سيُغلق خلال {{n}} ثوان",
    backTitle: "أهلاً بعودتك!",
    backDescription: "جاهز لاكتشاف إنفلونسرز جديدة وتحليل أدائهم؟",
    letsGo: "لنبدأ",
  },
  attempts: {
    title: "لقد استنفدت جميع تحليلاتك المجانية",
    subtitle: "احصل على استشارة مجانية وسنساعدك في:",
    item1: "تحديد أنسب المؤثرين لعلامتك التجارية",
    item2: "بناء استراتيجية حملة مؤثرين مخصصة",
    item3: "مراجعة تطابق جمهورك مع المؤثرين",
    item4: "توصيات مبنية على البيانات لتحسين النتائج",
    cta: "احجز استشارة مجانية",
    waMessage: "استخدمت Boom Spark وحبييت اتواصل معكم و أشوف كيف ممكن تساعدوني في اختيار المؤثرين لحملتي.",
    waGreeting: "مرحبا، أنا برق. لو احتجت أي مساعدة كلمني!",
  },
  dashboard: {
    title: "لوحة التحكم", subtitle: "نظرة عامة على تحليلات الإنفلونسرز",
    totalInfluencers: "إجمالي الإنفلونسرز", avgEngagement: "متوسط التفاعل",
    avgQuality: "متوسط جودة الجمهور",
    analyzeNew: "تحليل إنفلونسر جديد",
    analyzeBlurb: "الصق رابط الحساب لإنشاء تقرير تحليل عميق يشمل الجمهور والنمو والمحتوى ومدى مناسبة العلامة التجارية.",
    startAnalysis: "بدء التحليل", recent: "التحليلات الأخيرة", empty: "لا توجد تحليلات بعد",
  },
  analyze: {
    title: "تحليل إنفلونسر", subtitle: "الصق رابط حساب Instagram أو TikTok",
    urlPlaceholder: "https://instagram.com/username", start: "بدء التحليل", analyzing: "جاري التحليل…",
    apiConfig: "إعدادات API", complete: "اكتمل التحليل", viewReport: "عرض التقرير",
    limit: "لقد وصلت إلى الحد الأقصى من التحليلات",
    pasteOne: "الصق رابطاً واحداً على الأقل", selectIndustry: "يرجى اختيار قطاع",
    targeting: "استهداف الحملة", industry: "القطاع", selectIndustryPh: "اختر القطاع…",
    subCategory: "تصنيف فرعي", subCategoryPh: "مثلاً: عطور، عناية بالبشرة، eSIM…",
    gender: "الجنس", selectGenderPh: "اختر الجنس…", cities: "المدن المستهدفة", citiesPh: "مثلاً: الرياض، جدة، دبي",
    countries: "الدول المستهدفة", ageRange: "الفئة العمرية المستهدفة", interests: "الاهتمامات المستهدفة",
    inProgress: "جاري التحليل…", autoOpen: "سيتم فتح التقرير فور انتهاء التحليل تلقائياً.",
    timer: "المؤقت", readyToView: "جاهز للعرض.",
    debugLogs: "سجلات التصحيح", copy: "نسخ", noLogs: "لا توجد سجلات بعد",
    freeTrial: "تجربة مجانية: استخدمت {{used}} من {{limit}} تحليلاً",
    countdownTitle: "جاري تحليل الحساب…", countdownThanks: "شكراً لكم على صبركم 😊",
    remaining: "متبقي", account: "حساب", accounts: "حسابات", elapsed: "مضى",
    apifyKeyLabel: "مفتاح Apify API", geminiKeyLabel: "مفتاح Gemini API", keysSaved: "يتم حفظ المفاتيح تلقائياً.",
    keysHint: "— مفاتيح Apify و Gemini",
  },
  reports: {
    title: "التقارير", searchPh: "بحث بالاسم أو اسم المستخدم…",
    name: "الاسم", platform: "المنصة", followers: "المتابعون", er: "التفاعل", score: "النتيجة", date: "التاريخ",
    empty: "لا توجد تقارير بعد",
  },
  settings: {
    title: "الإعدادات", subtitle: "مفاتيح API ومزودي الذكاء وأدوات Apify",
    apiKeys: "مفاتيح API", providers: "مزودو الذكاء", tools: "أدوات Apify",
    teamName: "اسم الفريق", save: "حفظ",
  },
  report: {
    overview: "نظرة عامة", audience: "الجمهور", engagement: "التفاعل", growth: "النمو",
    content: "المحتوى", reach: "الوصول", brand: "ملاءمة العلامة", ai: "رؤى الذكاء الاصطناعي",
    share: "مشاركة التقرير", sharingOn: "المشاركة مفعلة", exportExcel: "تصدير Excel", exportPdf: "تصدير PDF",
    partialDataOnly: "بيانات جزئية فقط",
    interactiveMapRequires: "الخريطة التفاعلية تتطلب بيانات الموقع",
    historicalUnavailable: "البيانات التاريخية غير متاحة",
    historicalRequiresMeta: "البيانات التاريخية تتطلب Meta Insights API",
    highAccuracy: "بيانات عالية الدقة",
    goodData: "بيانات جيدة",
    approximate: "بيانات تقريبية",
    estimateBenchmarks: "تقدير مبني على معدلات صناعية",
    calculatedFromReal: "محسوب من منشورات حقيقية",
    noData: "لا توجد بيانات متاحة",
    adminOnly: "للأدمن فقط",
    exportCsv: "تصدير CSV",
    dataIntelligence: "لوحة ذكاء البيانات",
    estimateInstagram: "تقدير مبني على معدلات Instagram الصناعية",
    notFound: "غير موجود.",
    analyzedOn: "تم التحليل في",
    sectionsHeader: "الأقسام",
    locked: "مقفل",
    lockedTooltip: "متاح في النسخة المدفوعة",
    pdfSuccess: "تم إنشاء ملف PDF بنجاح!",
    pdfFailed: "فشل إنشاء PDF",
    brandCompatTitle: "نتيجة توافق البراند",
    brandCompatCta: "أضف بيانات براندك للحصول على نتيجة توافق دقيقة",
    brandCompatAddData: "إضافة بيانات البراند",
    brandCompatLoading: "جاري حساب نتيجة التوافق مع البراند…",
    brandCompatError: "تعذر حساب نتيجة التوافق",
    retry: "إعادة المحاولة",
    whyLowMatch: "لماذا التوافق ضعيف",
    matchDetails: "تفاصيل التوافق مع البراند",
    mainReasonLow: "السبب الرئيسي لانخفاض النتيجة",
    mainReasonMatch: "أهم سبب لنتيجة التوافق",
    real: "حقيقي",
    estimated: "تقديري",
    aiTag: "ذكاء اصطناعي",
    fieldCol: "الحقل", valueCol: "القيمة", sourceCol: "المصدر", reliabilityCol: "الموثوقية",
    reachImpressionsEstimate: "Reach Rate و Impressions تقديرية — تتطلب Meta Insights API للدقة",
  },
  campaigns: {
    title: "الحملات", create: "حملة جديدة", empty: "لا توجد حملات بعد",
    name: "الاسم", status: "الحالة", budget: "الميزانية", startDate: "تاريخ البدء", endDate: "تاريخ الانتهاء",
  },
  tracked: {
    title: "الإنفلونسرز المتابَعون", empty: "لا يوجد إنفلونسرز متابَعون بعد",
  },
  topLists: { title: "القوائم الأعلى", subtitle: "أفضل الإنفلونسرز حسب الفئة" },
  compare: { title: "مقارنة الإنفلونسرز", subtitle: "قارن المقاييس جنباً إلى جنب" },
  share: {
    unavailableTitle: "التقرير غير متاح",
    unavailableBody: "هذا التقرير لم يعد متاحاً.",
    brandTitle: "BOOM teams — تحليلات المؤثرين",
    poweredBy: "مدعوم من Boom Teams",
    brandMentions: "ذكر العلامات التجارية",
    footer: "أُنتج بواسطة Boom Teams · boom@team.com",
  },
};

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources: { en: { translation: en }, ar: { translation: ar } },
      lng: "ar",
      fallbackLng: "ar",
      supportedLngs: ["ar", "en"],
      interpolation: { escapeValue: false },
    });
}

export function applyLangToDocument(lng: string) {
  if (typeof document === "undefined") return;
  const dir = lng === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = lng;
  document.documentElement.dir = dir;
}

// IMPORTANT: do NOT sync language from localStorage at module-load time.
// SSR always renders with default "ar"; swapping the language before
// hydration causes a React hydration mismatch. The actual sync runs in
// RootComponent's useEffect after hydration completes (see __root.tsx).
if (typeof window !== "undefined") {
  i18n.on("languageChanged", (lng) => {
    applyLangToDocument(lng);
    try { localStorage.setItem("boom_lang", lng); } catch {}
  });
}

export default i18n;
