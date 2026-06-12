import { ViolationSeverity } from "@prisma/client";

export interface QualityCriterionTemplate {
  code: string;
  name: string;
  description: string;
  weight: number;
}

export interface ViolationDictionaryTemplate {
  code: string;
  name: string;
  description: string;
  defaultSeverity: ViolationSeverity;
}

export const QUALITY_CRITERION_TEMPLATES: QualityCriterionTemplate[] = [
  {
    code: "TECHNICAL_REQUIREMENTS",
    name: "Technical file requirements",
    description: "Checks file size, availability, decodability and basic upload policy limits.",
    weight: 1.2,
  },
  {
    code: "METADATA_QUALITY",
    name: "Metadata completeness",
    description: "Checks title, description and file metadata required for publication and search.",
    weight: 1,
  },
  {
    code: "DUPLICATION",
    name: "Duplicate material",
    description: "Checks whether the uploaded file duplicates an existing material checksum.",
    weight: 1.2,
  },
  {
    code: "IMAGE_RESOLUTION",
    name: "Image resolution",
    description: "Requires image resolution of at least 1280x720 pixels.",
    weight: 1.4,
  },
  {
    code: "IMAGE_SHARPNESS",
    name: "Image sharpness",
    description: "Checks blur using a Laplacian variance threshold.",
    weight: 1.1,
  },
  {
    code: "IMAGE_NOISE",
    name: "Image noise",
    description: "Checks whether image noise exceeds the accepted threshold.",
    weight: 0.8,
  },
  {
    code: "IMAGE_BRIGHTNESS_CONTRAST",
    name: "Image brightness and contrast",
    description: "Checks that brightness and contrast stay in readable ranges.",
    weight: 0.9,
  },
  {
    code: "IMAGE_INTEGRITY",
    name: "Image integrity",
    description: "Checks whether the image can be decoded without parsing errors.",
    weight: 1.5,
  },
  {
    code: "IMAGE_FORMAT",
    name: "Image format",
    description: "Checks that detected image format matches the file extension.",
    weight: 0.7,
  },
  {
    code: "VIDEO_DURATION",
    name: "Video duration",
    description: "Requires video duration from 2 seconds to 30 minutes.",
    weight: 1,
  },
  {
    code: "VIDEO_RESOLUTION_BITRATE",
    name: "Video resolution and bitrate",
    description: "Requires video resolution of at least 1280x720 and sufficient estimated bitrate.",
    weight: 1.4,
  },
  {
    code: "VIDEO_FRAME_INTEGRITY",
    name: "Video frame integrity",
    description: "Checks whether video frames can be decoded consistently.",
    weight: 1.4,
  },
  {
    code: "VIDEO_BLACK_SCREEN",
    name: "Video black frames",
    description: "Checks whether sampled video frames contain excessive black screen segments.",
    weight: 1,
  },
  {
    code: "AUDIO_DURATION",
    name: "Audio duration",
    description: "Requires audio duration from 1 second to 60 minutes.",
    weight: 0.9,
  },
  {
    code: "AUDIO_LOUDNESS",
    name: "Audio loudness",
    description: "Checks that measured loudness is not below the accepted dBFS threshold.",
    weight: 1.2,
  },
  {
    code: "AUDIO_NOISE",
    name: "Audio noise",
    description: "Checks noise proxy by zero-crossing rate.",
    weight: 0.9,
  },
  {
    code: "AUDIO_SILENCE",
    name: "Audio silence",
    description: "Checks that silence ratio does not exceed the accepted threshold.",
    weight: 0.9,
  },
  {
    code: "AUDIO_INTELLIGIBILITY_PROXY",
    name: "Audio intelligibility proxy",
    description: "Checks speech intelligibility risk from loudness and silence metrics.",
    weight: 0.8,
  },
];

export const VIOLATION_DICTIONARY_TEMPLATES: ViolationDictionaryTemplate[] = [
  {
    code: "FILE_TOO_LARGE",
    name: "File exceeds size limit",
    description: "File exceeds the 100MB policy limit.",
    defaultSeverity: ViolationSeverity.HIGH,
  },
  {
    code: "SUSPICIOUSLY_SMALL_FILE",
    name: "Suspiciously small file",
    description: "File is unexpectedly small for reliable quality assessment.",
    defaultSeverity: ViolationSeverity.MEDIUM,
  },
  {
    code: "MISSING_METADATA_DESCRIPTION",
    name: "Missing metadata description",
    description: "Description is too short for publication requirements.",
    defaultSeverity: ViolationSeverity.MEDIUM,
  },
  {
    code: "FORBIDDEN_KEYWORDS_DETECTED",
    name: "Forbidden keywords in metadata",
    description: "Title, description or file name contains forbidden keywords.",
    defaultSeverity: ViolationSeverity.CRITICAL,
  },
  {
    code: "DUPLICATE_CONTENT",
    name: "Duplicate content",
    description: "Uploaded material may duplicate an existing file.",
    defaultSeverity: ViolationSeverity.MEDIUM,
  },
  {
    code: "FILE_DOWNLOAD_FAILED",
    name: "File download failed",
    description: "Analyzer could not read source file from the provided URL.",
    defaultSeverity: ViolationSeverity.HIGH,
  },
  {
    code: "UNSUPPORTED_MEDIA_TYPE",
    name: "Unsupported media type",
    description: "Analyzer does not support the provided media type.",
    defaultSeverity: ViolationSeverity.HIGH,
  },
  {
    code: "IMAGE_FILE_UNAVAILABLE",
    name: "Image file unavailable",
    description: "Image bytes are not available to the analyzer.",
    defaultSeverity: ViolationSeverity.HIGH,
  },
  {
    code: "BROKEN_IMAGE",
    name: "Broken image",
    description: "Image cannot be decoded.",
    defaultSeverity: ViolationSeverity.CRITICAL,
  },
  {
    code: "IMAGE_PARSE_ERROR",
    name: "Image parse error",
    description: "Image parsing failed.",
    defaultSeverity: ViolationSeverity.HIGH,
  },
  {
    code: "LOW_RESOLUTION",
    name: "Low image resolution",
    description: "Image resolution is below 1280x720.",
    defaultSeverity: ViolationSeverity.MEDIUM,
  },
  {
    code: "FORMAT_MISMATCH",
    name: "Format mismatch",
    description: "File extension does not match the detected file format.",
    defaultSeverity: ViolationSeverity.MEDIUM,
  },
  {
    code: "LOW_SHARPNESS",
    name: "Low image sharpness",
    description: "Image appears blurry.",
    defaultSeverity: ViolationSeverity.HIGH,
  },
  {
    code: "HIGH_NOISE",
    name: "High image noise",
    description: "Image noise is above the accepted threshold.",
    defaultSeverity: ViolationSeverity.MEDIUM,
  },
  {
    code: "BAD_BRIGHTNESS",
    name: "Bad image brightness",
    description: "Image brightness is out of accepted range.",
    defaultSeverity: ViolationSeverity.MEDIUM,
  },
  {
    code: "LOW_CONTRAST",
    name: "Low image contrast",
    description: "Image contrast is too low.",
    defaultSeverity: ViolationSeverity.MEDIUM,
  },
  {
    code: "VIDEO_FILE_UNAVAILABLE",
    name: "Video file unavailable",
    description: "Video bytes are not available to the analyzer.",
    defaultSeverity: ViolationSeverity.HIGH,
  },
  {
    code: "BROKEN_VIDEO",
    name: "Broken video",
    description: "Video cannot be opened by decoder.",
    defaultSeverity: ViolationSeverity.CRITICAL,
  },
  {
    code: "INVALID_VIDEO_DURATION",
    name: "Invalid video duration",
    description: "Video duration is outside the allowed 2 seconds to 30 minutes range.",
    defaultSeverity: ViolationSeverity.MEDIUM,
  },
  {
    code: "LOW_VIDEO_RESOLUTION",
    name: "Low video resolution",
    description: "Video resolution is below 1280x720.",
    defaultSeverity: ViolationSeverity.MEDIUM,
  },
  {
    code: "LOW_VIDEO_BITRATE",
    name: "Low video bitrate",
    description: "Estimated video bitrate is low.",
    defaultSeverity: ViolationSeverity.MEDIUM,
  },
  {
    code: "BLACK_FRAMES_DETECTED",
    name: "Black frames detected",
    description: "Sampled video contains too many black frames.",
    defaultSeverity: ViolationSeverity.HIGH,
  },
  {
    code: "BLURRY_VIDEO_FRAMES",
    name: "Blurry video frames",
    description: "A high share of sampled video frames is blurry.",
    defaultSeverity: ViolationSeverity.HIGH,
  },
  {
    code: "BROKEN_VIDEO_FRAMES",
    name: "Broken video frames",
    description: "Decoder reports too many broken video frames.",
    defaultSeverity: ViolationSeverity.HIGH,
  },
  {
    code: "AUDIO_FILE_UNAVAILABLE",
    name: "Audio file unavailable",
    description: "Audio bytes are not available to the analyzer.",
    defaultSeverity: ViolationSeverity.HIGH,
  },
  {
    code: "AUDIO_PAYLOAD_TOO_SMALL",
    name: "Audio payload too small",
    description: "Audio file is too small for reliable quality assessment.",
    defaultSeverity: ViolationSeverity.MEDIUM,
  },
  {
    code: "BROKEN_AUDIO",
    name: "Broken audio",
    description: "WAV audio cannot be decoded.",
    defaultSeverity: ViolationSeverity.CRITICAL,
  },
  {
    code: "UNSUPPORTED_AUDIO_FORMAT",
    name: "Unsupported audio format",
    description: "WAV sample width is not supported by the analyzer.",
    defaultSeverity: ViolationSeverity.HIGH,
  },
  {
    code: "INVALID_AUDIO_DURATION",
    name: "Invalid audio duration",
    description: "Audio duration is outside the allowed 1 second to 60 minutes range.",
    defaultSeverity: ViolationSeverity.MEDIUM,
  },
  {
    code: "LOW_AUDIO_LOUDNESS",
    name: "Low audio loudness",
    description: "Audio loudness is too low.",
    defaultSeverity: ViolationSeverity.MEDIUM,
  },
  {
    code: "EXCESSIVE_SILENCE",
    name: "Excessive silence",
    description: "Audio contains too much silence.",
    defaultSeverity: ViolationSeverity.MEDIUM,
  },
  {
    code: "HIGH_AUDIO_NOISE",
    name: "High audio noise",
    description: "Audio noise proxy is too high.",
    defaultSeverity: ViolationSeverity.MEDIUM,
  },
  {
    code: "LOW_SPEECH_INTELLIGIBILITY",
    name: "Low speech intelligibility",
    description: "Speech intelligibility is likely low.",
    defaultSeverity: ViolationSeverity.MEDIUM,
  },
  {
    code: "UNREADABLE_TEXT",
    name: "Unreadable text",
    description: "Analyzer could not extract readable text content.",
    defaultSeverity: ViolationSeverity.HIGH,
  },
  {
    code: "TEXT_TOO_SHORT",
    name: "Text too short",
    description: "Text has fewer than 20 words.",
    defaultSeverity: ViolationSeverity.MEDIUM,
  },
  {
    code: "TEXT_TOO_LONG",
    name: "Text too long",
    description: "Text exceeds size recommendations.",
    defaultSeverity: ViolationSeverity.LOW,
  },
  {
    code: "FORBIDDEN_LEXICON_DETECTED",
    name: "Forbidden lexicon detected",
    description: "Extracted text contains forbidden vocabulary.",
    defaultSeverity: ViolationSeverity.CRITICAL,
  },
  {
    code: "LOW_READABILITY",
    name: "Low text readability",
    description: "Text sentences are too long.",
    defaultSeverity: ViolationSeverity.MEDIUM,
  },
  {
    code: "LOW_UNIQUENESS_PROXY",
    name: "Low text uniqueness proxy",
    description: "Text vocabulary diversity is too low.",
    defaultSeverity: ViolationSeverity.MEDIUM,
  },
  {
    code: "TEMPLATE_MISMATCH",
    name: "Text template mismatch",
    description: "Long text likely does not match expected paragraph structure.",
    defaultSeverity: ViolationSeverity.LOW,
  },
];
