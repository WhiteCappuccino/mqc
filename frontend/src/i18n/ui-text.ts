import type {
  AccessLevel,
  MediaStatus,
  MediaType,
  UserRole,
  ViolationSeverity,
} from "../types/domain";

export type UiLanguage = "en" | "ru";

const mediaTypeLabels: Record<UiLanguage, Record<MediaType, string>> = {
  en: {
    IMAGE: "Image",
    VIDEO: "Video",
    AUDIO: "Audio",
    TEXT: "Text",
    MIXED: "Mixed",
  },
  ru: {
    IMAGE: "Изображение",
    VIDEO: "Видео",
    AUDIO: "Аудио",
    TEXT: "Текст",
    MIXED: "Смешанный",
  },
};

const mediaStatusLabels: Record<UiLanguage, Record<MediaStatus, string>> = {
  en: {
    UPLOADED: "Uploaded",
    IN_PROCESS: "In process",
    AUTO_CHECKED: "Auto checked",
    NEEDS_MANUAL_MODERATION: "Needs moderation",
    ON_REVISION: "On revision",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    PUBLISHED: "Published",
    ARCHIVED: "Archived",
  },
  ru: {
    UPLOADED: "Загружено",
    IN_PROCESS: "В обработке",
    AUTO_CHECKED: "Автопроверено",
    NEEDS_MANUAL_MODERATION: "Нужна модерация",
    ON_REVISION: "На доработке",
    APPROVED: "Одобрено",
    REJECTED: "Отклонено",
    PUBLISHED: "Опубликовано",
    ARCHIVED: "В архиве",
  },
};

const severityLabels: Record<UiLanguage, Record<ViolationSeverity, string>> = {
  en: {
    LOW: "Low",
    MEDIUM: "Medium",
    HIGH: "High",
    CRITICAL: "Critical",
  },
  ru: {
    LOW: "Низкая",
    MEDIUM: "Средняя",
    HIGH: "Высокая",
    CRITICAL: "Критическая",
  },
};

const roleLabels: Record<UiLanguage, Record<UserRole, string>> = {
  en: {
    USER: "User",
    MODERATOR: "Moderator",
    ADMIN: "Admin",
  },
  ru: {
    USER: "Пользователь",
    MODERATOR: "Модератор",
    ADMIN: "Администратор",
  },
};

const accessLabels: Record<UiLanguage, Record<AccessLevel, string>> = {
  en: {
    VIEW: "View",
    COMMENT: "Comment",
    EDIT: "Edit",
    MODERATE: "Moderate",
    MANAGE: "Manage",
  },
  ru: {
    VIEW: "Просмотр",
    COMMENT: "Комментарии",
    EDIT: "Редактирование",
    MODERATE: "Модерация",
    MANAGE: "Управление",
  },
};

const checkStatusLabels: Record<
  UiLanguage,
  Record<"QUEUED" | "RUNNING" | "COMPLETED" | "NEEDS_MANUAL_REVIEW", string>
> = {
  en: {
    QUEUED: "Queued",
    RUNNING: "Running",
    COMPLETED: "Completed",
    NEEDS_MANUAL_REVIEW: "Needs manual review",
  },
  ru: {
    QUEUED: "В очереди",
    RUNNING: "Выполняется",
    COMPLETED: "Завершено",
    NEEDS_MANUAL_REVIEW: "Нужно ручное ревью",
  },
};

const moderationStatusLabels: Record<
  UiLanguage,
  Record<"APPROVED" | "REJECTED" | "NEEDS_REVISION", string>
> = {
  en: {
    APPROVED: "Approved",
    REJECTED: "Rejected",
    NEEDS_REVISION: "Needs revision",
  },
  ru: {
    APPROVED: "Одобрено",
    REJECTED: "Отклонено",
    NEEDS_REVISION: "Нужна доработка",
  },
};

const notificationChannelLabels: Record<UiLanguage, Record<"IN_APP" | "EMAIL", string>> = {
  en: {
    IN_APP: "In app",
    EMAIL: "Email",
  },
  ru: {
    IN_APP: "В приложении",
    EMAIL: "Почта",
  },
};

const violationLabels = {
  FILE_DOWNLOAD_FAILED: {
    en: "File download failed",
    ru: "Не удалось скачать файл",
  },
  UNSUPPORTED_MEDIA_TYPE: {
    en: "Unsupported media type",
    ru: "Неподдерживаемый тип медиа",
  },
  FILE_TOO_LARGE: {
    en: "File too large",
    ru: "Слишком большой файл",
  },
  SUSPICIOUSLY_SMALL_FILE: {
    en: "Suspiciously small file",
    ru: "Подозрительно маленький файл",
  },
  MISSING_METADATA_DESCRIPTION: {
    en: "Missing description metadata",
    ru: "Отсутствует описание в метаданных",
  },
  FORBIDDEN_KEYWORDS_DETECTED: {
    en: "Forbidden keywords detected",
    ru: "Обнаружены запрещенные ключевые слова",
  },
  DUPLICATE_CONTENT: {
    en: "Duplicate content",
    ru: "Дублирующийся контент",
  },
  IMAGE_FILE_UNAVAILABLE: {
    en: "Image file unavailable",
    ru: "Файл изображения недоступен",
  },
  BROKEN_IMAGE: {
    en: "Broken image",
    ru: "Поврежденное изображение",
  },
  IMAGE_PARSE_ERROR: {
    en: "Image parse error",
    ru: "Ошибка чтения изображения",
  },
  LOW_RESOLUTION: {
    en: "Low resolution",
    ru: "Низкое разрешение",
  },
  FORMAT_MISMATCH: {
    en: "Format mismatch",
    ru: "Несоответствие формата",
  },
  LOW_SHARPNESS: {
    en: "Low sharpness",
    ru: "Низкая резкость",
  },
  HIGH_NOISE: {
    en: "High noise",
    ru: "Высокий шум",
  },
  BAD_BRIGHTNESS: {
    en: "Bad brightness",
    ru: "Некорректная яркость",
  },
  LOW_CONTRAST: {
    en: "Low contrast",
    ru: "Низкий контраст",
  },
  VIDEO_FILE_UNAVAILABLE: {
    en: "Video file unavailable",
    ru: "Видеофайл недоступен",
  },
  BROKEN_VIDEO: {
    en: "Broken video",
    ru: "Поврежденное видео",
  },
  INVALID_VIDEO_DURATION: {
    en: "Invalid video duration",
    ru: "Некорректная длительность видео",
  },
  LOW_VIDEO_RESOLUTION: {
    en: "Low video resolution",
    ru: "Низкое разрешение видео",
  },
  LOW_VIDEO_BITRATE: {
    en: "Low video bitrate",
    ru: "Низкий битрейт видео",
  },
  BLACK_FRAMES_DETECTED: {
    en: "Black frames detected",
    ru: "Обнаружены черные кадры",
  },
  BLURRY_VIDEO_FRAMES: {
    en: "Blurry video frames",
    ru: "Размытые кадры видео",
  },
  BROKEN_VIDEO_FRAMES: {
    en: "Broken video frames",
    ru: "Поврежденные кадры видео",
  },
  AUDIO_FILE_UNAVAILABLE: {
    en: "Audio file unavailable",
    ru: "Аудиофайл недоступен",
  },
  AUDIO_PAYLOAD_TOO_SMALL: {
    en: "Audio payload too small",
    ru: "Слишком маленький аудиофайл",
  },
  BROKEN_AUDIO: {
    en: "Broken audio",
    ru: "Поврежденное аудио",
  },
  UNSUPPORTED_AUDIO_FORMAT: {
    en: "Unsupported audio format",
    ru: "Неподдерживаемый аудиоформат",
  },
  INVALID_AUDIO_DURATION: {
    en: "Invalid audio duration",
    ru: "Некорректная длительность аудио",
  },
  LOW_AUDIO_LOUDNESS: {
    en: "Low audio loudness",
    ru: "Низкая громкость аудио",
  },
  EXCESSIVE_SILENCE: {
    en: "Excessive silence",
    ru: "Слишком много тишины",
  },
  HIGH_AUDIO_NOISE: {
    en: "High audio noise",
    ru: "Высокий уровень шума в аудио",
  },
  LOW_SPEECH_INTELLIGIBILITY: {
    en: "Low speech intelligibility",
    ru: "Низкая разборчивость речи",
  },
  UNREADABLE_TEXT: {
    en: "Unreadable text",
    ru: "Нечитаемый текст",
  },
  TEXT_TOO_SHORT: {
    en: "Text too short",
    ru: "Слишком короткий текст",
  },
  TEXT_TOO_LONG: {
    en: "Text too long",
    ru: "Слишком длинный текст",
  },
  FORBIDDEN_LEXICON_DETECTED: {
    en: "Forbidden lexicon detected",
    ru: "Обнаружена запрещенная лексика",
  },
  LOW_READABILITY: {
    en: "Low readability",
    ru: "Низкая читаемость",
  },
  LOW_UNIQUENESS_PROXY: {
    en: "Low uniqueness",
    ru: "Низкая уникальность",
  },
  TEMPLATE_MISMATCH: {
    en: "Template mismatch",
    ru: "Несоответствие шаблону",
  },
} as const;

const violationDescriptions = {
  FILE_DOWNLOAD_FAILED: {
    en: "The file could not be downloaded from the source URL.",
    ru: "Файл не удалось скачать по указанному адресу.",
  },
  UNSUPPORTED_MEDIA_TYPE: {
    en: "The uploaded object has an unsupported media type.",
    ru: "У загруженного объекта неподдерживаемый тип медиа.",
  },
  FILE_TOO_LARGE: {
    en: "The file exceeds the allowed size limits.",
    ru: "Размер файла превышает допустимые ограничения.",
  },
  SUSPICIOUSLY_SMALL_FILE: {
    en: "The file is unusually small and may be incomplete.",
    ru: "Файл слишком маленький и может быть неполным.",
  },
  MISSING_METADATA_DESCRIPTION: {
    en: "Description metadata is missing or empty.",
    ru: "Описание в метаданных отсутствует или пустое.",
  },
  FORBIDDEN_KEYWORDS_DETECTED: {
    en: "Forbidden keywords were found in the content or metadata.",
    ru: "В контенте или метаданных найдены запрещенные слова.",
  },
  DUPLICATE_CONTENT: {
    en: "The system detected duplicate or near-duplicate content.",
    ru: "Система обнаружила дублирующийся или почти дублирующийся контент.",
  },
  IMAGE_FILE_UNAVAILABLE: {
    en: "The image file is unavailable for analysis.",
    ru: "Файл изображения недоступен для анализа.",
  },
  BROKEN_IMAGE: {
    en: "The image appears corrupted or unreadable.",
    ru: "Изображение повреждено или не читается.",
  },
  IMAGE_PARSE_ERROR: {
    en: "The image could not be parsed correctly.",
    ru: "Не удалось корректно прочитать изображение.",
  },
  LOW_RESOLUTION: {
    en: "The image resolution is below the required threshold.",
    ru: "Разрешение изображения ниже требуемого порога.",
  },
  FORMAT_MISMATCH: {
    en: "The actual file format does not match the expected one.",
    ru: "Фактический формат файла не совпадает с ожидаемым.",
  },
  LOW_SHARPNESS: {
    en: "The image is not sharp enough.",
    ru: "Изображение недостаточно резкое.",
  },
  HIGH_NOISE: {
    en: "The image contains too much noise.",
    ru: "На изображении слишком много шума.",
  },
  BAD_BRIGHTNESS: {
    en: "The brightness level is outside acceptable bounds.",
    ru: "Яркость выходит за допустимые пределы.",
  },
  LOW_CONTRAST: {
    en: "The contrast is too low for reliable usage.",
    ru: "Контраст слишком низкий для надежного использования.",
  },
  VIDEO_FILE_UNAVAILABLE: {
    en: "The video file is unavailable for analysis.",
    ru: "Видеофайл недоступен для анализа.",
  },
  BROKEN_VIDEO: {
    en: "The video appears corrupted or unreadable.",
    ru: "Видео повреждено или не читается.",
  },
  INVALID_VIDEO_DURATION: {
    en: "The video duration is outside expected limits.",
    ru: "Длительность видео выходит за ожидаемые пределы.",
  },
  LOW_VIDEO_RESOLUTION: {
    en: "The video resolution is below the required threshold.",
    ru: "Разрешение видео ниже требуемого порога.",
  },
  LOW_VIDEO_BITRATE: {
    en: "The video bitrate is too low.",
    ru: "Битрейт видео слишком низкий.",
  },
  BLACK_FRAMES_DETECTED: {
    en: "Black frames were detected in the video.",
    ru: "В видео обнаружены черные кадры.",
  },
  BLURRY_VIDEO_FRAMES: {
    en: "The video contains blurry frames.",
    ru: "В видео присутствуют размытые кадры.",
  },
  BROKEN_VIDEO_FRAMES: {
    en: "Some video frames appear corrupted.",
    ru: "Некоторые видеокадры выглядят поврежденными.",
  },
  AUDIO_FILE_UNAVAILABLE: {
    en: "The audio file is unavailable for analysis.",
    ru: "Аудиофайл недоступен для анализа.",
  },
  AUDIO_PAYLOAD_TOO_SMALL: {
    en: "The audio payload is too small for a reliable check.",
    ru: "Аудиофайл слишком мал для надежной проверки.",
  },
  BROKEN_AUDIO: {
    en: "The audio appears corrupted or unreadable.",
    ru: "Аудио повреждено или не читается.",
  },
  UNSUPPORTED_AUDIO_FORMAT: {
    en: "The audio format is not supported.",
    ru: "Формат аудио не поддерживается.",
  },
  INVALID_AUDIO_DURATION: {
    en: "The audio duration is outside expected limits.",
    ru: "Длительность аудио выходит за ожидаемые пределы.",
  },
  LOW_AUDIO_LOUDNESS: {
    en: "The overall loudness is too low.",
    ru: "Общая громкость слишком низкая.",
  },
  EXCESSIVE_SILENCE: {
    en: "The audio contains too much silence.",
    ru: "В аудио слишком много тишины.",
  },
  HIGH_AUDIO_NOISE: {
    en: "The audio contains too much noise.",
    ru: "В аудио слишком высокий уровень шума.",
  },
  LOW_SPEECH_INTELLIGIBILITY: {
    en: "Speech intelligibility is too low.",
    ru: "Разборчивость речи слишком низкая.",
  },
  UNREADABLE_TEXT: {
    en: "The text content is unreadable.",
    ru: "Текстовый контент невозможно прочитать.",
  },
  TEXT_TOO_SHORT: {
    en: "The text is shorter than required.",
    ru: "Текст короче допустимого минимума.",
  },
  TEXT_TOO_LONG: {
    en: "The text is longer than expected.",
    ru: "Текст длиннее ожидаемого.",
  },
  FORBIDDEN_LEXICON_DETECTED: {
    en: "Forbidden vocabulary was detected in the text.",
    ru: "В тексте обнаружена запрещенная лексика.",
  },
  LOW_READABILITY: {
    en: "The text has low readability.",
    ru: "У текста низкая читаемость.",
  },
  LOW_UNIQUENESS_PROXY: {
    en: "The text appears insufficiently unique.",
    ru: "Текст выглядит недостаточно уникальным.",
  },
  TEMPLATE_MISMATCH: {
    en: "The text does not match the expected template.",
    ru: "Текст не соответствует ожидаемому шаблону.",
  },
} as const;

const errorDictionary = {
  en: {
    invalidCredentials: "Incorrect email or password",
    invalidEmail: "Incorrect email",
    wrongPassword: "Incorrect password",
    invalidCurrentPassword: "Current password is incorrect",
    invalidResetToken: "Invalid reset token",
    invalidVerificationToken: "Invalid verification token",
    invalidToken: "Invalid token",
    userExists: "A user with this email already exists",
    usernameTaken: "This username is already taken",
    tooManyAttempts: "Too many failed attempts. Try again later",
    notFound: "Requested object does not exist",
    mediaNotFound: "Media file not found",
    userNotFound: "User not found",
    collectionNotFound: "Collection not found",
    violationNotFound: "Violation not found",
    commentNotFound: "Comment not found",
    parentCommentNotFound: "Parent comment not found",
    qualityCheckNotFound: "Quality check not found",
    accessDenied: "Access denied",
    ownerOnly: "Only the owner can perform this action",
    moderatorRequired: "Moderator access required",
    insufficientRole: "Insufficient access rights",
    fileRequired: "Choose a file or provide a URL",
    fileDownloadFailed: "Could not download the file from the URL",
    emptyFile: "The downloaded file is empty",
    commentTargetRequired: "Comment target is missing",
    invalidCommentTarget: "Comment target is invalid",
    analyzerUnavailable: "Analyzer service is unavailable",
    uploadFailed: "Could not upload the file",
    reportFormat: "Invalid report format",
    unexpected: "Something went wrong. Try again later",
  },
  ru: {
    invalidCredentials: "Неправильный email или пароль",
    invalidEmail: "Неправильный email",
    wrongPassword: "Неправильный пароль",
    invalidCurrentPassword: "Текущий пароль введен неверно",
    invalidResetToken: "Неверный токен сброса",
    invalidVerificationToken: "Неверный токен подтверждения",
    invalidToken: "Неверный токен",
    userExists: "Пользователь с таким email уже существует",
    usernameTaken: "Это имя пользователя уже занято",
    tooManyAttempts: "Слишком много неудачных попыток. Попробуйте позже",
    notFound: "Такого объекта не существует",
    mediaNotFound: "Медиафайл не найден",
    userNotFound: "Пользователь не найден",
    collectionNotFound: "Коллекция не найдена",
    violationNotFound: "Нарушение не найдено",
    commentNotFound: "Комментарий не найден",
    parentCommentNotFound: "Родительский комментарий не найден",
    qualityCheckNotFound: "Проверка качества не найдена",
    accessDenied: "Доступ запрещен",
    ownerOnly: "Это действие доступно только владельцу",
    moderatorRequired: "Нужны права модератора",
    insufficientRole: "Недостаточно прав доступа",
    fileRequired: "Выберите файл или укажите URL",
    fileDownloadFailed: "Не удалось скачать файл по указанному URL",
    emptyFile: "Загруженный по URL файл оказался пустым",
    commentTargetRequired: "Не указана цель комментария",
    invalidCommentTarget: "Некорректная цель комментария",
    analyzerUnavailable: "Сервис анализа недоступен",
    uploadFailed: "Не удалось загрузить файл",
    reportFormat: "Неверный формат отчета",
    unexpected: "Что-то пошло не так. Попробуйте позже",
  },
} as const;

export function formatMediaType(value: MediaType, language: UiLanguage) {
  return mediaTypeLabels[language][value];
}

export function formatMediaStatus(value: MediaStatus, language: UiLanguage) {
  return mediaStatusLabels[language][value];
}

export function formatSeverity(value: ViolationSeverity, language: UiLanguage) {
  return severityLabels[language][value];
}

export function formatRole(value: UserRole, language: UiLanguage) {
  return roleLabels[language][value];
}

export function formatAccessLevel(value: AccessLevel, language: UiLanguage) {
  return accessLabels[language][value];
}

export function formatCheckStatus(
  value: "QUEUED" | "RUNNING" | "COMPLETED" | "NEEDS_MANUAL_REVIEW",
  language: UiLanguage,
) {
  return checkStatusLabels[language][value];
}

export function formatModerationStatus(
  value: "APPROVED" | "REJECTED" | "NEEDS_REVISION",
  language: UiLanguage,
) {
  return moderationStatusLabels[language][value];
}

export function formatNotificationChannel(value: "IN_APP" | "EMAIL", language: UiLanguage) {
  return notificationChannelLabels[language][value];
}

export function formatNotificationTitle(
  type: string,
  title: string,
  language: UiLanguage,
) {
  if (language === "en") return title;

  const byType: Record<string, string> = {
    MODERATION_ASSIGNED: "Новая задача модерации",
    REVISION_REQUIRED: "Требуется доработка материала",
    STATUS_CHANGED: "Статус материала изменен",
    AUTO_CHECK_FINISHED: "Автопроверка завершена",
    COLLAB_INVITE: "Доступ открыт",
    NEW_COMMENT: "Новый комментарий",
  };

  const byTitle: Record<string, string> = {
    "New moderation task": "Новая задача модерации",
    "Material status changed": "Статус материала изменен",
    "Automatic check finished": "Автопроверка завершена",
    "Shared media access": "Доступ к медиа открыт",
    "Collection access granted": "Доступ к коллекции открыт",
    "New comment on your media": "Новый комментарий к вашему медиа",
    "Reply to your comment": "Ответ на ваш комментарий",
    "Email verification required": "Требуется подтверждение email",
    "Password reset requested": "Запрошен сброс пароля",
    "Media was removed by administrator": "Медиа удалено администратором",
  };

  return byType[type] ?? byTitle[title] ?? title;
}

export function formatNotificationMessage(
  message: string,
  language: UiLanguage,
) {
  if (language === "en") return message;

  let match = message.match(/^Material "(.+)" \((.+)\) requires moderation\.$/);
  if (match) {
    return `Материал "${match[1]}" (${match[2]}) требует модерации.`;
  }

  match = message.match(/^Material "(.+)" now has status: ([A-Z_]+)\.$/);
  if (match) {
    return `Материал "${match[1]}" теперь имеет статус: ${formatMediaStatus(match[2] as MediaStatus, language)}.`;
  }

  match = message.match(/^Automatic check for "(.+)" is completed\. Score: ([\d.]+)\.$/);
  if (match) {
    return `Автопроверка для "${match[1]}" завершена. Оценка: ${match[2]}.`;
  }

  match = message.match(/^You were granted ([A-Z_]+) access to "(.+)"$/);
  if (match) {
    return `Вам выдан уровень доступа "${formatAccessLevel(match[1] as AccessLevel, language)}" к "${match[2]}".`;
  }

  match = message.match(/^You were invited to collection "(.+)" with ([A-Z_]+) access\.$/);
  if (match) {
    return `Вас пригласили в коллекцию "${match[1]}" с уровнем доступа "${formatAccessLevel(match[2] as AccessLevel, language)}".`;
  }

  match = message.match(/^A new comment was added to "(.+)"\.$/);
  if (match) {
    return `К материалу "${match[1]}" добавлен новый комментарий.`;
  }

  match = message.match(/^Your comment received a reply in media "(.+)"\.$/);
  if (match) {
    return `На ваш комментарий ответили в материале "${match[1]}".`;
  }

  match = message.match(/^Verify your email to activate all features: (.+)$/);
  if (match) {
    return `Подтвердите email, чтобы активировать все возможности: ${match[1]}`;
  }

  match = message.match(/^Use this link to reset password: (.+)$/);
  if (match) {
    return `Используйте эту ссылку для сброса пароля: ${match[1]}`;
  }

  match = message.match(/^Material "(.+)" was deleted by administrator action\.$/);
  if (match) {
    return `Материал "${match[1]}" был удален администратором.`;
  }

  return message;
}

export function formatViolationCode(value: string, language: UiLanguage) {
  const normalized = value.trim().toUpperCase();
  const direct = violationLabels[normalized as keyof typeof violationLabels];
  if (direct) {
    return direct[language];
  }
  if (language === "ru") {
    return normalized
      .toLowerCase()
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
  return normalized
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatViolationDescription(
  code: string,
  description: string | undefined,
  language: UiLanguage,
) {
  const normalized = code.trim().toUpperCase();
  const localized = violationDescriptions[normalized as keyof typeof violationDescriptions];
  if (localized) {
    return localized[language];
  }
  return description || formatViolationCode(code, language);
}

export function normalizeAppError(
  error: unknown,
  language: UiLanguage,
  fallback?: string,
) {
  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : "";

  const lower = message.toLowerCase();
  const d = errorDictionary[language];

  if (!message) return fallback ?? d.unexpected;
  if (lower.includes("invalid credentials")) return d.invalidCredentials;
  if (lower.includes("invalid current password")) return d.invalidCurrentPassword;
  if (lower.includes("invalid reset token")) return d.invalidResetToken;
  if (lower.includes("invalid verification token")) return d.invalidVerificationToken;
  if (lower.includes("invalid token")) return d.invalidToken;
  if (lower.includes("user with this email already exists")) return d.userExists;
  if (lower.includes("username is already taken")) return d.usernameTaken;
  if (lower.includes("too many failed attempts")) return d.tooManyAttempts;
  if (lower.includes("media not found")) return d.mediaNotFound;
  if (lower.includes("collection not found")) return d.collectionNotFound;
  if (lower.includes("user not found")) return d.userNotFound;
  if (lower.includes("violation not found")) return d.violationNotFound;
  if (lower.includes("comment not found")) return d.commentNotFound;
  if (lower.includes("parent comment not found")) return d.parentCommentNotFound;
  if (lower.includes("quality check not found")) return d.qualityCheckNotFound;
  if (lower.includes("not found")) return d.notFound;
  if (lower.includes("only owner can manage access")) return d.ownerOnly;
  if (lower.includes("only owner can manage collection")) return d.ownerOnly;
  if (lower.includes("access denied")) return d.accessDenied;
  if (lower.includes("edit access denied")) return d.accessDenied;
  if (lower.includes("no access to selected media")) return d.accessDenied;
  if (lower.includes("moderator role required")) return d.moderatorRequired;
  if (lower.includes("insufficient role privileges")) return d.insufficientRole;
  if (lower.includes("either file or fileurl is required")) return d.fileRequired;
  if (lower.includes("choose new file or provide url")) return d.fileRequired;
  if (lower.includes("could not download file from provided url")) return d.fileDownloadFailed;
  if (lower.includes("downloaded file is empty")) return d.emptyFile;
  if (lower.includes("comment target is required")) return d.commentTargetRequired;
  if (lower.includes("comment is not linked to a media item")) return d.invalidCommentTarget;
  if (lower.includes("analyzer service unavailable")) return d.analyzerUnavailable;
  if (lower.includes("failed to upload media")) return d.uploadFailed;
  if (lower.includes("format must be csv")) return d.reportFormat;
  if (lower.includes("invalid email")) return d.invalidEmail;
  if (lower.includes("wrong password")) return d.wrongPassword;
  if (lower.includes("incorrect password")) return d.wrongPassword;

  return fallback ?? (message || d.unexpected);
}
