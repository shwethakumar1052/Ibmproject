/**
 * GovMatch AI — Chat Response Composer
 *
 * Generates intent-aware, natural-language fallback responses when:
 *   a) No OpenRouter API key is configured
 *   b) The LLM call fails
 *   c) The intent is purely conversational (greeting, thanks, goodbye, etc.)
 *      and does not need LLM at all
 *
 * Also builds the optimised LLM system prompt for production mode.
 *
 * ADDITIVE MODULE — does not modify any existing file.
 * Exported functions are called from server.js /api/chat only.
 */

"use strict";

// ── Language label map ────────────────────────────────────────────────────────
const LANG_LABEL = {
  en: "English", hi: "Hindi", kn: "Kannada",
  ta: "Tamil",   te: "Telugu", mr: "Marathi",
};

// ── Short conversational responses (no LLM needed) ───────────────────────────
// Keyed by intent, then by language code.
// Fallback chain: lang → "en" always present.
const CONVERSATIONAL_RESPONSES = {
  greeting: {
    en: "👋 Hello! I am Bob, your Citizen Services Assistant powered by IBM watsonx.ai.\nI can help you:\n• Discover government schemes and subsidies you qualify for\n• Check eligibility for health, agriculture, education, or business benefits\n• Understand application steps and required documents in your language\n\nTell me a bit about yourself (your state, occupation, or what assistance you are looking for) to get started!",
    hi: "👋 नमस्ते! मैं बॉब हूँ, IBM watsonx.ai द्वारा संचालित आपका नागरिक सेवा सहायक।\nमैं इनमें मदद कर सकता हूँ:\n• आपके लिए योग्य सरकारी योजनाएं और सब्सिडी खोजना\n• स्वास्थ्य, कृषि, शिक्षा या व्यवसाय लाभों की पात्रता जांचना\n• आपकी भाषा में आवेदन के चरण और दस्तावेज़ समझना\n\nशुरू करने के लिए अपना राज्य, व्यवसाय, या किस सहायता की तलाश है बताएं!",
    kn: "👋 ನಮಸ್ಕಾರ! ನಾನು ಬಾಬ್, IBM watsonx.ai ನಿಂದ ಚಾಲಿತ ನಿಮ್ಮ ನಾಗರಿಕ ಸೇವಾ ಸಹಾಯಕ.\nನಾನು ಇದರಲ್ಲಿ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ:\n• ನಿಮಗೆ ಅರ್ಹವಾದ ಸರ್ಕಾರಿ ಯೋಜನೆಗಳನ್ನು ಕಂಡುಹಿಡಿಯಿರಿ\n• ಆರೋಗ್ಯ, ಕೃಷಿ, ಶಿಕ್ಷಣ ಅಥವಾ ವ್ಯಾಪಾರ ಪಾತ್ರತೆ ಪರಿಶೀಲಿಸಿ\n• ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಅರ್ಜಿ ಮತ್ತು ದಾಖಲೆಗಳ ವಿವರ ತಿಳಿಯಿರಿ\n\nಪ್ರಾರಂಭಿಸಲು ನಿಮ್ಮ ರಾಜ್ಯ, ವೃತ್ತಿ ಅಥವಾ ಬೇಕಾದ ಸಹಾಯದ ಬಗ್ಗೆ ತಿಳಿಸಿ!",
    ta: "👋 வணக்கம்! நான் பாப், IBM watsonx.ai மூலம் இயக்கப்படும் உங்கள் குடிமை சேவை உதவியாளர்.\nநான் இதில் உதவலாம்:\n• உங்களுக்கு தகுந்த அரசு திட்டங்கள் மற்றும் மானியங்களை கண்டறியுங்கள்\n• சுகாதாரம், விவசாயம், கல்வி அல்லது வணிக நன்மைகளுக்கான தகுதியை சரிபார்க்கவும்\n• உங்கள் மொழியில் விண்ணப்ப படிகள் மற்றும் ஆவணங்களை புரிந்துகொள்ளுங்கள்\n\nதொடங்க உங்கள் மாநிலம், தொழில் அல்லது என்ன உதவி தேவை என்று சொல்லுங்கள்!",
    te: "👋 నమస్కారం! నేను బాబ్, IBM watsonx.ai ద్వారా నడిచే మీ పౌర సేవా సహాయకుడిని.\nనేను ఇందులో సహాయపడగలను:\n• మీకు అర్హమైన ప్రభుత్వ పథకాలు మరియు సబ్సిడీలను కనుగొనండి\n• ఆరోగ్యం, వ్యవసాయం, విద్య లేదా వ్యాపార ప్రయోజనాలకు అర్హతను తనిఖీ చేయండి\n• మీ భాషలో దరఖాస్తు దశలు మరియు పత్రాలను అర్థం చేసుకోండి\n\nప్రారంభించడానికి మీ రాష్ట్రం, వృత్తి లేదా ఏ సహాయం కావాలో చెప్పండి!",
    mr: "👋 नमस्कार! मी बॉब आहे, IBM watsonx.ai द्वारे चालित तुमचा नागरिक सेवा सहाय्यक.\nमी यात मदत करू शकतो:\n• तुम्हाला पात्र असलेल्या सरकारी योजना आणि अनुदाने शोधा\n• आरोग्य, शेती, शिक्षण किंवा व्यवसाय लाभांसाठी पात्रता तपासा\n• तुमच्या भाषेत अर्ज पायऱ्या आणि कागदपत्रे समजून घ्या\n\nसुरू करण्यासाठी तुमचे राज्य, व्यवसाय किंवा कोणती मदत हवी आहे ते सांगा!",
  },
  thanks: {
    en: "You're welcome! 😊 Feel free to ask if you have more questions about any government scheme, eligibility, or application process.",
    hi: "आपका स्वागत है! 😊 यदि आपके कोई और प्रश्न हैं, तो बेझिझक पूछें।",
    kn: "ಧನ್ಯವಾದಗಳು! 😊 ಇನ್ನಷ್ಟು ಪ್ರಶ್ನೆಗಳಿದ್ದರೆ ಕೇಳಿ.",
    ta: "நன்றி! 😊 இன்னும் கேள்விகள் இருந்தால் கேளுங்கள்.",
    te: "ధన్యవాదాలు! 😊 మరిన్ని ప్రశ్నలుంటే అడగండి.",
    mr: "धन्यवाद! 😊 आणखी प्रश्न असल्यास विचारा.",
  },
  goodbye: {
    en: "Goodbye! 👋 Come back anytime you need help finding government schemes. Best of luck with your applications!",
    hi: "अलविदा! 👋 जब भी मदद चाहिए वापस आएं। आपके आवेदनों के लिए शुभकामनाएं!",
    kn: "ವಿದಾಯ! 👋 ಯಾವಾಗ ಬೇಕಾದರೂ ಮತ್ತೆ ಬನ್ನಿ.",
    ta: "விடைபெறுகிறேன்! 👋 எப்போதும் உதவி பெறலாம்.",
    te: "వీడ్కోలు! 👋 ఎప్పుడైనా తిరిగి రండి.",
    mr: "निरोप! 👋 कधीही परत या.",
  },
  what_can_you_do: {
    en: `I can help you with:\n\n- 🔍 **Finding government schemes** you may be eligible for\n- ✅ **Checking eligibility** for specific schemes\n- 📋 **Documents required** to apply\n- 📝 **Step-by-step application** guidance\n- 💰 **Benefits and amounts** offered by schemes\n- 🏆 **Comparing schemes** side by side\n- 🎯 **Personalised recommendations** based on your profile\n\nJust ask me anything — in English, Hindi, Kannada, Tamil, or Telugu!`,
    hi: `मैं इनमें आपकी मदद कर सकता हूं:\n\n- 🔍 **सरकारी योजनाएं खोजना**\n- ✅ **पात्रता जांचना**\n- 📋 **आवश्यक दस्तावेज़**\n- 📝 **आवेदन प्रक्रिया**\n- 💰 **योजना के लाभ और राशि**\n- 🏆 **योजनाओं की तुलना**\n- 🎯 **व्यक्तिगत सिफारिशें**\n\nहिंदी, अंग्रेजी, कन्नड़, तमिल या तेलुगु में पूछें!`,
    kn: `ನಾನು ಇದರಲ್ಲಿ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ:\n\n- 🔍 **ಸರ್ಕಾರಿ ಯೋಜನೆಗಳನ್ನು ಹುಡುಕುವುದು**\n- ✅ **ಪಾತ್ರತೆ ಪರಿಶೀಲಿಸುವುದು**\n- 📋 **ಅಗತ್ಯ ದಾಖಲೆಗಳು**\n- 📝 **ಅರ್ಜಿ ಸಲ್ಲಿಸುವ ವಿಧಾನ**\n- 💰 **ಯೋಜನೆಯ ಪ್ರಯೋಜನಗಳು**`,
    ta: `நான் இதில் உதவலாம்:\n\n- 🔍 **அரசு திட்டங்களை கண்டுபிடிக்க**\n- ✅ **தகுதி சரிபார்க்க**\n- 📋 **தேவையான ஆவணங்கள்**\n- 📝 **விண்ணப்ப வழிமுறை**\n- 💰 **திட்டத்தின் நன்மைகள்**`,
    te: `నేను ఇందులో సహాయపడగలను:\n\n- 🔍 **ప్రభుత్వ పథకాలను కనుగొనడం**\n- ✅ **అర్హత తనిఖీ**\n- 📋 **అవసరమైన పత్రాలు**\n- 📝 **దరఖాస్తు ప్రక్రియ**\n- 💰 **పథకం యొక్క ప్రయోజనాలు**`,
    mr: `मी यात मदत करू शकतो:\n\n- 🔍 **सरकारी योजना शोधणे**\n- ✅ **पात्रता तपासणे**\n- 📋 **आवश्यक कागदपत्रे**\n- 📝 **अर्ज प्रक्रिया**\n- 💰 **योजनेचे फायदे**`,
  },
  language_change: {
    en: "I've noted your language preference. I'll now respond in your chosen language. How can I help you?",
    hi: "मैंने आपकी भाषा प्राथमिकता नोट कर ली है। अब मैं आपकी चुनी हुई भाषा में जवाब दूंगा।",
    kn: "ನಿಮ್ಮ ಭಾಷಾ ಆದ್ಯತೆ ದಾಖಲಿಸಲಾಗಿದೆ.",
    ta: "உங்கள் மொழி விருப்பம் பதிவு செய்யப்பட்டது.",
    te: "మీ భాష ప్రాధాన్యత నమోదు చేయబడింది.",
    mr: "तुमची भाषा प्राधान्य नोंदवण्यात आली आहे.",
  },
};

/**
 * Get a conversational response for non-scheme intents.
 * Returns null if no canned response exists for the intent (i.e., LLM should handle it).
 *
 * @param {string} intent
 * @param {string} language  BCP-47-like code (en, hi, kn, ta, te, mr)
 * @returns {string|null}
 */
function getConversationalResponse(intent, language) {
  const lang = language?.slice(0, 2) || "en";
  const bank = CONVERSATIONAL_RESPONSES[intent];
  if (!bank) return null;
  return bank[lang] || bank["en"];
}

/**
 * Check whether this intent can be fully answered without the LLM.
 * @param {string} intent
 * @returns {boolean}
 */
function isConversationalOnly(intent) {
  return ["greeting", "thanks", "goodbye", "what_can_you_do", "language_change"].includes(intent);
}

// ── Structured scheme-specific fallback (no LLM) ────────────────────────────
/**
 * Build a natural, structured answer from scheme data for a given intent.
 * Used when OpenRouter is unavailable.
 *
 * @param {string}   intent
 * @param {object[]} schemes  verified scheme records from RAG
 * @param {string}   language
 * @returns {string}
 */
function buildSchemeAnswer(intent, schemes, language) {
  const lang = language?.slice(0, 2) || "en";

  if (!schemes.length) {
    return _noSchemeMsg(lang);
  }

  const primary = schemes[0];

  switch (intent) {
    case "eligibility_check":
      return _eligibilityAnswer(primary, schemes, lang);
    case "documents_required":
      return _documentsAnswer(primary, lang);
    case "application_process":
      return _applicationAnswer(primary, lang);
    case "benefit_inquiry":
      return _benefitAnswer(primary, lang);
    case "scheme_details":
      return _schemeDetailsAnswer(primary, lang);
    case "personalized_recommendation":
      return _recommendationAnswer(schemes, lang);
    case "followup_compare":
      return _compareAnswer(schemes, lang);
    case "scheme_search":
      return _schemeListAnswer(schemes, lang);
    default:
      return _schemeListAnswer(schemes, lang);
  }
}

// ── Per-intent structured builders ──────────────────────────────────────────

function _eligibilityAnswer(scheme, allSchemes, lang) {
  const eligible = scheme.eligibility || "Eligibility details not available in the dataset.";
  const templates = {
    en: `Based on the scheme database, here is the eligibility for **${scheme.name}**:\n\n${_formatEligibility(eligible)}\n\n*Please verify final eligibility on the official portal before applying.*`,
    hi: `स्कीम डेटाबेस के अनुसार, **${scheme.name}** की पात्रता:\n\n${_formatEligibility(eligible)}\n\n*आवेदन से पहले आधिकारिक पोर्टल पर अंतिम पात्रता सत्यापित करें।*`,
    kn: `ಡೇಟಾಬೇಸ್ ಪ್ರಕಾರ, **${scheme.name}** ಪಾತ್ರತೆ:\n\n${_formatEligibility(eligible)}\n\n*ಅರ್ಜಿ ಸಲ್ಲಿಸುವ ಮೊದಲು ಅಧಿಕೃತ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ಪರಿಶೀಲಿಸಿ.*`,
    ta: `தரவுத்தளத்தின்படி, **${scheme.name}** தகுதி:\n\n${_formatEligibility(eligible)}\n\n*விண்ணப்பிக்கும் முன் அதிகாரப்பூர்வ போர்ட்டலில் சரிபார்க்கவும்.*`,
    te: `డేటాబేస్ ప్రకారం, **${scheme.name}** అర్హత:\n\n${_formatEligibility(eligible)}\n\n*దరఖాస్తు చేయడానికి ముందు అధికారిక పోర్టల్‌లో ధృవీకరించండి.*`,
    mr: `डेटाबेसनुसार, **${scheme.name}** पात्रता:\n\n${_formatEligibility(eligible)}\n\n*अर्ज करण्यापूर्वी अधिकृत पोर्टलवर सत्यापित करा.*`,
  };
  return templates[lang] || templates.en;
}

function _documentsAnswer(scheme, lang) {
  const DEFAULT_DOCS = [
    "Aadhaar Card",
    "Bank Passbook / Account Details",
    "Income Certificate",
    "Address Proof",
    "Passport Size Photograph",
    "Caste Certificate (if applicable)",
  ];
  const docText = `Here are the documents generally required for **${scheme.name}**:\n\n${DEFAULT_DOCS.map(d => `- ${d}`).join("\n")}\n\n*Exact document requirements may vary. Check the official portal for the complete list.*`;
  const templates = {
    en: docText,
    hi: `**${scheme.name}** के लिए आमतौर पर आवश्यक दस्तावेज़:\n\n- आधार कार्ड\n- बैंक पासबुक\n- आय प्रमाण पत्र\n- पते का प्रमाण\n- पासपोर्ट साइज फोटो\n- जाति प्रमाण पत्र (यदि लागू हो)\n\n*आधिकारिक पोर्टल पर पूरी सूची देखें।*`,
    kn: `**${scheme.name}** ಗೆ ಸಾಮಾನ್ಯವಾಗಿ ಅಗತ್ಯವಿರುವ ದಾಖಲೆಗಳು:\n\n- ಆಧಾರ್ ಕಾರ್ಡ್\n- ಬ್ಯಾಂಕ್ ಪಾಸ್‌ಬುಕ್\n- ಆದಾಯ ಪ್ರಮಾಣಪತ್ರ\n- ವಿಳಾಸ ಪ್ರಮಾಣ\n- ಪಾಸ್‌ಪೋರ್ಟ್ ಗಾತ್ರದ ಫೋಟೋ\n\n*ಅಧಿಕೃತ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ಪರಿಶೀಲಿಸಿ.*`,
    ta: `**${scheme.name}** க்கு பொதுவாக தேவையான ஆவணங்கள்:\n\n- ஆதார் அட்டை\n- வங்கி பாஸ்புக்\n- வருமான சான்றிதழ்\n- முகவரி சான்று\n- புகைப்படம்\n\n*அதிகாரப்பூர்வ போர்ட்டலில் சரிபார்க்கவும்.*`,
    te: `**${scheme.name}** కి సాధారణంగా అవసరమైన పత్రాలు:\n\n- ఆధార్ కార్డు\n- బ్యాంక్ పాస్‌బుక్\n- ఆదాయ సర్టిఫికేట్\n- చిరునామా రుజువు\n- ఫోటో\n\n*అధికారిక పోర్టల్‌లో తనిఖీ చేయండి.*`,
    mr: `**${scheme.name}** साठी सामान्यतः आवश्यक कागदपत्रे:\n\n- आधार कार्ड\n- बँक पासबुक\n- उत्पन्न प्रमाणपत्र\n- पत्त्याचा पुरावा\n- फोटो\n\n*अधिकृत पोर्टलवर तपासा.*`,
  };
  return templates[lang] || templates.en;
}

function _applicationAnswer(scheme, lang) {
  const process = scheme.application_process
    ? scheme.application_process.replace(/\.\s*/g, ".\n").trim()
    : "Visit the official portal, fill the application form, upload documents, and submit.";
  const url = scheme.application_url ? `\n\n**Apply at:** ${scheme.application_url}` : "";
  const templates = {
    en: `Here's how to apply for **${scheme.name}**:\n\n1. ${process}${url}\n\n*Always apply through official government portals only.*`,
    hi: `**${scheme.name}** के लिए आवेदन कैसे करें:\n\n1. ${process}${url}\n\n*केवल आधिकारिक सरकारी पोर्टल से आवेदन करें।*`,
    kn: `**${scheme.name}** ಗೆ ಅರ್ಜಿ ಸಲ್ಲಿಸುವ ವಿಧಾನ:\n\n1. ${process}${url}`,
    ta: `**${scheme.name}** க்கு எப்படி விண்ணப்பிக்கலாம்:\n\n1. ${process}${url}`,
    te: `**${scheme.name}** కి ఎలా దరఖాస్తు చేయాలి:\n\n1. ${process}${url}`,
    mr: `**${scheme.name}** साठी कसे अर्ज करावे:\n\n1. ${process}${url}`,
  };
  return templates[lang] || templates.en;
}

function _benefitAnswer(scheme, lang) {
  const benefits = scheme.benefits || "Benefit details not available in the current dataset.";
  const templates = {
    en: `Here's what **${scheme.name}** offers:\n\n**Benefits:**\n${_formatBullets(benefits)}\n\n*For the latest benefit amounts, check the official portal.*`,
    hi: `**${scheme.name}** के लाभ:\n\n${_formatBullets(benefits)}\n\n*नवीनतम लाभ राशि के लिए आधिकारिक पोर्टल देखें।*`,
    kn: `**${scheme.name}** ಪ್ರಯೋಜನಗಳು:\n\n${_formatBullets(benefits)}`,
    ta: `**${scheme.name}** நன்மைகள்:\n\n${_formatBullets(benefits)}`,
    te: `**${scheme.name}** ప్రయోజనాలు:\n\n${_formatBullets(benefits)}`,
    mr: `**${scheme.name}** चे फायदे:\n\n${_formatBullets(benefits)}`,
  };
  return templates[lang] || templates.en;
}

function _schemeDetailsAnswer(scheme, lang) {
  const url = scheme.application_url ? `\n\n**Apply at:** ${scheme.application_url}` : "";
  const templates = {
    en: `### ${scheme.name}\n\n**What it is:**\n${scheme.brief_description}\n\n**Benefits:**\n${_formatBullets(scheme.benefits)}\n\n**Eligibility:**\n${_formatEligibility(scheme.eligibility)}\n\n**Ministry:** ${scheme.ministry || "—"}${url}`,
    hi: `### ${scheme.name}\n\n**क्या है:**\n${scheme.brief_description}\n\n**लाभ:**\n${_formatBullets(scheme.benefits)}\n\n**पात्रता:**\n${_formatEligibility(scheme.eligibility)}${url}`,
    kn: `### ${scheme.name}\n\n**ಏನು:**\n${scheme.brief_description}\n\n**ಪ್ರಯೋಜನಗಳು:**\n${_formatBullets(scheme.benefits)}\n\n**ಪಾತ್ರತೆ:**\n${_formatEligibility(scheme.eligibility)}${url}`,
    ta: `### ${scheme.name}\n\n**என்ன:**\n${scheme.brief_description}\n\n**நன்மைகள்:**\n${_formatBullets(scheme.benefits)}\n\n**தகுதி:**\n${_formatEligibility(scheme.eligibility)}${url}`,
    te: `### ${scheme.name}\n\n**ఏమిటి:**\n${scheme.brief_description}\n\n**ప్రయోజనాలు:**\n${_formatBullets(scheme.benefits)}\n\n**అర్హత:**\n${_formatEligibility(scheme.eligibility)}${url}`,
    mr: `### ${scheme.name}\n\n**काय आहे:**\n${scheme.brief_description}\n\n**फायदे:**\n${_formatBullets(scheme.benefits)}\n\n**पात्रता:**\n${_formatEligibility(scheme.eligibility)}${url}`,
  };
  return templates[lang] || templates.en;
}

function _recommendationAnswer(schemes, lang) {
  const list = schemes.slice(0, 5).map((s, i) =>
    `${i + 1}. **${s.name}** — ${s.brief_description}`
  ).join("\n");
  const templates = {
    en: `Based on your profile, here are the schemes that may suit you:\n\n${list}\n\nUse the **Eligibility Checker** for a complete match, or ask me about any specific scheme above.`,
    hi: `आपकी प्रोफ़ाइल के आधार पर, ये योजनाएं आपके लिए उपयुक्त हो सकती हैं:\n\n${list}\n\nपूर्ण मिलान के लिए **पात्रता जांचकर्ता** का उपयोग करें।`,
    kn: `ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ಆಧಾರದ ಮೇಲೆ ಸೂಕ್ತ ಯೋಜನೆಗಳು:\n\n${list}`,
    ta: `உங்கள் விவரங்களின் படி பொருத்தமான திட்டங்கள்:\n\n${list}`,
    te: `మీ ప్రొఫైల్ ఆధారంగా తగిన పథకాలు:\n\n${list}`,
    mr: `तुमच्या प्रोफाइलनुसार योग्य योजना:\n\n${list}`,
  };
  return templates[lang] || templates.en;
}

function _compareAnswer(schemes, lang) {
  if (schemes.length < 2) return _schemeListAnswer(schemes, lang);
  const rows = schemes.slice(0, 3).map((s, i) =>
    `**${i + 1}. ${s.name}**\n- Benefits: ${(s.benefits || "—").slice(0, 100)}\n- Eligibility: ${(s.eligibility || "—").slice(0, 80)}`
  ).join("\n\n");
  const templates = {
    en: `Here's a comparison of the top schemes:\n\n${rows}\n\nUse the **Compare** page for a full side-by-side view.`,
    hi: `शीर्ष योजनाओं की तुलना:\n\n${rows}`,
    kn: `ಯೋಜನೆಗಳ ಹೋಲಿಕೆ:\n\n${rows}`,
    ta: `திட்டங்களின் ஒப்பீடு:\n\n${rows}`,
    te: `పథకాల పోలిక:\n\n${rows}`,
    mr: `योजनांची तुलना:\n\n${rows}`,
  };
  return templates[lang] || templates.en;
}

function _schemeListAnswer(schemes, lang) {
  if (!schemes.length) return _noSchemeMsg(lang);
  const list = schemes.slice(0, 5).map((s, i) =>
    `${i + 1}. **${s.name}** — ${s.brief_description}`
  ).join("\n");
  const templates = {
    en: `Here are the matching government schemes:\n\n${list}\n\nAsk me for details, eligibility, or application steps for any of these.`,
    hi: `मिलान करने वाली सरकारी योजनाएं:\n\n${list}`,
    kn: `ಹೊಂದಾಣಿಕೆಯ ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು:\n\n${list}`,
    ta: `பொருத்தமான அரசு திட்டங்கள்:\n\n${list}`,
    te: `సరిపోయే ప్రభుత్వ పథకాలు:\n\n${list}`,
    mr: `जुळणाऱ्या सरकारी योजना:\n\n${list}`,
  };
  return templates[lang] || templates.en;
}

function _noSchemeMsg(lang) {
  const msgs = {
    en: "I couldn't find any matching schemes in the current dataset for your query. Try rephrasing, or use the **Eligibility Checker** for a full personalised match. You can also ask me about a specific scheme name.",
    hi: "आपके प्रश्न के लिए कोई मिलान योजना नहीं मिली। कृपया प्रश्न बदलकर पूछें या **पात्रता जांचकर्ता** का उपयोग करें।",
    kn: "ನಿಮ್ಮ ಪ್ರಶ್ನೆಗೆ ಯಾವುದೇ ಹೊಂದಾಣಿಕೆಯ ಯೋಜನೆ ಕಂಡುಬಂದಿಲ್ಲ. ದಯವಿಟ್ಟು ಬೇರೆ ರೀತಿಯಲ್ಲಿ ಕೇಳಿ.",
    ta: "உங்கள் கேள்விக்கு பொருத்தமான திட்டம் கண்டுபிடிக்கவில்லை. வேறுவிதமாக கேளுங்கள்.",
    te: "మీ ప్రశ్నకు సరిపోయే పథకం కనుగొనలేదు. వేరుగా అడగండి.",
    mr: "तुमच्या प्रश्नासाठी कोणती योजना सापडली नाही. वेगळ्या प्रकारे विचारा.",
  };
  return msgs[lang] || msgs.en;
}

// ── Unknown / general question ────────────────────────────────────────────────
function getUnknownResponse(lang) {
  const msgs = {
    en: "I'm not completely sure what you're asking. I specialise in Indian government schemes. You can ask me about:\n\n- Scheme eligibility\n- Benefits and amounts\n- Required documents\n- Application process\n- Scheme recommendations for your profile\n\nCould you rephrase your question?",
    hi: "मुझे पूरी तरह समझ नहीं आया। आप पूछ सकते हैं:\n\n- योजना की पात्रता\n- लाभ और राशि\n- आवश्यक दस्तावेज़\n- आवेदन प्रक्रिया\n\nकृपया अपना प्रश्न फिर से बताएं।",
    kn: "ನಿಮ್ಮ ಪ್ರಶ್ನೆ ಸಂಪೂರ್ಣ ಅರ್ಥವಾಗಲಿಲ್ಲ. ಪಾತ್ರತೆ, ಪ್ರಯೋಜನಗಳು, ದಾಖಲೆಗಳು ಅಥವಾ ಅರ್ಜಿ ಪ್ರಕ್ರಿಯೆಯ ಬಗ್ಗೆ ಕೇಳಿ.",
    ta: "உங்கள் கேள்வி புரியவில்லை. தகுதி, நன்மைகள், ஆவணங்கள் அல்லது விண்ணப்ப செயல்முறை பற்றி கேளுங்கள்.",
    te: "మీ ప్రశ్న అర్థం కాలేదు. అర్హత, ప్రయోజనాలు, పత్రాలు లేదా దరఖాస్తు ప్రక్రియ గురించి అడగండి.",
    mr: "तुमचा प्रश्न पूर्णपणे समजला नाही. पात्रता, फायदे, कागदपत्रे किंवा अर्ज प्रक्रियेबद्दल विचारा.",
  };
  return msgs[lang] || msgs.en;
}

// ── LLM System Prompt builder ────────────────────────────────────────────────
/**
 * Build the full, context-rich system prompt for the LLM call.
 * Includes: role, rules, language, intent, conversation awareness,
 * follow-up resolution instructions, profile, and grounded scheme data.
 *
 * @param {object} opts
 * @param {string}   opts.langLabel       e.g. "Hindi"
 * @param {object}   opts.intentResult    { intent, domains, confidence }
 * @param {object[]} opts.history         last N turns [{ role, content }]
 * @param {object}   opts.profile         citizen profile
 * @param {string}   opts.groundTruth     formatted verified scheme block
 * @returns {string}
 */
function buildSystemPrompt({ langLabel, intentResult, history, profile, groundTruth }) {
  const hasHistory = history && history.length > 0;
  const profileSummary = Object.keys(profile).length
    ? JSON.stringify(profile)
    : "Not yet collected — ask naturally if needed.";

  // Extract last mentioned scheme names from history for follow-up resolution
  const lastSchemeNames = _extractLastSchemeNames(history);
  const contextNote = lastSchemeNames.length
    ? `LAST MENTIONED SCHEMES (for follow-up resolution): ${lastSchemeNames.join(", ")}`
    : "";

  return [
    `You are Bob, a Citizen Services Assistant powered by IBM watsonx.ai and IBM SkillsBuild.`,
    `Your mission is to help Indian citizens — including those with low digital literacy — discover government welfare schemes, check eligibility, and understand how to apply, in simple everyday language.`,
    ``,
    `=== IDENTITY ===`,
    `- Name: Bob (Citizen Services Assistant)`,
    `- Powered by: IBM watsonx.ai · IBM SkillsBuild`,
    `- Tone: Empathetic, simple, encouraging, respectful. Speak like a helpful neighbour, not a bureaucrat.`,
    ``,
    `=== RESPONSE RULES ===`,
    `1. LANGUAGE: Answer ONLY in ${langLabel}. If the user mixes languages (Hinglish, Kanglish, Tanglish, etc.), detect intent and respond in ${langLabel} with native script.`,
    `2. GROUNDING: Base ALL scheme information STRICTLY on the VERIFIED SCHEME DATABASE below. NEVER fabricate scheme names, monetary amounts, interest rates, eligibility rules, or application links. If a detail is unknown, say: "Please verify at the official portal or your nearest CSC centre."`,
    `3. CONTEXT: ${hasHistory ? "This is a multi-turn conversation. When the user asks a follow-up question (e.g. 'who can apply?' or 'the second one'), resolve it from the schemes already mentioned — do not ask for clarification." : "This is the start of the conversation."}`,
    contextNote,
    `4. FOLLOW-UP: Short questions like "who can apply?", "what documents?", "how much?", "the second one" are follow-ups to the previous response. Resolve them without asking the user to clarify.`,
    `5. RESPONSE FORMAT: For every scheme explanation use this structure:
🏛️ **[Scheme Name]** — *[Central/State | Ministry]*
**What it is:** [1–2 plain sentences]
💰 **Key Benefits:** [bullet list]
✅ **Who Can Apply:** Age / Income / Target group
❌ **Who Cannot Apply:** [key disqualifiers]
📋 **Required Documents:** [bullet list]
📝 **How to Apply:** [numbered steps]
🔗 **Official Portal:** [URL] | 📞 **Helpline:** [number]`,
    `6. STYLE: Use markdown — **bold** for names/amounts, bullet lists, numbered steps. Keep concise unless detail is needed. End with an encouraging line like "You deserve these benefits — take the first step today!"`,
    `7. NO ROBOTIC RESPONSES: Never say "Invalid query" or "I cannot process this". If you don't understand, ask naturally.`,
    `8. INTENT: The detected intent is "${intentResult.intent}" | Domains: [${intentResult.domains.join(", ") || "general"}]. Tailor your response accordingly.`,
    `9. SAFETY: If asked about topics outside government schemes (politics, personal advice, medical diagnosis, legal advice), politely decline and redirect.`,
    `10. PROFILE: ${profileSummary}. Ask ONLY for missing information actually needed — never re-ask what is already provided. Gather age, gender, state, occupation, income, caste naturally over 1–2 turns.`,
    `11. ELIGIBILITY ASSESSMENT: After collecting enough profile info, explicitly state: ✅ Eligible / 🔶 Likely Eligible / 🔁 Alternative Scheme Recommended — with a brief reason.`,
    `12. CALL TO ACTION: End every scheme answer with one clear next step (e.g. "Visit pmkisan.gov.in" or "Go to your nearest CSC centre — it's free!").`,
    ``,
    groundTruth || `(No scheme data matched this query — be honest with the user and suggest they try myscheme.gov.in or the Eligibility Checker.)`,
  ].filter(Boolean).join("\n");
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _formatEligibility(text) {
  if (!text) return "Not specified.";
  // Try to split by semicolons or common delimiters into bullets
  const parts = text.split(/[;,]\s*/).filter(p => p.trim().length > 3);
  if (parts.length > 1) return parts.map(p => `- ${p.trim()}`).join("\n");
  return text;
}

function _formatBullets(text) {
  if (!text) return "Not specified.";
  const parts = text.split(/[;,]\s*/).filter(p => p.trim().length > 3);
  if (parts.length > 1) return parts.map(p => `- ${p.trim()}`).join("\n");
  return text;
}

function _extractLastSchemeNames(history) {
  if (!history || !history.length) return [];
  // Look at the last assistant message for **bold** scheme names
  const lastBot = [...history].reverse().find(m => m.role === "assistant");
  if (!lastBot?.content) return [];
  const names = [];
  const rx = /\*\*([^*]+)\*\*/g;
  let m;
  while ((m = rx.exec(lastBot.content)) !== null) {
    if (m[1].length > 4 && m[1].length < 80) names.push(m[1]);
  }
  return names.slice(0, 5);
}

module.exports = {
  getConversationalResponse,
  isConversationalOnly,
  buildSchemeAnswer,
  getUnknownResponse,
  buildSystemPrompt,
};
