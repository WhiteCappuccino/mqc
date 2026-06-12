from __future__ import annotations

import io
import json
import math
import re
import statistics
import subprocess
import tempfile
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any

import cv2
import httpx
import numpy as np
from docx import Document
from fastapi import FastAPI
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, Field
from pypdf import PdfReader


class Recommendation(str, Enum):
    approved = "approved"
    manual_review = "manual_review"
    reject = "reject"


class AnalyzeRequest(BaseModel):
    mediaType: str
    title: str = Field(min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=500)
    mimeType: str
    sizeBytes: int = Field(gt=0)
    fileName: str = Field(min_length=1, max_length=255)
    fileUrl: str | None = None
    duplicateHint: bool = False


class AnalyzeResponse(BaseModel):
    score: float
    violations: list[str]
    recommendation: Recommendation
    details: dict[str, Any]


app = FastAPI(title="Media Analyzer Service", version="2.0.0")

_FORBIDDEN_WORDS = {
    "banned",
    "prohibited",
    "explicit",
    "forbidden",
    "запрещено",
    "экстремизм",
    "насилие",
}


@app.get("/health")
def health() -> dict[str, str]:
    return {"ok": "true", "service": "analyzer", "timestamp": _timestamp()}


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(payload: AnalyzeRequest) -> AnalyzeResponse:
    violations: list[str] = []
    details: dict[str, Any] = {
        "mediaType": payload.mediaType,
        "mimeType": payload.mimeType,
        "sizeBytes": payload.sizeBytes,
        "fileName": payload.fileName,
        "duplicateHint": payload.duplicateHint,
        "checkedCriteria": [],
        "evaluatedAt": _timestamp(),
    }
    score = 1.0

    score = _run_common_checks(payload, violations, details, score)

    file_bytes = _fetch_file_bytes(payload.fileUrl) if payload.fileUrl else None
    if payload.fileUrl and file_bytes is None:
        score = _add_violation(
            "file_download_failed", 0.15, violations, details, score, "Could not read source file"
        )

    media_type = payload.mediaType.upper()
    if media_type == "IMAGE":
        score = _run_image_checks(payload, file_bytes, violations, details, score)
    elif media_type == "VIDEO":
        score = _run_video_checks(payload, file_bytes, violations, details, score)
    elif media_type == "AUDIO":
        score = _run_audio_checks(payload, file_bytes, violations, details, score)
    elif media_type == "TEXT":
        score = _run_text_checks(payload, file_bytes, violations, details, score)
    else:
        score = _add_violation(
            "unsupported_media_type",
            0.2,
            violations,
            details,
            score,
            f"Unsupported media type: {payload.mediaType}",
        )

    score = max(0.0, min(1.0, round(score, 3)))

    if score >= 0.85 and not violations:
        recommendation = Recommendation.approved
    elif score >= 0.6:
        recommendation = Recommendation.manual_review
    else:
        recommendation = Recommendation.reject

    return AnalyzeResponse(
        score=score,
        violations=violations,
        recommendation=recommendation,
        details=details,
    )


def _run_common_checks(
    payload: AnalyzeRequest, violations: list[str], details: dict[str, Any], score: float
) -> float:
    details["checkedCriteria"].extend(
        [
            "technical_requirements",
            "metadata_quality",
            "publication_rules",
            "duplication",
        ]
    )

    if payload.sizeBytes > 100 * 1024 * 1024:
        score = _add_violation(
            "file_too_large",
            0.25,
            violations,
            details,
            score,
            "File exceeds 100MB policy limit",
        )
    if payload.sizeBytes < 1024:
        score = _add_violation(
            "suspiciously_small_file",
            0.2,
            violations,
            details,
            score,
            "File is unexpectedly small",
        )

    description = (payload.description or "").strip()
    if len(description) < 10:
        score = _add_violation(
            "missing_metadata_description",
            0.12,
            violations,
            details,
            score,
            "Description is too short",
        )

    text_for_policy = f"{payload.title} {description} {payload.fileName}".casefold()
    if any(word in text_for_policy for word in _FORBIDDEN_WORDS):
        score = _add_violation(
            "forbidden_keywords_detected",
            0.3,
            violations,
            details,
            score,
            "Title/description contains forbidden keywords",
        )

    if payload.duplicateHint:
        score = _add_violation(
            "duplicate_content",
            0.2,
            violations,
            details,
            score,
            "Possible duplicate of existing media",
        )

    return score


def _run_image_checks(
    payload: AnalyzeRequest,
    file_bytes: bytes | None,
    violations: list[str],
    details: dict[str, Any],
    score: float,
) -> float:
    details["checkedCriteria"].extend(
        [
            "image_resolution",
            "image_sharpness",
            "image_noise",
            "image_brightness_contrast",
            "image_integrity",
            "image_format",
        ]
    )

    if not file_bytes:
        return _add_violation(
            "image_file_unavailable", 0.2, violations, details, score, "Image bytes are not available"
        )

    try:
        image = Image.open(io.BytesIO(file_bytes))
        image.verify()
        image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    except UnidentifiedImageError:
        return _add_violation("broken_image", 0.4, violations, details, score, "Image cannot be decoded")
    except Exception:
        return _add_violation("image_parse_error", 0.3, violations, details, score, "Image parsing failed")

    width, height = image.size
    details["imageResolution"] = {"width": width, "height": height}
    if width < 1280 or height < 720:
        score = _add_violation("low_resolution", 0.2, violations, details, score, "Resolution is below 1280x720")

    ext = Path(payload.fileName).suffix.replace(".", "").lower()
    expected_formats = {"jpg": "jpeg", "jpeg": "jpeg", "png": "png", "webp": "webp"}
    image_format = (image.format or "").lower()
    details["imageFormat"] = image_format
    if ext in expected_formats and image_format and expected_formats[ext] != image_format:
        score = _add_violation(
            "format_mismatch",
            0.1,
            violations,
            details,
            score,
            f"File extension {ext} mismatches detected format {image_format}",
        )

    frame = np.array(image)
    gray = cv2.cvtColor(frame, cv2.COLOR_RGB2GRAY)
    brightness = float(gray.mean())
    contrast = float(gray.std())
    laplacian = cv2.Laplacian(gray, cv2.CV_64F).var()
    denoised = cv2.GaussianBlur(gray, (3, 3), 0)
    noise_level = float(np.std(gray.astype(np.int16) - denoised.astype(np.int16)))

    details["imageMetrics"] = {
        "brightness": round(brightness, 2),
        "contrast": round(contrast, 2),
        "sharpness": round(float(laplacian), 2),
        "noiseLevel": round(noise_level, 2),
    }

    if laplacian < 80:
        score = _add_violation("low_sharpness", 0.15, violations, details, score, "Image appears blurry")
    if noise_level > 35:
        score = _add_violation("high_noise", 0.1, violations, details, score, "Image noise is high")
    if brightness < 35 or brightness > 220:
        score = _add_violation("bad_brightness", 0.08, violations, details, score, "Brightness is out of range")
    if contrast < 20:
        score = _add_violation("low_contrast", 0.08, violations, details, score, "Contrast is too low")

    return score


def _run_video_checks(
    payload: AnalyzeRequest,
    file_bytes: bytes | None,
    violations: list[str],
    details: dict[str, Any],
    score: float,
) -> float:
    details["checkedCriteria"].extend(
        [
            "video_duration",
            "video_resolution_bitrate",
            "video_frame_integrity",
            "video_sharpness",
            "video_black_screen",
        ]
    )

    if not file_bytes:
        return _add_violation(
            "video_file_unavailable", 0.2, violations, details, score, "Video bytes are not available"
        )

    suffix = Path(payload.fileName).suffix or ".mp4"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=True) as temp_file:
        temp_file.write(file_bytes)
        temp_file.flush()
        capture = cv2.VideoCapture(temp_file.name)
        ffprobe_info = _probe_video_streams(temp_file.name)

        if not capture.isOpened():
            return _add_violation(
                "broken_video", 0.4, violations, details, score, "Video cannot be opened by decoder"
            )

        fps = float(capture.get(cv2.CAP_PROP_FPS) or 0)
        frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
        height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
        duration = frame_count / fps if fps > 0 else 0
        bitrate = (payload.sizeBytes * 8) / duration if duration > 0 else 0
        fourcc_raw = int(capture.get(cv2.CAP_PROP_FOURCC) or 0)
        fourcc = "".join(chr((fourcc_raw >> 8 * index) & 0xFF) for index in range(4)).strip().upper()
        container = Path(payload.fileName).suffix.replace(".", "").lower()

        details["videoMetrics"] = {
            "fps": round(fps, 3),
            "frameCount": frame_count,
            "durationSec": round(duration, 2),
            "width": width,
            "height": height,
            "estimatedBitrate": int(bitrate),
            "codec": ffprobe_info.get("videoCodec") or fourcc,
            "container": container,
            "hasAudio": ffprobe_info.get("hasAudio", False),
            "audioCodec": ffprobe_info.get("audioCodec"),
            "audioNote": "Audio quality checks for video are limited in this analyzer build",
        }

        if duration < 2 or duration > 1800:
            score = _add_violation(
                "invalid_video_duration",
                0.12,
                violations,
                details,
                score,
                "Video duration is outside allowed range",
            )
        if width < 1280 or height < 720:
            score = _add_violation(
                "low_video_resolution",
                0.18,
                violations,
                details,
                score,
                "Video resolution is below 1280x720",
            )
        if bitrate and bitrate < 1_000_000:
            score = _add_violation(
                "low_video_bitrate", 0.1, violations, details, score, "Estimated bitrate is low"
            )

        sample_step = max(frame_count // 24, 1)
        sampled = 0
        black_frames = 0
        blurry_frames = 0
        broken_frames = 0

        frame_index = 0
        while True:
            ok, frame = capture.read()
            if not ok:
                if frame_index < frame_count:
                    broken_frames += 1
                break
            if frame_index % sample_step == 0:
                sampled += 1
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                if float(gray.mean()) < 10:
                    black_frames += 1
                if cv2.Laplacian(gray, cv2.CV_64F).var() < 55:
                    blurry_frames += 1
            frame_index += 1

        capture.release()
        if sampled:
            black_ratio = black_frames / sampled
            blur_ratio = blurry_frames / sampled
            details["videoSampleMetrics"] = {
                "sampledFrames": sampled,
                "blackFrameRatio": round(black_ratio, 3),
                "blurFrameRatio": round(blur_ratio, 3),
            }
            if black_ratio > 0.3:
                score = _add_violation(
                    "black_frames_detected", 0.15, violations, details, score, "Too many black frames"
                )
            if blur_ratio > 0.5:
                score = _add_violation(
                    "blurry_video_frames",
                    0.12,
                    violations,
                    details,
                    score,
                    "High share of blurry frames",
                )
        if broken_frames > 10:
            score = _add_violation(
                "broken_video_frames", 0.15, violations, details, score, "Decoder reports broken frames"
            )

    return score


def _run_audio_checks(
    payload: AnalyzeRequest,
    file_bytes: bytes | None,
    violations: list[str],
    details: dict[str, Any],
    score: float,
) -> float:
    details["checkedCriteria"].extend(
        [
            "audio_duration",
            "audio_loudness",
            "audio_noise",
            "audio_silence",
            "audio_intelligibility_proxy",
        ]
    )

    if not file_bytes:
        return _add_violation(
            "audio_file_unavailable", 0.2, violations, details, score, "Audio bytes are not available"
        )

    ext = Path(payload.fileName).suffix.lower()
    if ext != ".wav":
        details["audioNote"] = "Advanced audio metrics currently supported for wav files only"
        if payload.sizeBytes < 100 * 1024:
            score = _add_violation(
                "audio_payload_too_small",
                0.08,
                violations,
                details,
                score,
                "Audio file seems too small for quality assessment",
            )
        return score

    try:
        with io.BytesIO(file_bytes) as stream:
            import wave

            with wave.open(stream, "rb") as wav:
                channels = wav.getnchannels()
                sample_width = wav.getsampwidth()
                framerate = wav.getframerate()
                frame_count = wav.getnframes()
                raw = wav.readframes(frame_count)
    except Exception:
        return _add_violation("broken_audio", 0.35, violations, details, score, "Cannot decode wav audio")

    duration = frame_count / framerate if framerate else 0.0
    dtype_map = {1: np.int8, 2: np.int16, 4: np.int32}
    dtype = dtype_map.get(sample_width)
    if dtype is None:
        return _add_violation(
            "unsupported_audio_format", 0.2, violations, details, score, "Unsupported wav sample width"
        )

    signal = np.frombuffer(raw, dtype=dtype)
    if channels > 1:
        signal = signal.reshape(-1, channels).mean(axis=1)

    peak = float(np.max(np.abs(signal)) or 1.0)
    rms = float(np.sqrt(np.mean(np.square(signal.astype(np.float64)))) or 1.0)
    dbfs = 20 * math.log10(rms / peak) if peak > 0 else -120
    zero_cross_rate = float(np.mean(np.diff(np.sign(signal)) != 0))
    silence_ratio = float(np.mean(np.abs(signal) < peak * 0.02))

    details["audioMetrics"] = {
        "durationSec": round(duration, 2),
        "channels": channels,
        "sampleRate": framerate,
        "dbfs": round(dbfs, 2),
        "silenceRatio": round(silence_ratio, 3),
        "zeroCrossRate": round(zero_cross_rate, 3),
    }

    if duration < 1 or duration > 3600:
        score = _add_violation(
            "invalid_audio_duration",
            0.1,
            violations,
            details,
            score,
            "Audio duration is outside allowed range",
        )
    if dbfs < -28:
        score = _add_violation("low_audio_loudness", 0.12, violations, details, score, "Audio loudness is too low")
    if silence_ratio > 0.45:
        score = _add_violation("excessive_silence", 0.1, violations, details, score, "Too much silence detected")
    if zero_cross_rate > 0.25:
        score = _add_violation("high_audio_noise", 0.08, violations, details, score, "Noise proxy is too high")
    if dbfs < -28 and silence_ratio > 0.45:
        score = _add_violation(
            "low_speech_intelligibility",
            0.08,
            violations,
            details,
            score,
            "Speech intelligibility is likely low",
        )

    return score


def _run_text_checks(
    payload: AnalyzeRequest,
    file_bytes: bytes | None,
    violations: list[str],
    details: dict[str, Any],
    score: float,
) -> float:
    details["checkedCriteria"].extend(
        [
            "text_spelling_proxy",
            "text_forbidden_lexicon",
            "text_length",
            "text_template",
            "text_readability",
        ]
    )

    text = _extract_text(payload, file_bytes)
    if not text:
        return _add_violation("unreadable_text", 0.3, violations, details, score, "Could not extract text content")

    words = re.findall(r"[A-Za-zА-Яа-яЁё]{2,}", text)
    sentences = [s for s in re.split(r"[.!?]+", text) if s.strip()]
    avg_sentence_len = statistics.mean(len(re.findall(r"\w+", s)) for s in sentences) if sentences else 0
    unique_words_ratio = len(set(word.casefold() for word in words)) / len(words) if words else 0

    details["textMetrics"] = {
        "wordCount": len(words),
        "sentenceCount": len(sentences),
        "avgSentenceLength": round(avg_sentence_len, 2),
        "uniqueWordsRatio": round(unique_words_ratio, 3),
    }

    if len(words) < 20:
        score = _add_violation("text_too_short", 0.12, violations, details, score, "Text has too few words")
    if len(words) > 10000:
        score = _add_violation("text_too_long", 0.08, violations, details, score, "Text exceeds size recommendations")
    if any(word in text.casefold() for word in _FORBIDDEN_WORDS):
        score = _add_violation(
            "forbidden_lexicon_detected",
            0.2,
            violations,
            details,
            score,
            "Forbidden lexicon detected in text",
        )
    if avg_sentence_len > 32:
        score = _add_violation("low_readability", 0.1, violations, details, score, "Sentences are too long")
    if unique_words_ratio < 0.3:
        score = _add_violation(
            "low_uniqueness_proxy", 0.08, violations, details, score, "Text vocabulary diversity is low"
        )
    if "\n\n" not in text and len(words) > 80:
        score = _add_violation(
            "template_mismatch",
            0.06,
            violations,
            details,
            score,
            "Text likely does not match expected paragraph structure",
        )

    return score


def _extract_text(payload: AnalyzeRequest, file_bytes: bytes | None) -> str:
    ext = Path(payload.fileName).suffix.lower()
    if ext == ".txt":
        if file_bytes:
            try:
                return file_bytes.decode("utf-8", errors="ignore")
            except Exception:
                return ""
        return ""
    if not file_bytes:
        return (payload.description or "").strip()

    if ext == ".docx":
        try:
            document = Document(io.BytesIO(file_bytes))
            return "\n".join(paragraph.text for paragraph in document.paragraphs)
        except Exception:
            return ""
    if ext == ".pdf":
        try:
            reader = PdfReader(io.BytesIO(file_bytes))
            return "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception:
            return ""
    return (payload.description or "").strip()


def _fetch_file_bytes(url: str) -> bytes | None:
    try:
        response = httpx.get(url, timeout=20.0, follow_redirects=True)
        if response.status_code >= 400:
            return None
        return response.content
    except Exception:
        return None


def _probe_video_streams(file_path: str) -> dict[str, Any]:
    try:
        process = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "stream=codec_type,codec_name",
                "-of",
                "json",
                file_path,
            ],
            capture_output=True,
            text=True,
            check=True,
        )
        payload = json.loads(process.stdout or "{}")
        streams = payload.get("streams", [])
        video_stream = next((stream for stream in streams if stream.get("codec_type") == "video"), None)
        audio_stream = next((stream for stream in streams if stream.get("codec_type") == "audio"), None)
        return {
            "videoCodec": (video_stream or {}).get("codec_name", ""),
            "audioCodec": (audio_stream or {}).get("codec_name", ""),
            "hasAudio": audio_stream is not None,
        }
    except Exception:
        return {"videoCodec": "", "audioCodec": "", "hasAudio": False}


def _add_violation(
    code: str,
    penalty: float,
    violations: list[str],
    details: dict[str, Any],
    score: float,
    reason: str,
) -> float:
    if code not in violations:
        violations.append(code)
    details.setdefault("violationReasons", {})[code] = reason
    return score - penalty


def _timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()
