/**
 * Multilingual strings dictionary for Swasthya Sense (Phase 7).
 * Supports English (en), Hindi (hi), and Assamese (as).
 * Note: Assamese strings are marked as machine-translated, pending clinical panel review.
 */

export type SupportedLanguage = 'en' | 'hi' | 'as';

export interface LocalizedStrings {
  appName: string;
  prototypeDisclaimer: string;
  roleSwitcherLabel: string;
  clinicalLaneTitle: string;
  clinicalLaneSubtitle: string;
  adminLaneTitle: string;
  adminLaneSubtitle: string;
  whyFlagged: string;
  clinicianGateMessage: string;
  consentTitle: string;
  consentDescription: string;
  consentGranted: string;
  consentRevoked: string;
  intakeUploadTitle: string;
  confirmValues: string;
  overdueBadge: string;
  inGraceBadge: string;
  urgentAlertBadge: string;
  subacuteAlertBadge: string;
  machineTranslatedNotice?: string;
}

export const LOCALES: Record<SupportedLanguage, LocalizedStrings> = {
  en: {
    appName: 'Swasthya Sense',
    prototypeDisclaimer: 'Prototype Decision Support Only. Not for primary clinical diagnosis.',
    roleSwitcherLabel: 'Active Role',
    clinicalLaneTitle: 'Clinical Priority Lane',
    clinicalLaneSubtitle: 'Immediate physiological and biomarker early warnings requiring clinician attention.',
    adminLaneTitle: 'Administrative Lane',
    adminLaneSubtitle: 'Scheduled check-ins, grace periods, and overdue follow-up management.',
    whyFlagged: 'Why was this flagged?',
    clinicianGateMessage: 'No care plan exists until a qualified clinician has signed off on this case assessment.',
    consentTitle: 'Patient Consent',
    consentDescription: 'Explicit consent required before recording measurements or sending follow-up reminders.',
    consentGranted: 'Consent Active',
    consentRevoked: 'Consent Revoked - Data Minimized',
    intakeUploadTitle: 'Upload Clinical Document',
    confirmValues: 'Confirm Extracted Values',
    overdueBadge: 'Overdue Follow-up',
    inGraceBadge: 'In Grace Period',
    urgentAlertBadge: 'Urgent Physiological Alert',
    subacuteAlertBadge: 'Sub-acute Flag',
  },
  hi: {
    appName: 'स्वास्थ्य सेंस (Swasthya Sense)',
    prototypeDisclaimer: 'प्रोटोटाइप निर्णय सहायता मात्र। प्राथमिक चिकित्सीय निदान के लिए नहीं।',
    roleSwitcherLabel: 'सक्रिय भूमिका',
    clinicalLaneTitle: 'चिकित्सीय प्राथमिकता लेन (Clinical Lane)',
    clinicalLaneSubtitle: 'तत्काल शारीरिक और बायोमार्कर चेतावनी संकेत जिनके लिए डॉक्टर की समीक्षा आवश्यक है।',
    adminLaneTitle: 'प्रशासनिक लेन (Administrative Lane)',
    adminLaneSubtitle: 'निर्धारित जांच, अनुग्रह अवधि और विलंबित फॉलो-अप प्रबंधन।',
    whyFlagged: 'इसे क्यों चिह्नित किया गया?',
    clinicianGateMessage: 'जब तक कोई योग्य चिकित्सक मामले के आकलन पर हस्ताक्षर नहीं करता, तब तक कोई उपचार योजना मान्य नहीं है।',
    consentTitle: 'रोगी की सहमति (Consent)',
    consentDescription: 'माप दर्ज करने या अनुस्मारक भेजने से पहले स्पष्ट सहमति आवश्यक है।',
    consentGranted: 'सहमति सक्रिय है',
    consentRevoked: 'सहमति वापस ली गई - डेटा मिटाया गया',
    intakeUploadTitle: 'चिकित्सा रिपोर्ट अपलोड करें',
    confirmValues: 'निकाले गए मानों की पुष्टि करें',
    overdueBadge: 'अतिदेय फॉलो-अप (Overdue)',
    inGraceBadge: 'अनुग्रह अवधि में',
    urgentAlertBadge: 'आपातकालीन चेतावनी',
    subacuteAlertBadge: 'उप-तीव्र चेतावनी',
  },
  as: {
    appName: 'স্বাস্থ্য চেন্স (Swasthya Sense)',
    prototypeDisclaimer: 'প্ৰটোটাইপ সিদ্ধান্ত সাহায্যৰ বাবেহে। প্ৰাথমিক চিকিৎসা নিদানৰ বাবে নহয়।',
    roleSwitcherLabel: 'সক্ৰিয় ভূমিকা',
    clinicalLaneTitle: 'চিকিৎসা অগ্ৰাধিকাৰ লেন (Clinical Lane)',
    clinicalLaneSubtitle: 'চিকিৎসকৰ মনোযোগ প্ৰয়োজন হোৱা তাৎক্ষণিক শাৰীৰিক সতৰ্কবাৰ্তা।',
    adminLaneTitle: 'প্ৰশাসনিক লেন (Administrative Lane)',
    adminLaneSubtitle: 'নিৰ্ধাৰিত পৰীক্ষা, অনুগ্ৰহৰ সময় আৰু পলম হোৱা ফলো-আপ ব্যৱস্থাপনা।',
    whyFlagged: 'ইয়াক কিয় চিহ্নিত কৰা হ’ল?',
    clinicianGateMessage: 'যোগ্য চিকিৎসকে মূল্যায়ন নকৰালৈকে কোনো যত্ন পৰিকল্পনা নাথাকে।',
    consentTitle: 'ৰোগীৰ সন্মতি (Consent)',
    consentDescription: 'জোখ-মাখ ৰেকৰ্ড কৰাৰ বা সোঁৱৰণী পঠোৱাৰ আগতে স্পষ্ট সন্মতি প্ৰয়োজন।',
    consentGranted: 'সন্মতি সক্ৰিয়',
    consentRevoked: 'সন্মতি প্ৰত্যাহাৰ কৰা হ’ল',
    intakeUploadTitle: 'চিকিৎসা প্ৰতিবেদন আপলোড কৰক',
    confirmValues: 'উদ্ধাৰ কৰা মানসমূহ নিশ্চিত কৰক',
    overdueBadge: 'পলম হোৱা ফলো-আপ',
    inGraceBadge: 'অনুগ্ৰহৰ সময়ছোৱাত',
    urgentAlertBadge: 'জৰুৰী সতৰ্কবাৰ্তা',
    subacuteAlertBadge: 'উপ-তীব্ৰ সতৰ্কবাৰ্তা',
    machineTranslatedNotice: '[Machine-translated · Clinical Review Pending]',
  },
};

