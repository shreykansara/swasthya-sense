"""
Deterministic Plain-Language Readout Generator (Class-6 Reading Level)
Swasthya Sense — Cardiac Follow-Up & Early-Warning Prototype

Non-negotiable principle: NEVER DIAGNOSE.
Produces simple, clear text explaining lab results strictly against reference ranges.
Supports English (en) and Hindi (hi).
"""

from apps.api.app.readout.models import AnalyteReadoutItem, SupportedLanguage


def compute_item_status(item: AnalyteReadoutItem) -> str:
    """Computes whether the item value is within, higher, or lower than reference range."""
    if item.reference_low is not None and item.reference_high is not None:
        if item.value < item.reference_low:
            return "lower"
        elif item.value > item.reference_high:
            return "higher"
        else:
            return "within_range"
    elif item.reference_high is not None:
        if item.value > item.reference_high:
            return "higher"
        else:
            return "within_range"
    elif item.reference_low is not None:
        if item.value < item.reference_low:
            return "lower"
        else:
            return "within_range"
    return "informational"


def generate_deterministic_readout(
    items: list[AnalyteReadoutItem],
    language: SupportedLanguage = "en",
) -> str:
    """
    Generates a deterministic plain-language summary of confirmed laboratory values.
    Adheres strictly to Class-6 reading level and never names any condition.
    """
    if not items:
        if language == "hi":
            return (
                "प्रयोगशाला रिपोर्ट विवरण (प्रोटोटाइप)\n\n"
                "इस रिपोर्ट के लिए कोई पुष्ट प्रयोगशाला मान दर्ज नहीं किया गया है। "
                "कृपया रिपोर्ट अपलोड करें या अपने स्वास्थ्य कार्यकर्ता से संपर्क करें।"
            )
        return (
            "Laboratory Report Readout (Prototype)\n\n"
            "No confirmed laboratory values were recorded for this report. "
            "Please upload a report or contact your health worker."
        )

    # Process statuses
    for it in items:
        it.status = compute_item_status(it)

    lines: list[str] = []

    if language == "hi":
        lines.append("प्रयोगशाला जाँच रिपोर्ट सारांश (सरल भाषा विवरण)")
        lines.append("सूचना: यह प्रोटोटाइप प्रणाली है। यह केवल प्रयोगशाला संदर्भ सीमाओं को दर्शाती है।\n")

        for idx, it in enumerate(items, 1):
            lines.append(f"{idx}. {it.display_name}")
            lines.append(f"   - आपका परिणाम: {it.value} {it.unit}")

            if it.reference_low is not None and it.reference_high is not None:
                lines.append(f"   - प्रयोगशाला सामान्य सीमा: {it.reference_low} - {it.reference_high} {it.unit}")
            elif it.reference_high is not None:
                lines.append(f"   - प्रयोगशाला सामान्य सीमा: {it.reference_high} {it.unit} से कम")
            elif it.reference_low is not None:
                lines.append(f"   - प्रयोगशाला सामान्य सीमा: {it.reference_low} {it.unit} से अधिक")
            else:
                lines.append("   - प्रयोगशाला सामान्य सीमा: उपलब्ध नहीं")

            if it.status == "within_range":
                lines.append("   - स्थिति: यह मान प्रयोगशाला की सामान्य सीमा के भीतर है।")
            elif it.status == "higher":
                lines.append("   - स्थिति: यह मान प्रयोगशाला की सामान्य सीमा से अधिक है।")
            elif it.status == "lower":
                lines.append("   - स्थिति: यह मान प्रयोगशाला की सामान्य सीमा से कम है।")
            else:
                lines.append("   - स्थिति: परिणाम दर्ज किया गया है।")
            lines.append("")

        lines.append(
            "आगे के कदम:\n"
            "एक चिकित्सक आपके इन जाँच परिणामों की समीक्षा करेंगे और आपकी उचित देखभाल योजना पर आपसे चर्चा करेंगे। "
            "यह प्रणाली कोई चिकित्सीय मूल्यांकन या उपचार तय नहीं करती है।"
        )

    else:
        # Default English
        lines.append("Laboratory Test Report Summary (Plain Language Readout)")
        lines.append("Notice: This is a prototype system. It explains lab reference ranges only.\n")

        for idx, it in enumerate(items, 1):
            lines.append(f"{idx}. {it.display_name}")
            lines.append(f"   - Your Result: {it.value} {it.unit}")

            if it.reference_low is not None and it.reference_high is not None:
                lines.append(f"   - Lab Normal Range: {it.reference_low} - {it.reference_high} {it.unit}")
            elif it.reference_high is not None:
                lines.append(f"   - Lab Normal Range: Less than {it.reference_high} {it.unit}")
            elif it.reference_low is not None:
                lines.append(f"   - Lab Normal Range: Greater than {it.reference_low} {it.unit}")
            else:
                lines.append("   - Lab Normal Range: Not specified")

            if it.status == "within_range":
                lines.append("   - Result Status: This value is within the laboratory normal range.")
            elif it.status == "higher":
                lines.append("   - Result Status: This value is higher than the laboratory normal range.")
            elif it.status == "lower":
                lines.append("   - Result Status: This value is lower than the laboratory normal range.")
            else:
                lines.append("   - Result Status: Recorded.")
            lines.append("")

        lines.append(
            "Next Steps:\n"
            "A clinician will review these test results with you to discuss what they mean for your care. "
            "This summary does not provide a medical assessment or treatment plan."
        )

    return "\n".join(lines)
