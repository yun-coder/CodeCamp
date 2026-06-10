"""Layer / mask / crop utilities.

Consolidates the per-layer asset writers that used to live in
``ImageLayerAgent/app/services/image_layers.py`` (PIL/Pillow heavy) and the
crop/exporter helpers from ``sam-agent-tool/sam_agent_tool/exporter.py``.

The functions here are pure — they take a PIL image and a mask, return a
cropped RGBA image. Callers handle persistence via ``core.storage``.
"""
from __future__ import annotations

import math
from pathlib import Path
from typing import Iterable

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

# ── bbox helpers ────────────────────────────────────────────────────

def bbox_from_mask(mask: Image.Image | np.ndarray) -> tuple[int, int, int, int] | None:
    """Return (x, y, w, h) of the non-zero region of a mask, or None."""
    arr = np.asarray(mask.convert("L")) if isinstance(mask, Image.Image) else mask
    if arr.ndim != 2:
        return None
    ys, xs = np.where(arr > 0)
    if xs.size == 0 or ys.size == 0:
        return None
    x0, x1 = int(xs.min()), int(xs.max())
    y0, y1 = int(ys.min()), int(ys.max())
    return (x0, y0, x1 - x0 + 1, y1 - y0 + 1)


def mask_to_binary(mask: Image.Image | np.ndarray, threshold: int = 128) -> np.ndarray:
    """Convert a mask to a boolean numpy array (True = inside)."""
    arr = np.asarray(mask.convert("L")) if isinstance(mask, Image.Image) else mask
    return (arr > threshold)


def mask_area(mask: Image.Image | np.ndarray, threshold: int = 128) -> int:
    return int(mask_to_binary(mask, threshold).sum())


# ── asset writers ───────────────────────────────────────────────────

def rgba_asset(
    image: Image.Image, mask: Image.Image, bbox: tuple[int, int, int, int] | None = None
) -> Image.Image:
    """Crop the masked region from ``image`` and return it as RGBA with
    transparent background.

    The returned image is tightly cropped to the mask's bbox.
    """
    bin_mask = mask_to_binary(mask)
    if bin_mask.sum() == 0:
        return Image.new("RGBA", (1, 1), (0, 0, 0, 0))
    if bbox is None:
        bbox = bbox_from_mask(bin_mask)
    if bbox is None:
        return Image.new("RGBA", (1, 1), (0, 0, 0, 0))
    x, y, w, h = bbox
    rgba = image.convert("RGBA").crop((x, y, x + w, y + h))
    sub_mask = Image.fromarray((bin_mask[y : y + h, x : x + w] * 255).astype("uint8"))
    out = Image.new("RGBA", rgba.size, (0, 0, 0, 0))
    out.paste(rgba, mask=sub_mask)
    return out


def rectangular_asset(
    image: Image.Image, bbox: tuple[int, int, int, int]
) -> tuple[Image.Image, Image.Image]:
    """Return (cropped_rgb, full-size_zero_mask_with_box_filled).

    Used for OCR text-region candidates: returns the rectangular crop and a
    mask that fills the bbox rectangle.
    """
    x, y, w, h = bbox
    cropped = image.convert("RGB").crop((x, y, x + w, y + h))
    width, height = image.size
    mask = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(mask)
    draw.rectangle((x, y, x + w - 1, y + h - 1), fill=255)
    return cropped, mask


# ── cleanup / reconstruction ────────────────────────────────────────

def clean_background_asset(
    image: Image.Image, fg_mask: Image.Image
) -> tuple[Image.Image, Image.Image]:
    """Return (image_with_foreground_zeroed, fg_mask) for background cleanup."""
    width, height = image.size
    rgba = image.copy().convert("RGBA")
    pixels = np.array(rgba)  # .copy() so the result is writable
    bin_mask = mask_to_binary(fg_mask)
    if bin_mask.shape != (height, width):
        bin_mask = np.array(
            Image.fromarray((bin_mask * 255).astype("uint8")).resize(
                (width, height), Image.BILINEAR
            )
        ) > 128
    pixels[bin_mask, 3] = 0
    return Image.fromarray(pixels, "RGBA"), fg_mask


def clothing_clean_asset(
    image: Image.Image, product_mask: Image.Image, skin_mask: Image.Image
) -> tuple[Image.Image, Image.Image] | None:
    """Subtract the skin region from the product mask and crop.

    Returns ``(rgba_asset, mask)`` or ``None`` if the result is too small.
    """
    bin_product = mask_to_binary(product_mask)
    bin_skin = mask_to_binary(skin_mask)
    if bin_skin.shape != bin_product.shape:
        bin_skin = np.array(
            Image.fromarray((bin_skin * 255).astype("uint8")).resize(
                Image.fromarray((bin_product * 255).astype("uint8")).size,
                Image.BILINEAR,
            )
        ) > 128
    cleaned = bin_product & ~bin_skin
    if cleaned.sum() < 50:
        return None
    cleaned_mask = Image.fromarray((cleaned * 255).astype("uint8"), "L")
    bbox = bbox_from_mask(cleaned_mask)
    if bbox is None:
        return None
    return rgba_asset(image, cleaned_mask, bbox), cleaned_mask


def reconstruct_product(
    image: Image.Image, clean_mask: Image.Image
) -> tuple[Image.Image, Image.Image] | None:
    """Heuristic product reconstruction: convex hull + morphological cleanup.

    Used as the default ``GenerativeRepairProvider`` fallback (Phase 2).
    Replace with FLUX Kontext / LaMa when those Providers are wired up.
    """
    arr = np.asarray(clean_mask.convert("L"))
    if arr.sum() < 50:
        return None
    bin_mask = (arr > 128).astype("uint8") * 255
    contours, _ = cv2.findContours(bin_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None
    biggest = max(contours, key=cv2.contourArea)
    hull = cv2.convexHull(biggest)
    hull_mask = np.zeros_like(bin_mask)
    cv2.fillConvexPoly(hull_mask, hull, 255)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
    hull_mask = cv2.morphologyEx(hull_mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    hull_mask_img = Image.fromarray(hull_mask, "L")
    bbox = bbox_from_mask(hull_mask_img)
    if bbox is None:
        return None
    if bbox[2] * bbox[3] < image.width * image.height * 0.003:
        return None
    return rgba_asset(image, hull_mask_img, bbox), hull_mask_img


def foreground_mask(image: Image.Image) -> tuple[Image.Image, list[str]]:
    """Heuristic foreground mask via GrabCut.

    Returns ``(mask, warnings)``. Used by the analyzer when no Segmentation
    Provider is configured.
    """
    width, height = image.size
    arr = np.asarray(image.convert("RGB"))
    mask = np.zeros((height, width), np.uint8)
    bgd = np.zeros((1, 65), np.float64)
    fgd = np.zeros((1, 65), np.float64)
    # Run a single GrabCut iteration with a center-biased rectangle; cheap
    # fallback that almost always picks the central subject.
    rect = (
        int(width * 0.05),
        int(height * 0.05),
        int(width * 0.9),
        int(height * 0.9),
    )
    try:
        cv2.grabCut(arr, mask, rect, bgd, fgd, 3, cv2.GC_INIT_WITH_RECT)
        fg = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(
            "uint8"
        )
    except cv2.error as exc:
        return Image.new("L", (width, height), 0), [f"GrabCut failed: {exc}"]
    return Image.fromarray(fg, "L"), []


def top_subject_mask(
    fg_mask: Image.Image,
) -> tuple[Image.Image, tuple[int, int, int, int] | None]:
    """Pick the top-connected-component as the head/face candidate."""
    arr = np.asarray(fg_mask.convert("L"))
    if arr.sum() == 0:
        return fg_mask, None
    bin_mask = (arr > 128).astype("uint8")
    n_labels, labels, stats, _ = cv2.connectedComponentsWithStats(bin_mask, 8)
    if n_labels <= 1:
        return fg_mask, None
    # Pick the topmost (smallest y) component with non-trivial area
    candidates = [
        (i, stats[i, cv2.CC_STAT_TOP], stats[i, cv2.CC_STAT_AREA])
        for i in range(1, n_labels)
        if stats[i, cv2.CC_STAT_AREA] > 50
    ]
    if not candidates:
        return fg_mask, None
    candidates.sort(key=lambda t: t[1])
    top_label = candidates[0][0]
    out = np.zeros_like(bin_mask) * 255
    out[labels == top_label] = 255
    bbox = (
        int(stats[top_label, cv2.CC_STAT_LEFT]),
        int(stats[top_label, cv2.CC_STAT_TOP]),
        int(stats[top_label, cv2.CC_STAT_WIDTH]),
        int(stats[top_label, cv2.CC_STAT_HEIGHT]),
    )
    return Image.fromarray(out, "L"), bbox


def product_candidate_mask(
    fg_mask: Image.Image,
) -> tuple[Image.Image, tuple[int, int, int, int] | None]:
    """Pick the largest connected component as the product candidate."""
    arr = np.asarray(fg_mask.convert("L"))
    if arr.sum() == 0:
        return fg_mask, None
    bin_mask = (arr > 128).astype("uint8")
    n_labels, labels, stats, _ = cv2.connectedComponentsWithStats(bin_mask, 8)
    if n_labels <= 1:
        return fg_mask, None
    candidates = [
        (i, stats[i, cv2.CC_STAT_AREA])
        for i in range(1, n_labels)
        if stats[i, cv2.CC_STAT_AREA] > 1000
    ]
    if not candidates:
        return fg_mask, None
    candidates.sort(key=lambda t: t[1], reverse=True)
    best = candidates[0][0]
    out = np.zeros_like(bin_mask) * 255
    out[labels == best] = 255
    bbox = (
        int(stats[best, cv2.CC_STAT_LEFT]),
        int(stats[best, cv2.CC_STAT_TOP]),
        int(stats[best, cv2.CC_STAT_WIDTH]),
        int(stats[best, cv2.CC_STAT_HEIGHT]),
    )
    return Image.fromarray(out, "L"), bbox


def skin_candidate_mask(
    image: Image.Image, fg_mask: Image.Image
) -> tuple[Image.Image, tuple[int, int, int, int] | None]:
    """Detect skin-tone pixels within the foreground as occlusion candidates."""
    arr = np.asarray(image.convert("RGB"))
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    skin = (
        (r > 95) & (g > 40) & (b > 20)
        & (arr.max(axis=-1) - arr.min(axis=-1) > 15)
        & (r > g) & (r > b)
    )
    fg = np.asarray(fg_mask.convert("L")) > 128
    skin &= fg
    if skin.sum() == 0:
        return Image.fromarray((fg.astype("uint8") * 0), "L"), None
    ys, xs = np.where(skin)
    bbox = (int(xs.min()), int(ys.min()), int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1))
    out = np.zeros_like(fg, dtype="uint8") * 255
    out[skin] = 255
    return Image.fromarray(out, "L"), bbox


def shadow_candidate_asset(
    size: tuple[int, int], fg_mask: Image.Image
) -> tuple[Image.Image, Image.Image]:
    """Return a soft shadow PNG: blurred copy of the foreground mask."""
    width, height = size
    blurred = fg_mask.convert("L").filter(ImageFilter.GaussianBlur(radius=20))
    shadow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    alpha = blurred.point(lambda v: int(v * 0.35))
    shadow.putalpha(alpha)
    return shadow, blurred


# ── OCR text-region detection (heuristic, used when no OCR provider) ─

def detect_text_regions(image: Image.Image) -> list[tuple[int, int, int, int, float]]:
    """MSER-based text region detection. Returns ``(x, y, w, h, score)`` tuples."""
    arr = np.asarray(image.convert("L"))
    try:
        mser = cv2.MSER_create(delta=5, min_area=60, max_area=14400)
        regions, bboxes = mser.detectRegions(arr)
    except cv2.error:
        return []
    boxes: list[tuple[int, int, int, int]] = []
    for (x, y, w, h) in bboxes:
        if w < 6 or h < 6 or w > arr.shape[1] * 0.6:
            continue
        boxes.append((int(x), int(y), int(w), int(h)))
    # Suppress near-duplicates
    unique: list[tuple[int, int, int, int]] = []
    for b in sorted(boxes, key=lambda t: t[0]):
        if any(_overlap(b, u) for u in unique):
            continue
        unique.append(b)
    return [(x, y, w, h, 0.4) for (x, y, w, h) in unique]


def _overlap(
    a: tuple[int, int, int, int], b: tuple[int, int, int, int], iou_thresh: float = 0.4
) -> bool:
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    ix1, iy1 = max(ax, bx), max(ay, by)
    ix2, iy2 = min(ax + aw, bx + bw), min(ay + ah, by + bh)
    inter = max(0, ix2 - ix1) * max(0, iy2 - iy1)
    union = aw * ah + bw * bh - inter
    return (inter / union) > iou_thresh if union > 0 else False


# ── mask / image helpers for OCR final-text overlay ────────────────

def erase_masked_background_region(
    image: Image.Image, mask: Image.Image
) -> Image.Image:
    """Zero alpha inside the mask region (so the final result can be
    text-overlayed without the model's artifacts)."""
    rgba = image.convert("RGBA")
    arr = np.array(rgba)  # .copy() so we can mutate
    bin_mask = mask_to_binary(mask)
    if bin_mask.shape == arr.shape[:2]:
        arr[bin_mask, 3] = 0
    return Image.fromarray(arr, "RGBA")


def rendered_text_overlay_asset(
    original: Image.Image, ocr_text: str
) -> tuple[Image.Image, Image.Image] | None:
    """Build a transparent-PNG text overlay using the OCR text.

    This is the "fallback" overlay used by ``XiaohuaReplacementWorkflow`` when
    a more sophisticated text rasterizer is not configured.
    """
    from PIL import ImageFont

    width, height = original.size
    if not ocr_text.strip():
        return None
    # Try to find a usable CJK font; fall back to default
    font = None
    for path in (
        r"C:\Windows\Fonts\msyh.ttc",
        r"C:\Windows\Fonts\msyh.ttf",
        r"C:\Windows\Fonts\simhei.ttf",
        "/System/Library/Fonts/PingFang.ttc",
        "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
    ):
        try:
            font = ImageFont.truetype(path, max(20, height // 22))
            break
        except (OSError, IOError):
            continue
    if font is None:
        font = ImageFont.load_default()

    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    text_color = (32, 32, 32, 255)
    # Heuristic: render the first 1–2 short lines near the top
    lines = [ln for ln in ocr_text.splitlines() if ln.strip()][:2]
    if not lines:
        return None
    y = int(height * 0.04)
    for line in lines:
        draw.text((int(width * 0.04), y), line[:40], font=font, fill=text_color)
        y += int(height * 0.05)

    mask = overlay.split()[-1]
    return overlay, mask
