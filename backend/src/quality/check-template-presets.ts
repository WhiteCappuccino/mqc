import { MediaType } from "@prisma/client";

export interface CheckTemplatePreset {
  id: string;
  appliesTo: MediaType[];
  criteriaCodes: string[];
}

const COMMON_CRITERIA = [
  "TECHNICAL_REQUIREMENTS",
  "METADATA_QUALITY",
  "DUPLICATION",
] as const;

export const CHECK_TEMPLATE_PRESETS: CheckTemplatePreset[] = [
  {
    id: "basic",
    appliesTo: [MediaType.IMAGE, MediaType.VIDEO, MediaType.AUDIO],
    criteriaCodes: [...COMMON_CRITERIA],
  },
  {
    id: "image_quality",
    appliesTo: [MediaType.IMAGE],
    criteriaCodes: [
      ...COMMON_CRITERIA,
      "IMAGE_RESOLUTION",
      "IMAGE_SHARPNESS",
      "IMAGE_NOISE",
      "IMAGE_BRIGHTNESS_CONTRAST",
      "IMAGE_INTEGRITY",
      "IMAGE_FORMAT",
    ],
  },
  {
    id: "video_quality",
    appliesTo: [MediaType.VIDEO],
    criteriaCodes: [
      ...COMMON_CRITERIA,
      "VIDEO_DURATION",
      "VIDEO_RESOLUTION_BITRATE",
      "VIDEO_FRAME_INTEGRITY",
      "VIDEO_BLACK_SCREEN",
    ],
  },
  {
    id: "audio_quality",
    appliesTo: [MediaType.AUDIO],
    criteriaCodes: [
      ...COMMON_CRITERIA,
      "AUDIO_DURATION",
      "AUDIO_LOUDNESS",
      "AUDIO_NOISE",
      "AUDIO_SILENCE",
      "AUDIO_INTELLIGIBILITY_PROXY",
    ],
  },
];
