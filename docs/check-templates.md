# Check Templates

Шаблоны проверок хранятся в backend как `QualityRule`:

- `CRITERION` - требование или группа проверок, которые прикладываются к автоматической проверке.
- `VIOLATION` - словарь нарушений, по которому analyzer-коды получают название, описание и критичность.

Источник шаблонов: `backend/src/quality/quality-rule-templates.ts`.

## Общие Требования

- `TECHNICAL_REQUIREMENTS` - размер файла, доступность, декодируемость, базовые ограничения загрузки.
- `METADATA_QUALITY` - заполненность названия, описания и файловых метаданных.
- `PUBLICATION_RULES` - запрещенные слова и признаки нарушения правил публикации.
- `DUPLICATION` - возможный дубликат уже загруженного материала.

## Изображения

- `IMAGE_RESOLUTION` - минимальное разрешение 1280x720.
- `IMAGE_SHARPNESS` - проверка размытия.
- `IMAGE_NOISE` - уровень шума.
- `IMAGE_BRIGHTNESS_CONTRAST` - яркость и контраст.
- `IMAGE_INTEGRITY` - декодирование и целостность файла.
- `IMAGE_FORMAT` - соответствие расширения реальному формату.

## Видео

- `VIDEO_DURATION` - длительность от 2 секунд до 30 минут.
- `VIDEO_RESOLUTION_BITRATE` - разрешение от 1280x720 и достаточный bitrate.
- `VIDEO_FRAME_INTEGRITY` - декодируемость кадров.
- `VIDEO_SHARPNESS` - доля размытых кадров.
- `VIDEO_BLACK_SCREEN` - доля черных кадров.

## Аудио

- `AUDIO_DURATION` - длительность от 1 секунды до 60 минут.
- `AUDIO_LOUDNESS` - достаточная громкость.
- `AUDIO_NOISE` - шум по proxy-метрике.
- `AUDIO_SILENCE` - доля тишины.
- `AUDIO_INTELLIGIBILITY_PROXY` - риск плохой разборчивости речи.

## Текст

- `TEXT_SPELLING_PROXY` - извлекаемость и базовая структура текста.
- `TEXT_FORBIDDEN_LEXICON` - запрещенная лексика.
- `TEXT_LENGTH` - длина от 20 до 10000 слов.
- `TEXT_TEMPLATE` - ожидаемая абзацная структура.
- `TEXT_READABILITY` - длина предложений и словарное разнообразие.

## Словарь Нарушений

Словарь покрывает коды, которые возвращает analyzer:

- Общие: `FILE_TOO_LARGE`, `SUSPICIOUSLY_SMALL_FILE`, `MISSING_METADATA_DESCRIPTION`, `FORBIDDEN_KEYWORDS_DETECTED`, `DUPLICATE_CONTENT`, `FILE_DOWNLOAD_FAILED`, `UNSUPPORTED_MEDIA_TYPE`.
- Изображения: `IMAGE_FILE_UNAVAILABLE`, `BROKEN_IMAGE`, `IMAGE_PARSE_ERROR`, `LOW_RESOLUTION`, `FORMAT_MISMATCH`, `LOW_SHARPNESS`, `HIGH_NOISE`, `BAD_BRIGHTNESS`, `LOW_CONTRAST`.
- Видео: `VIDEO_FILE_UNAVAILABLE`, `BROKEN_VIDEO`, `INVALID_VIDEO_DURATION`, `LOW_VIDEO_RESOLUTION`, `LOW_VIDEO_BITRATE`, `BLACK_FRAMES_DETECTED`, `BLURRY_VIDEO_FRAMES`, `BROKEN_VIDEO_FRAMES`.
- Аудио: `AUDIO_FILE_UNAVAILABLE`, `AUDIO_PAYLOAD_TOO_SMALL`, `BROKEN_AUDIO`, `UNSUPPORTED_AUDIO_FORMAT`, `INVALID_AUDIO_DURATION`, `LOW_AUDIO_LOUDNESS`, `EXCESSIVE_SILENCE`, `HIGH_AUDIO_NOISE`, `LOW_SPEECH_INTELLIGIBILITY`.
- Текст: `UNREADABLE_TEXT`, `TEXT_TOO_SHORT`, `TEXT_TOO_LONG`, `FORBIDDEN_LEXICON_DETECTED`, `LOW_READABILITY`, `LOW_UNIQUENESS_PROXY`, `TEMPLATE_MISMATCH`.

## Инициализация

Шаблоны создаются двумя путями:

- при старте backend через `UsersService.ensureDefaultData()`;
- при ручном seed через `npm run prisma:seed`.

Повторный запуск не создает дубли: записи обновляются по уникальному `code`.
