import {
  QUALITY_CRITERION_TEMPLATES,
  VIOLATION_DICTIONARY_TEMPLATES,
} from "./quality-rule-templates";

describe("quality rule templates", () => {
  it("has unique criterion and violation codes", () => {
    const codes = [
      ...QUALITY_CRITERION_TEMPLATES.map((template) => template.code),
      ...VIOLATION_DICTIONARY_TEMPLATES.map((template) => template.code),
    ];

    expect(new Set(codes).size).toBe(codes.length);
  });

  it("covers analyzer criteria and violation codes used by automatic checks", () => {
    const criterionCodes = new Set(QUALITY_CRITERION_TEMPLATES.map((template) => template.code));
    const violationCodes = new Set(VIOLATION_DICTIONARY_TEMPLATES.map((template) => template.code));

    expect(Array.from(criterionCodes)).toEqual(
      expect.arrayContaining([
        "TECHNICAL_REQUIREMENTS",
        "METADATA_QUALITY",
        "IMAGE_RESOLUTION",
        "VIDEO_RESOLUTION_BITRATE",
        "AUDIO_INTELLIGIBILITY_PROXY",
        "TEXT_READABILITY",
      ]),
    );
    expect(Array.from(violationCodes)).toEqual(
      expect.arrayContaining([
        "MISSING_METADATA_DESCRIPTION",
        "LOW_RESOLUTION",
        "LOW_SHARPNESS",
        "LOW_VIDEO_RESOLUTION",
        "LOW_AUDIO_LOUDNESS",
        "FORBIDDEN_LEXICON_DETECTED",
      ]),
    );
  });
});
