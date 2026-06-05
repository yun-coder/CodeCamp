from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

try:
    import cv2  # type: ignore
except Exception:  # pragma: no cover - optional dependency fallback
    cv2 = None

try:
    from scipy.spatial import ConvexHull  # type: ignore
except Exception:  # pragma: no cover
    ConvexHull = None


def clamp_bbox(x: int, y: int, w: int, h: int, width: int, height: int) -> tuple[int, int, int, int]:
    x = max(0, min(x, width - 1))
    y = max(0, min(y, height - 1))
    w = max(1, min(w, width - x))
    h = max(1, min(h, height - y))
    return x, y, w, h


def bbox_from_mask(mask: Image.Image) -> tuple[int, int, int, int] | None:
    bbox = mask.convert("L").getbbox()
    if bbox is None:
        return None
    x1, y1, x2, y2 = bbox
    return x1, y1, x2 - x1, y2 - y1


def largest_component(mask: np.ndarray) -> np.ndarray:
    if cv2 is None:
        return mask
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(mask.astype("uint8"), 8)
    if num_labels <= 1:
        return mask
    largest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    return (labels == largest).astype("uint8") * 255


def smooth_mask(mask: Image.Image, radius: float = 1.4) -> Image.Image:
    return mask.convert("L").filter(ImageFilter.GaussianBlur(radius=radius))


def foreground_mask(image: Image.Image) -> tuple[Image.Image, list[str]]:
    warnings: list[str] = []
    rgb = image.convert("RGB")
    arr = np.array(rgb)
    h, w = arr.shape[:2]

    if cv2 is not None and w >= 64 and h >= 64:
        try:
            grab = np.zeros((h, w), np.uint8)
            bgd = np.zeros((1, 65), np.float64)
            fgd = np.zeros((1, 65), np.float64)
            margin_x = max(8, int(w * 0.06))
            margin_y = max(8, int(h * 0.04))
            rect = (margin_x, margin_y, w - margin_x * 2, h - margin_y * 2)
            cv2.grabCut(arr, grab, rect, bgd, fgd, 4, cv2.GC_INIT_WITH_RECT)
            mask = np.where((grab == cv2.GC_FGD) | (grab == cv2.GC_PR_FGD), 255, 0).astype("uint8")
            mask = largest_component(mask)
            kernel = np.ones((5, 5), np.uint8)
            mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
            mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)
            return smooth_mask(Image.fromarray(mask)), warnings
        except Exception as exc:
            warnings.append(f"GrabCut failed; using edge-color fallback: {exc}")

    border = np.concatenate(
        [
            arr[: max(1, h // 20), :, :].reshape(-1, 3),
            arr[-max(1, h // 20) :, :, :].reshape(-1, 3),
            arr[:, : max(1, w // 20), :].reshape(-1, 3),
            arr[:, -max(1, w // 20) :, :].reshape(-1, 3),
        ],
        axis=0,
    )
    bg = np.median(border, axis=0)
    dist = np.linalg.norm(arr.astype("float32") - bg.astype("float32"), axis=2)
    threshold = max(32.0, float(np.percentile(dist, 68)))
    mask = (dist > threshold).astype("uint8") * 255
    if cv2 is not None:
        mask = largest_component(mask)
        kernel = np.ones((5, 5), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    warnings.append("Foreground mask used heuristic edge-color fallback.")
    return smooth_mask(Image.fromarray(mask)), warnings


def product_candidate_mask(fg_mask: Image.Image) -> tuple[Image.Image, tuple[int, int, int, int] | None]:
    width, height = fg_mask.size
    mask_arr = np.array(fg_mask.convert("L"))
    roi = np.zeros_like(mask_arr)
    x1 = int(width * 0.22)
    x2 = int(width * 0.78)
    y1 = int(height * 0.18)
    y2 = int(height * 0.88)
    roi[y1:y2, x1:x2] = 255
    product = np.minimum(mask_arr, roi).astype("uint8")
    if cv2 is not None:
        kernel = np.ones((7, 7), np.uint8)
        product = cv2.morphologyEx(product, cv2.MORPH_CLOSE, kernel, iterations=1)
    out = smooth_mask(Image.fromarray(product), radius=1.1)
    return out, bbox_from_mask(out)


def clean_background_asset(image: Image.Image, fg_mask: Image.Image) -> tuple[Image.Image, Image.Image]:
    """Create an approximate clean background by inpainting the foreground hole."""

    rgb = image.convert("RGB")
    mask = fg_mask.convert("L")
    if cv2 is not None:
        arr = np.array(rgb)
        hard = (np.array(mask) > 24).astype("uint8") * 255
        kernel = np.ones((9, 9), np.uint8)
        hard = cv2.dilate(hard, kernel, iterations=2)
        repaired = cv2.inpaint(arr, hard, 7, cv2.INPAINT_TELEA)
        return Image.fromarray(repaired).convert("RGBA"), Image.fromarray(hard)

    blurred = rgb.filter(ImageFilter.GaussianBlur(radius=16)).convert("RGBA")
    repaired = rgb.convert("RGBA")
    repaired.paste(blurred, (0, 0), mask.filter(ImageFilter.GaussianBlur(radius=6)))
    return repaired, mask


def replacement_background_asset(image: Image.Image, fg_mask: Image.Image) -> tuple[Image.Image, Image.Image]:
    """Create a stronger clean background for product replacement composition."""

    rgb = image.convert("RGB")
    mask = fg_mask.convert("L")
    if cv2 is not None:
        arr = np.array(rgb)
        hard = (np.array(mask) > 16).astype("uint8") * 255
        kernel = np.ones((23, 23), np.uint8)
        hard = cv2.dilate(hard, kernel, iterations=2)
        repaired = cv2.inpaint(arr, hard, 17, cv2.INPAINT_TELEA)
        bg_pixels = arr[hard == 0]
        if len(bg_pixels):
            median = np.median(bg_pixels, axis=0).astype("uint8")
            solid = np.zeros_like(repaired)
            solid[:, :] = median
            feather = cv2.GaussianBlur(hard, (0, 0), sigmaX=22, sigmaY=22).astype("float32") / 255.0
            alpha = np.clip(feather * 0.96, 0, 1)[:, :, None]
            repaired = np.clip(repaired.astype("float32") * (1 - alpha) + solid.astype("float32") * alpha, 0, 255).astype("uint8")
        return Image.fromarray(repaired).convert("RGBA"), Image.fromarray(hard)

    blurred = rgb.filter(ImageFilter.GaussianBlur(radius=24)).convert("RGBA")
    repaired = rgb.convert("RGBA")
    repaired.paste(blurred, (0, 0), mask.filter(ImageFilter.GaussianBlur(radius=10)))
    return repaired, mask


def top_subject_mask(fg_mask: Image.Image) -> tuple[Image.Image, tuple[int, int, int, int] | None]:
    """Approximate face/hair/head area from the top portion of the foreground."""

    bbox = bbox_from_mask(fg_mask)
    if bbox is None:
        return Image.new("L", fg_mask.size, 0), None
    x, y, w, h = bbox
    top_h = max(1, int(h * 0.26))
    crop_region = Image.new("L", fg_mask.size, 0)
    crop_region.paste(255, (x, y, x + w, y + top_h))
    mask = Image.fromarray(np.minimum(np.array(fg_mask.convert("L")), np.array(crop_region)).astype("uint8"))
    mask = smooth_mask(mask, radius=1.0)
    return mask, bbox_from_mask(mask)


def skin_candidate_mask(image: Image.Image, fg_mask: Image.Image) -> tuple[Image.Image, tuple[int, int, int, int] | None]:
    """Approximate visible skin/occlusion areas inside the foreground."""

    rgb = np.array(image.convert("RGB"))
    fg = np.array(fg_mask.convert("L")) > 24
    r = rgb[:, :, 0].astype("int16")
    g = rgb[:, :, 1].astype("int16")
    b = rgb[:, :, 2].astype("int16")
    skin = (
        (r > 95)
        & (g > 40)
        & (b > 20)
        & ((np.maximum.reduce([r, g, b]) - np.minimum.reduce([r, g, b])) > 15)
        & (r > g)
        & (r > b)
        & fg
    )
    mask = skin.astype("uint8") * 255
    if cv2 is not None:
        kernel = np.ones((5, 5), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=1)
    out = smooth_mask(Image.fromarray(mask), radius=0.9)
    return out, bbox_from_mask(out)


def clothing_clean_asset(
    image: Image.Image,
    fg_mask: Image.Image,
    skin_mask: Image.Image,
) -> tuple[Image.Image, Image.Image] | None:
    """Subtract skin/occlusion from product region to get clean clothing.

    Dilates skin mask to avoid boundary artifacts, then subtracts from foreground.
    Returns (clothing_rgba, clothing_mask) or None if result too small.
    """

    fg_arr = np.array(fg_mask.convert("L")).astype("float32")
    skin_arr = np.array(skin_mask.convert("L")).astype("float32")

    if cv2 is not None:
        skin_u8 = (skin_arr > 30).astype("uint8") * 255
        kernel = np.ones((7, 7), np.uint8)
        skin_dilated = cv2.dilate(skin_u8, kernel, iterations=2)
        skin_arr = skin_dilated.astype("float32")

    skin_arr = np.clip(skin_arr, 0, 255)
    clothing = np.clip(fg_arr - skin_arr * 0.85, 0, 255).astype("uint8")
    clothing_mask = Image.fromarray(clothing, mode="L")

    bbox = bbox_from_mask(clothing_mask)
    if bbox is None:
        return None
    x, y, w, h = bbox
    if w * h < 64:
        return None

    if cv2 is not None:
        kernel = np.ones((3, 3), np.uint8)
        clothing = cv2.morphologyEx(clothing, cv2.MORPH_CLOSE, kernel, iterations=1)

    clothing_mask = Image.fromarray(clothing, mode="L")
    smooth = smooth_mask(clothing_mask, radius=0.6)

    crop_bbox = bbox_from_mask(smooth) or bbox
    asset = rgba_asset(image, smooth, crop_bbox)
    return asset, smooth


def shadow_candidate_asset(image_size: tuple[int, int], fg_mask: Image.Image) -> tuple[Image.Image, Image.Image]:
    """Create an editable soft shadow candidate from the foreground silhouette."""

    width, height = image_size
    shadow_mask = fg_mask.convert("L").filter(ImageFilter.GaussianBlur(radius=max(8, width // 70)))
    shifted = Image.new("L", image_size, 0)
    shifted.paste(shadow_mask, (0, max(4, height // 80)))
    arr = np.array(shifted).astype("float32")
    y = np.linspace(0.3, 1.0, height, dtype="float32")[:, None]
    alpha = np.clip(arr * y * 0.34, 0, 110).astype("uint8")
    alpha_img = Image.fromarray(alpha)
    asset = Image.new("RGBA", image_size, (0, 0, 0, 0))
    asset.putalpha(alpha_img)
    return asset, alpha_img


def reconstruct_product(
    image: Image.Image,
    mask: Image.Image,
) -> tuple[Image.Image, Image.Image] | None:
    """Rebuild product mask to remove 'worn by human' silhouette.

    Steps:
    1. Edge clean — small erosion to strip residual skin pixels
    2. Gap fill — morphological close to bridge body-occluded gaps
    3. Hull blend — convex hull merged to soften human-body concavities
    4. Smooth — gaussian blur + threshold for natural edges
    Returns (rgba_asset, mask) or None if result too small.
    """

    arr = np.array(mask.convert("L")).astype("uint8")

    # --- step 1: edge clean ---
    if cv2 is not None:
        kernel_small = np.ones((3, 3), np.uint8)
        arr = cv2.erode(arr, kernel_small, iterations=1)
        arr = cv2.dilate(arr, kernel_small, iterations=1)

    # --- step 2: gap fill ---
    if cv2 is not None:
        kernel_med = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13))
        arr = cv2.morphologyEx(arr, cv2.MORPH_CLOSE, kernel_med, iterations=1)

    # --- step 3: convex hull blend ---
    binary = arr > 30
    ys, xs = np.where(binary)
    if len(xs) >= 3 and ConvexHull is not None:
        points = np.column_stack([xs, ys])
        try:
            hull = ConvexHull(points)
            hull_mask = np.zeros_like(arr, dtype="uint8")
            hull_pts = np.array(
                [(points[v, 0], points[v, 1]) for v in hull.vertices],
                dtype=np.int32,
            )
            if cv2 is not None:
                cv2.fillPoly(hull_mask, [hull_pts], 255)
            hull_arr = hull_mask.astype("float32")
        except Exception:
            hull_arr = arr.astype("float32")
    else:
        hull_arr = arr.astype("float32")

    arr_f = arr.astype("float32")
    blended = np.clip(arr_f * 0.35 + hull_arr * 0.65, 0, 255).astype("uint8")

    # --- step 4: smooth ---
    smooth = smooth_mask(Image.fromarray(blended), radius=2.5)
    smooth_arr = np.array(smooth)
    final = (smooth_arr > 40).astype("uint8") * 255

    if cv2 is not None:
        kernel_final = np.ones((5, 5), np.uint8)
        final = cv2.morphologyEx(final, cv2.MORPH_CLOSE, kernel_final, iterations=1)
        final = cv2.morphologyEx(final, cv2.MORPH_OPEN, kernel_final, iterations=1)

    final_mask = Image.fromarray(final, mode="L")
    bbox = bbox_from_mask(final_mask)
    if bbox is None or bbox[2] * bbox[3] < 64:
        return None

    asset = rgba_asset(image, final_mask, bbox)
    return asset, final_mask


def detect_text_regions(image: Image.Image, max_regions: int = 8) -> list[tuple[int, int, int, int, float]]:
    if cv2 is None:
        return []
    rgb = image.convert("RGB")
    arr = np.array(rgb)
    gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
    edges = cv2.Canny(gray, 80, 180)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (21, 7))
    merged = cv2.dilate(edges, kernel, iterations=2)
    contours, _ = cv2.findContours(merged, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    h, w = gray.shape
    boxes: list[tuple[int, int, int, int, float]] = []
    for contour in contours:
        x, y, bw, bh = cv2.boundingRect(contour)
        area = bw * bh
        if area < max(260, w * h * 0.001):
            continue
        if bw < 24 or bh < 8:
            continue
        if area > w * h * 0.25:
            continue
        aspect = bw / max(1, bh)
        if aspect < 1.2 and area < w * h * 0.02:
            continue
        density = float(np.count_nonzero(edges[y : y + bh, x : x + bw]) / max(1, area))
        score = density * min(4.0, aspect)
        boxes.append((x, y, bw, bh, score))

    # Large ecommerce posters often use white title copy with a soft shadow.
    # Canny can miss it on low-contrast grey backgrounds, so keep a focused
    # fallback that clusters bright glyph-like components in the lower poster.
    hsv = cv2.cvtColor(arr, cv2.COLOR_RGB2HSV)
    yy = np.indices((h, w))[0]
    bright = (
        (gray > 225)
        & (hsv[:, :, 1] < 65)
        & (yy > h * 0.42)
        & (yy < h * 0.94)
    ).astype("uint8") * 255
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(bright, 8)
    glyph_mask = np.zeros_like(bright)
    for label in range(1, num_labels):
        x, y, bw, bh, area = stats[label]
        if area < 20 or area > w * h * 0.012:
            continue
        if bw < 3 or bh < 5 or bw > w * 0.32 or bh > h * 0.12:
            continue
        glyph_mask[labels == label] = 255
    if np.count_nonzero(glyph_mask):
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (45, 18))
        merged_bright = cv2.dilate(glyph_mask, kernel, iterations=1)
        bright_contours, _ = cv2.findContours(merged_bright, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for contour in bright_contours:
            x, y, bw, bh = cv2.boundingRect(contour)
            area = bw * bh
            aspect = bw / max(1, bh)
            if bw < w * 0.16 or bh < h * 0.025:
                continue
            if aspect < 1.8 or area > w * h * 0.16:
                continue
            fill = float(np.count_nonzero(glyph_mask[y : y + bh, x : x + bw]) / max(1, area))
            score = 0.82 + min(0.3, fill * 8.0)
            boxes.append((x, y, bw, bh, score))

    boxes.sort(key=lambda item: item[4], reverse=True)
    selected: list[tuple[int, int, int, int, float]] = []
    for candidate in boxes:
        x, y, bw, bh, score = candidate
        overlaps = False
        for sx, sy, sw, sh, _ in selected:
            ix1, iy1 = max(x, sx), max(y, sy)
            ix2, iy2 = min(x + bw, sx + sw), min(y + bh, sy + sh)
            inter = max(0, ix2 - ix1) * max(0, iy2 - iy1)
            if inter / max(1, min(bw * bh, sw * sh)) > 0.5:
                overlaps = True
                break
        if not overlaps:
            selected.append(candidate)
        if len(selected) >= max_regions:
            break
    return selected


def rgba_asset(image: Image.Image, mask: Image.Image, bbox: tuple[int, int, int, int]) -> Image.Image:
    x, y, w, h = bbox
    crop = image.convert("RGBA").crop((x, y, x + w, y + h))
    alpha = mask.convert("L").crop((x, y, x + w, y + h))
    crop.putalpha(alpha)
    return crop


def product_cutout_asset(image: Image.Image) -> tuple[Image.Image, Image.Image, tuple[int, int, int, int]]:
    """Extract a transparent product cutout from a standalone product image."""

    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    alpha_bbox = alpha.getbbox()
    if alpha_bbox is not None and np.array(alpha).min() < 245:
        mask = alpha.point(lambda value: 255 if value > 16 else 0)
        bbox = bbox_from_mask(mask) or (0, 0, rgba.width, rgba.height)
        return rgba.crop((bbox[0], bbox[1], bbox[0] + bbox[2], bbox[1] + bbox[3])), mask, bbox

    rgb = rgba.convert("RGB")
    if cv2 is not None and rgb.width >= 96 and rgb.height >= 96:
        grab_mask, _ = foreground_mask(rgb)
        grab_bbox = bbox_from_mask(grab_mask)
        if grab_bbox is not None:
            gx, gy, gw, gh = grab_bbox
            grab_area = np.count_nonzero(np.array(grab_mask.convert("L")) > 20)
            if grab_area > max(800, int(rgb.width * rgb.height * 0.025)) and gw > rgb.width * 0.08 and gh > rgb.height * 0.20:
                return rgba_asset(rgb, grab_mask, grab_bbox), grab_mask, grab_bbox

    arr = np.array(rgb)
    h, w = arr.shape[:2]
    border = np.concatenate(
        [
            arr[: max(1, h // 18), :, :].reshape(-1, 3),
            arr[-max(1, h // 18) :, :, :].reshape(-1, 3),
            arr[:, : max(1, w // 18), :].reshape(-1, 3),
            arr[:, -max(1, w // 18) :, :].reshape(-1, 3),
        ],
        axis=0,
    )
    bg = np.median(border, axis=0)
    dist = np.linalg.norm(arr.astype("float32") - bg.astype("float32"), axis=2)
    threshold = max(18.0, float(np.percentile(dist, 62)))
    mask_arr = (dist > threshold).astype("uint8") * 255
    if cv2 is not None:
        mask_arr = largest_component(mask_arr)
        kernel = np.ones((5, 5), np.uint8)
        mask_arr = cv2.morphologyEx(mask_arr, cv2.MORPH_CLOSE, kernel, iterations=2)
        mask_arr = cv2.morphologyEx(mask_arr, cv2.MORPH_OPEN, kernel, iterations=1)
    mask = smooth_mask(Image.fromarray(mask_arr), radius=0.8)
    bbox = bbox_from_mask(mask) or (0, 0, rgba.width, rgba.height)
    cutout = rgba_asset(rgb, mask, bbox)
    return cutout, mask, bbox


def fit_product_to_bbox(product: Image.Image, target_bbox: tuple[int, int, int, int]) -> tuple[Image.Image, tuple[int, int]]:
    """Scale a product cutout into the target product box while preserving aspect ratio."""

    x, y, w, h = target_bbox
    cutout = product.convert("RGBA")
    scale = min(w / max(cutout.width, 1), h / max(cutout.height, 1))
    scale = max(0.05, scale * 0.94)
    next_size = (
        max(1, int(cutout.width * scale)),
        max(1, int(cutout.height * scale)),
    )
    resized = cutout.resize(next_size, Image.Resampling.LANCZOS)
    paste_x = int(x + (w - resized.width) / 2)
    paste_y = int(y + (h - resized.height) / 2)
    return resized, (paste_x, paste_y)


def compose_replacement(
    background: Image.Image,
    product_cutout: Image.Image,
    target_bbox: tuple[int, int, int, int],
    foreground_overlay: Image.Image | None = None,
) -> Image.Image:
    """Composite the new product onto a cleaned scene background."""

    canvas = background.convert("RGBA")
    fitted, position = fit_product_to_bbox(product_cutout, target_bbox)
    canvas.alpha_composite(fitted, position)
    if foreground_overlay is not None:
        canvas.alpha_composite(foreground_overlay.convert("RGBA"), (0, 0))
    return canvas


def erase_masked_background_region(background: Image.Image, mask: Image.Image) -> Image.Image:
    """Remove an old foreground design/text region from a clean background."""

    rgba = background.convert("RGBA")
    if cv2 is None:
        blurred = rgba.filter(ImageFilter.GaussianBlur(radius=12))
        repaired = rgba.copy()
        repaired.paste(blurred, (0, 0), mask.convert("L").filter(ImageFilter.GaussianBlur(radius=4)))
        return repaired

    arr = np.array(rgba.convert("RGB"))
    hard = (np.array(mask.convert("L")) > 12).astype("uint8") * 255
    hard = cv2.dilate(hard, np.ones((9, 9), np.uint8), iterations=1)
    repaired = cv2.inpaint(arr, hard, 9, cv2.INPAINT_TELEA)
    bg_pixels = arr[hard == 0]
    if len(bg_pixels):
        median = np.median(bg_pixels, axis=0).astype("uint8")
        solid = np.zeros_like(repaired)
        solid[:, :] = median
        feather = cv2.GaussianBlur(hard, (0, 0), sigmaX=8, sigmaY=8).astype("float32") / 255.0
        alpha = np.clip(feather * 0.35, 0, 1)[:, :, None]
        repaired = np.clip(repaired.astype("float32") * (1 - alpha) + solid.astype("float32") * alpha, 0, 255).astype("uint8")
    return Image.fromarray(repaired).convert("RGBA")


def lower_garment_cutout_asset(image: Image.Image) -> tuple[Image.Image, Image.Image, tuple[int, int, int, int]] | None:
    """Try to extract pants/lower-garment from a model product image."""

    rgb = image.convert("RGB")
    arr = np.array(rgb)
    h, w = arr.shape[:2]
    if h < 80 or w < 80:
        return None

    r = arr[:, :, 0].astype("int16")
    g = arr[:, :, 1].astype("int16")
    b = arr[:, :, 2].astype("int16")
    gray = arr.mean(axis=2)
    maxc = arr.max(axis=2).astype("int16")
    minc = arr.min(axis=2).astype("int16")

    # Dark lower garments are common in the current workflow. Keep the actual
    # garment pixels instead of closing the mask into a full body-shaped block,
    # otherwise hands, shoes, and white background ride along with the pants.
    lower_region = np.zeros((h, w), dtype="uint8")
    lower_region[int(h * 0.24) :, :] = 255
    skin = (
        (r > 95)
        & (g > 40)
        & (b > 20)
        & ((maxc - minc) > 15)
        & (r > g)
        & (r > b)
    )
    yellow_or_shoe = (
        (r > 135)
        & (g > 75)
        & (b < 125)
        & (r > g + 6)
        & (np.indices((h, w))[0] > h * 0.68)
    )
    pale_background = (maxc > 218) & ((maxc - minc) < 38)
    dark = (
        (gray < 108)
        & (lower_region > 0)
        & (~skin)
        & (~yellow_or_shoe)
        & (~pale_background)
    ).astype("uint8") * 255

    if cv2 is not None:
        dark = cv2.morphologyEx(dark, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8), iterations=1)
        dark = cv2.morphologyEx(dark, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8), iterations=1)

        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(dark, 8)
        if num_labels > 1:
            areas = stats[1:, cv2.CC_STAT_AREA]
            largest_area = int(areas.max()) if len(areas) else 0
            selected = np.zeros_like(dark)
            for label in range(1, num_labels):
                x, y, bw, bh, area = stats[label]
                cx, cy = centroids[label]
                if area < max(120, int(largest_area * 0.10)):
                    continue
                if y > h * 0.82 and bh < h * 0.13:
                    continue
                if abs(cx - w / 2) > w * 0.38 and area < largest_area * 0.35:
                    continue
                selected[labels == label] = 255
            dark = selected if np.count_nonzero(selected) else largest_component(dark)

        dark = cv2.morphologyEx(dark, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8), iterations=1)
        min_run = max(6, int(w * 0.018))
        for row in range(h):
            xs = np.flatnonzero(dark[row] > 0)
            if len(xs) == 0:
                continue
            breaks = np.where(np.diff(xs) > 1)[0] + 1
            for run in np.split(xs, breaks):
                if len(run) < min_run:
                    dark[row, run] = 0
        left_edges = np.full(h, np.nan, dtype="float32")
        right_edges = np.full(h, np.nan, dtype="float32")
        for row in range(h):
            xs = np.flatnonzero(dark[row] > 0)
            if len(xs):
                left_edges[row] = float(xs[0])
                right_edges[row] = float(xs[-1])
        for row in range(h):
            if np.isnan(left_edges[row]) or np.isnan(right_edges[row]):
                continue
            y1 = max(0, row - 18)
            y2 = min(h, row + 19)
            local_left = left_edges[y1:y2]
            local_right = right_edges[y1:y2]
            local_left = local_left[~np.isnan(local_left)]
            local_right = local_right[~np.isnan(local_right)]
            if len(local_left) < 8 or len(local_right) < 8:
                continue
            expected_left = float(np.median(local_left))
            expected_right = float(np.median(local_right))
            if left_edges[row] < expected_left - 8:
                dark[row, : max(0, int(expected_left) - 4)] = 0
            if right_edges[row] > expected_right + 8:
                dark[row, min(w, int(expected_right) + 5) :] = 0

        valid_cloth = (
            (gray < 138)
            & (lower_region > 0)
            & (~skin)
            & (~yellow_or_shoe)
            & (~pale_background)
        ).astype("uint8") * 255
        valid_cloth = cv2.dilate(valid_cloth, np.ones((3, 3), np.uint8), iterations=1)
        dark = np.minimum(dark, valid_cloth)
        dark = cv2.morphologyEx(dark, cv2.MORPH_OPEN, np.ones((11, 11), np.uint8), iterations=1)
        dark = cv2.morphologyEx(dark, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8), iterations=1)

    if np.count_nonzero(dark) < max(500, int(w * h * 0.035)):
        return None

    if cv2 is not None:
        alpha = cv2.GaussianBlur(dark, (0, 0), sigmaX=0.8, sigmaY=0.8)
        alpha[dark == 255] = 255
        alpha[valid_cloth == 0] = 0
        bright_contamination = (maxc > 155) & (gray > 120)
        alpha[bright_contamination | skin | yellow_or_shoe | pale_background] = 0
        alpha[alpha < 14] = 0
        mask = Image.fromarray(alpha.astype("uint8"), mode="L")
    else:
        mask = smooth_mask(Image.fromarray(dark), radius=0.7)
    bbox = bbox_from_mask(mask)
    if bbox is None:
        return None
    x, y, bw, bh = bbox
    if bh < h * 0.28 or bw < w * 0.12:
        return None
    asset = rgba_asset(rgb, mask, bbox)
    return asset, mask, bbox


def text_foreground_overlay_asset(image: Image.Image) -> tuple[Image.Image, Image.Image] | None:
    """Extract bright poster copy/design elements that should remain above product."""

    rgb = image.convert("RGB")
    arr = np.array(rgb)
    h, w = arr.shape[:2]
    if h < 80 or w < 80:
        return None

    maxc = arr.max(axis=2).astype("int16")
    minc = arr.min(axis=2).astype("int16")
    saturation = maxc - minc
    bright = (maxc > 205) & (saturation < 70)
    bright[: int(h * 0.52), :] = False

    mask_arr = bright.astype("uint8") * 255
    if cv2 is not None:
        num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(mask_arr, 8)
        kept = np.zeros_like(mask_arr)
        for label in range(1, num_labels):
            x, y, bw, bh, area = stats[label]
            if area < 12:
                continue
            if area > w * h * 0.035:
                continue
            if bh > h * 0.16 or bw > w * 0.72:
                continue
            if y < h * 0.55:
                continue
            if y + bh > h * 0.92:
                continue
            kept[labels == label] = 255

        row_counts = np.count_nonzero(kept, axis=1)
        smoothed = np.convolve(row_counts, np.ones(13, dtype="float32"), mode="same")
        active_rows = smoothed > w * 0.012
        text_rows = np.zeros(h, dtype=bool)
        text_band_mask = np.zeros_like(mask_arr)
        start: int | None = None
        for idx, active in enumerate(active_rows):
            if active and start is None:
                start = idx
            if (not active or idx == h - 1) and start is not None:
                end = idx if not active else idx + 1
                band = kept[start:end, :]
                xs = np.where(np.count_nonzero(band, axis=0) > 0)[0]
                band_height = end - start
                span = int(xs[-1] - xs[0]) if len(xs) else 0
                if (
                    band_height >= 5
                    and span > w * 0.20
                    and start > h * 0.60
                    and end < h * 0.925
                ):
                    text_rows[start:end] = True
                    x1 = max(0, int(xs[0]) - 16)
                    x2 = min(w, int(xs[-1]) + 17)
                    y1 = max(0, start - 8)
                    y2 = min(h, end + 9)
                    text_band_mask[y1:y2, x1:x2] = 255
                start = None
        kept[~text_rows, :] = 0

        gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
        edges = cv2.Canny(gray, 45, 140)
        edge_kernel = np.ones((3, 3), np.uint8)
        edges = cv2.dilate(edges, edge_kernel, iterations=1)
        text_edge_scope = cv2.dilate(kept, np.ones((11, 11), np.uint8), iterations=1)
        kept = np.maximum(kept, np.minimum(edges, np.minimum(text_band_mask, text_edge_scope)))

        kernel = np.ones((5, 5), np.uint8)
        mask_arr = cv2.dilate(kept, kernel, iterations=1)
        mask_arr = cv2.GaussianBlur(mask_arr, (5, 5), 0)

        hard = (mask_arr > 16).astype("uint8") * 255
        num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(hard, 8)
        cleaned = np.zeros_like(hard)
        for label in range(1, num_labels):
            x, y, bw, bh, area = stats[label]
            if area < 10:
                continue
            if bh > h * 0.09 and bw < w * 0.11:
                continue
            if y + bh > h * 0.94 and area < w * h * 0.02:
                continue
            cleaned[labels == label] = 255
        mask_arr = cv2.GaussianBlur(cleaned, (5, 5), 0)

    if np.count_nonzero(mask_arr > 16) < 80:
        return None
    mask = Image.fromarray(mask_arr).convert("L")
    overlay = image.convert("RGBA")
    overlay.putalpha(mask)
    return overlay, mask


def _font_candidates(bold: bool) -> list[Path]:
    if bold:
        names = ["msyhbd.ttc", "simhei.ttf", "SourceHanSansSC-Bold.otf", "NotoSansCJK-Bold.ttc"]
    else:
        names = ["msyh.ttc", "simhei.ttf", "SourceHanSansSC-Regular.otf", "NotoSansCJK-Regular.ttc"]
    roots = [
        Path("C:/Windows/Fonts"),
        Path("/System/Library/Fonts"),
        Path("/Library/Fonts"),
        Path("/usr/share/fonts"),
    ]
    return [root / name for root in roots for name in names]


def _load_display_font(size: int, bold: bool = True) -> ImageFont.ImageFont:
    for path in _font_candidates(bold):
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


def _poster_text_lines(text: str) -> list[str]:
    cleaned = text.replace("#", " ").replace("　", " ")
    parts = [part.strip() for part in cleaned.split() if part.strip()]
    if not parts:
        return []
    if len(parts) >= 5:
        return [parts[0], " ".join(parts[1:3]), " ".join(parts[3:])]
    if len(parts) == 4:
        return [parts[0], " ".join(parts[1:3]), parts[3]]
    if len(parts) == 3:
        return parts
    if len(parts) == 2:
        return parts
    line = parts[0]
    if len(line) <= 14:
        return [line]
    mid = len(line) // 2
    return [line[:mid], line[mid:]]


def rendered_text_overlay_asset(image: Image.Image, text: str) -> tuple[Image.Image, Image.Image] | None:
    """Render complete OCR copy as a topmost ecommerce poster text layer."""

    lines = _poster_text_lines(text)
    if not lines:
        return None

    width, height = image.size
    max_text_width = int(width * 0.74)
    max_text_height = int(height * 0.20)
    base_size = max(22, int(width * 0.067))

    draw_probe = ImageDraw.Draw(Image.new("L", (1, 1), 0))
    for size in range(base_size, 17, -2):
        fonts = [_load_display_font(size if idx == 0 else max(18, int(size * 0.76)), bold=True) for idx, _ in enumerate(lines)]
        boxes = [draw_probe.textbbox((0, 0), line, font=fonts[idx], stroke_width=1) for idx, line in enumerate(lines)]
        line_widths = [box[2] - box[0] for box in boxes]
        line_heights = [box[3] - box[1] for box in boxes]
        leading = max(5, int(size * 0.12))
        total_height = sum(line_heights) + leading * (len(lines) - 1)
        if max(line_widths) <= max_text_width and total_height <= max_text_height:
            break
    else:
        size = 18
        fonts = [_load_display_font(size, bold=True) for _ in lines]
        boxes = [draw_probe.textbbox((0, 0), line, font=fonts[idx], stroke_width=1) for idx, line in enumerate(lines)]
        line_widths = [box[2] - box[0] for box in boxes]
        line_heights = [box[3] - box[1] for box in boxes]
        leading = 5
        total_height = sum(line_heights) + leading * (len(lines) - 1)

    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    mask = Image.new("L", image.size, 0)
    overlay_draw = ImageDraw.Draw(overlay)
    mask_draw = ImageDraw.Draw(mask)

    top = int(height * 0.725)
    if top + total_height > int(height * 0.93):
        top = max(int(height * 0.62), int(height * 0.93) - total_height)

    y = top
    for idx, line in enumerate(lines):
        font = fonts[idx]
        bbox = draw_probe.textbbox((0, 0), line, font=font, stroke_width=1)
        line_width = bbox[2] - bbox[0]
        line_height = bbox[3] - bbox[1]
        x = int((width - line_width) / 2)
        shadow_offset = max(2, int(size * 0.08))
        stroke = max(1, int(size * 0.035))
        overlay_draw.text(
            (x + shadow_offset, y + shadow_offset),
            line,
            font=font,
            fill=(70, 70, 70, 130),
            stroke_width=stroke,
            stroke_fill=(70, 70, 70, 90),
        )
        overlay_draw.text(
            (x, y),
            line,
            font=font,
            fill=(255, 255, 255, 255),
            stroke_width=stroke,
            stroke_fill=(255, 255, 255, 220),
        )
        mask_draw.text(
            (x + shadow_offset, y + shadow_offset),
            line,
            font=font,
            fill=160,
            stroke_width=stroke,
            stroke_fill=120,
        )
        mask_draw.text(
            (x, y),
            line,
            font=font,
            fill=255,
            stroke_width=stroke,
            stroke_fill=235,
        )
        y += line_height + leading

    return overlay, mask.filter(ImageFilter.GaussianBlur(radius=0.35))


def rectangular_asset(image: Image.Image, bbox: tuple[int, int, int, int]) -> tuple[Image.Image, Image.Image]:
    x, y, w, h = bbox
    crop = image.convert("RGBA").crop((x, y, x + w, y + h))
    mask = Image.new("L", (w, h), 255)
    crop.putalpha(mask)
    full_mask = Image.new("L", image.size, 0)
    full_mask.paste(mask, (x, y))
    return crop, full_mask


def save_layer_files(
    project_dir: Path,
    layer_id: str,
    asset: Image.Image,
    mask: Image.Image | None = None,
) -> tuple[str, str | None]:
    asset_path = project_dir / "layers" / f"{layer_id}.png"
    asset.save(asset_path)
    mask_rel: str | None = None
    if mask is not None:
        mask_path = project_dir / "masks" / f"{layer_id}_mask.png"
        mask.convert("L").save(mask_path)
        mask_rel = f"masks/{layer_id}_mask.png"
    return f"layers/{layer_id}.png", mask_rel


def asset_rel_from_url(project_id: str, asset_url: str) -> str:
    marker = f"/assets/{project_id}/"
    if marker in asset_url:
        return asset_url.split(marker, 1)[1].split("?", 1)[0]
    parts = asset_url.split("/")
    try:
        idx = parts.index(project_id)
        return "/".join(parts[idx + 1 :])
    except ValueError:
        return asset_url


def compose_manifest(project_dir: Path, manifest: dict, transforms: dict[str, dict], transparent: bool) -> Image.Image:
    source = Image.open(project_dir / "original.png").convert("RGBA")
    canvas = Image.new("RGBA", source.size, (0, 0, 0, 0) if transparent else (255, 255, 255, 255))
    layers = sorted(manifest["layers"], key=lambda item: transforms.get(item["id"], {}).get("order", item["order"]))
    for layer in layers:
        transform = transforms.get(layer["id"], {})
        if not transform.get("visible", layer.get("visible", True)):
            continue
        asset_url = layer.get("asset_url")
        if not asset_url:
            continue
        rel = asset_rel_from_url(manifest["project_id"], asset_url)
        asset = Image.open(project_dir / rel).convert("RGBA")
        x = transform.get("x", layer["bbox"]["x"])
        y = transform.get("y", layer["bbox"]["y"])
        canvas.alpha_composite(asset, (int(x), int(y)))
    return canvas
