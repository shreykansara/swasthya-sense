import React, { useState } from 'react';

export interface AnalyteItem {
  analyte_key: string;
  display_name: string;
  value: number;
  unit: string;
  reference_low?: number | null;
  reference_high?: number | null;
  status: 'within_range' | 'higher' | 'lower' | 'informational';
}

export interface PlainReadoutCardProps {
  initialItems?: AnalyteItem[];
  initialLanguage?: 'en' | 'hi';
}

const DEFAULT_SAMPLE_ITEMS: AnalyteItem[] = [
  {
    analyte_key: 'potassium',
    display_name: 'Serum Potassium',
    value: 4.8,
    unit: 'mmol/L',
    reference_low: 3.5,
    reference_high: 5.1,
    status: 'within_range',
  },
  {
    analyte_key: 'troponin_i',
    display_name: 'Troponin I',
    value: 0.08,
    unit: 'ng/mL',
    reference_low: null,
    reference_high: 0.04,
    status: 'higher',
  },
  {
    analyte_key: 'systolic_bp',
    display_name: 'Systolic Blood Pressure',
    value: 138.0,
    unit: 'mmHg',
    reference_low: 90.0,
    reference_high: 120.0,
    status: 'higher',
  },
];

export const PlainReadoutCard: React.FC<PlainReadoutCardProps> = ({
  initialItems = DEFAULT_SAMPLE_ITEMS,
  initialLanguage = 'en',
}) => {
  const [language, setLanguage] = useState<'en' | 'hi'>(initialLanguage);
  const [isPlaying, setIsPlaying] = useState(false);

  // Generate localized readout text
  const isHi = language === 'hi';

  const readoutText = isHi
    ? `प्रयोगशाला रिपोर्ट सारांश (सरल भाषा)\n` +
      `सूचना: यह प्रोटोटाइप प्रणाली है और केवल प्रयोगशाला संदर्भ सीमाओं को समझाती है। यह कोई चिकित्सीय निदान प्रदान नहीं करती है।\n\n` +
      initialItems
        .map(
          (it, idx) =>
            `${idx + 1}. ${it.display_name}: आपका परिणाम ${it.value} ${it.unit} है। ` +
            (it.reference_low != null && it.reference_high != null
              ? `प्रयोगशाला सामान्य सीमा ${it.reference_low} से ${it.reference_high} ${it.unit} है। `
              : it.reference_high != null
              ? `प्रयोगशाला सामान्य सीमा ${it.reference_high} ${it.unit} से कम है। `
              : '') +
            (it.status === 'within_range'
              ? 'यह मान सामान्य सीमा के भीतर है।'
              : it.status === 'higher'
              ? 'यह मान सामान्य सीमा से अधिक है।'
              : 'यह मान सामान्य सीमा से कम है।')
        )
        .join('\n\n') +
      `\n\nआगे के कदम: एक चिकित्सक आपके परिणामों की समीक्षा करेंगे और आपकी देखभाल योजना पर आपसे चर्चा करेंगे।`
    : `Laboratory Test Report Summary (Plain Language)\n` +
      `Notice: This prototype explains lab reference ranges only. It never provides a medical diagnosis.\n\n` +
      initialItems
        .map(
          (it, idx) =>
            `${idx + 1}. ${it.display_name}: Your result is ${it.value} ${it.unit}. ` +
            (it.reference_low != null && it.reference_high != null
              ? `Lab normal range is ${it.reference_low} - ${it.reference_high} ${it.unit}. `
              : it.reference_high != null
              ? `Lab normal limit is less than ${it.reference_high} ${it.unit}. `
              : '') +
            (it.status === 'within_range'
              ? 'This value is within the standard range.'
              : it.status === 'higher'
              ? 'This value is higher than the standard range.'
              : 'This value is lower than the standard range.')
        )
        .join('\n\n') +
      `\n\nNext Steps: A clinician will review these values with you to discuss what they mean for your care.`;

  const handleToggleSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported on this device/browser.');
      return;
    }

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(readoutText);
    utterance.lang = isHi ? 'hi-IN' : 'en-US';
    utterance.rate = 0.95;

    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <span>📋</span>
            <span>{isHi ? 'सरल भाषा में रिपोर्ट विवरण' : 'Plain Language Readout'}</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {isHi
              ? 'कक्षा 6 स्तर का विवरण — कोई चिकित्सीय निदान नहीं'
              : 'Class 6 reading level — strictly non-diagnostic'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Language Toggle */}
          <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700 text-xs font-medium">
            <button
              onClick={() => setLanguage('en')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                !isHi ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
              aria-label="Switch to English"
            >
              English
            </button>
            <button
              onClick={() => setLanguage('hi')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                isHi ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
              aria-label="Switch to Hindi"
            >
              हिन्दी
            </button>
          </div>

          {/* Audio Readout Button */}
          <button
            onClick={handleToggleSpeech}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isPlaying
                ? 'bg-rose-600 text-white border-rose-500 hover:bg-rose-700'
                : 'bg-slate-800 text-cyan-400 border-slate-700 hover:bg-slate-700'
            }`}
            aria-label={isPlaying ? 'Stop audio playback' : 'Read readout aloud'}
          >
            <span>{isPlaying ? '⏹' : '🔊'}</span>
            <span>
              {isPlaying
                ? isHi
                  ? 'रोकें'
                  : 'Stop'
                : isHi
                ? 'सुनें (Audio)'
                : 'Read Aloud'}
            </span>
          </button>
        </div>
      </div>

      {/* Prototype Notice Alert */}
      <div className="bg-amber-950/40 border border-amber-800/60 rounded-lg p-2.5 text-xs text-amber-200/90 flex items-start gap-2">
        <span className="text-amber-400 mt-0.5">⚠️</span>
        <div>
          <span className="font-semibold uppercase tracking-wider text-[10px] bg-amber-900/60 text-amber-300 px-1.5 py-0.5 rounded mr-1.5">
            {isHi ? 'प्रोटोटाइप' : 'Prototype'}
          </span>
          {isHi
            ? 'सिंथेटिक डेटा — कोई मेडिकल डिवाइस नहीं। यह विवरण केवल संदर्भ सीमाओं को दर्शाता है।'
            : 'Synthetic data only — Not a medical device. This readout explains laboratory reference ranges only.'}
        </div>
      </div>

      {/* Visual Analytes Grid */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {isHi ? 'जाँच परिणाम व सामान्य सीमाएँ' : 'Tested Values vs Reference Ranges'}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {initialItems.map((item) => (
            <div
              key={item.analyte_key}
              className="bg-slate-800/80 border border-slate-700/80 rounded-lg p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-1">
                <span className="text-xs font-medium text-slate-200">
                  {item.display_name}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    item.status === 'within_range'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : item.status === 'higher'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-blue-950 text-blue-300 border border-blue-800'
                  }`}
                >
                  {isHi
                    ? item.status === 'within_range'
                      ? 'सामान्य'
                      : item.status === 'higher'
                      ? 'अधिक'
                      : 'कम'
                    : item.status === 'within_range'
                    ? 'Within Range'
                    : item.status === 'higher'
                    ? 'Higher'
                    : 'Lower'}
                </span>
              </div>

              <div className="text-lg font-bold text-white font-mono">
                {item.value}{' '}
                <span className="text-xs font-normal text-slate-400">{item.unit}</span>
              </div>

              <div className="text-[11px] text-slate-400 border-t border-slate-700/60 pt-1.5">
                {isHi ? 'संदर्भ सीमा: ' : 'Lab Range: '}
                {item.reference_low != null && item.reference_high != null
                  ? `${item.reference_low} - ${item.reference_high} ${item.unit}`
                  : item.reference_high != null
                  ? `< ${item.reference_high} ${item.unit}`
                  : item.reference_low != null
                  ? `> ${item.reference_low} ${item.unit}`
                  : 'N/A'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Full Plain-Language Narrative Box */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-line">
        {readoutText}
      </div>

      {/* Safety Gate Guarantee Footer */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2.5">
        <span className="flex items-center gap-1.5 text-emerald-400">
          <span>🛡️</span>
          <span>
            {isHi ? 'क्लिनिशियन समीक्षा गेट सक्रिय' : 'Clinician Review Gate Active'}
          </span>
        </span>
        <span className="text-slate-400">
          {isHi ? 'स्रोत: सुरक्षित भाषा मॉडल / टेम्पलेट' : 'Source: Guarded Engine'}
        </span>
      </div>
    </div>
  );
};
