from __future__ import annotations

import argparse
import os
from pathlib import Path

from PIL import Image
from pillow_heif import register_heif_opener
from rembg import new_session, remove


SUPPORTED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".heic", ".heif", ".avif"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Remove backgrounds from images in bulk.")
    parser.add_argument("input_dir", type=Path, help="Directory containing source images")
    parser.add_argument("--transparent-dir", type=Path, default=Path("imports/images-cutout-transparent"))
    parser.add_argument("--preview-dir", type=Path, default=Path("imports/images-cutout-preview"))
    parser.add_argument("--model", default="isnet-general-use", help="rembg model name")
    parser.add_argument("--canvas-size", type=int, default=2048, help="Square output size in pixels")
    parser.add_argument("--subject-scale", type=float, default=0.82, help="Max fraction of canvas used by the subject")
    parser.add_argument("--bottom-padding", type=float, default=0.06, help="Bottom padding as a fraction of canvas size")
    parser.add_argument("--overwrite", action="store_true", help="Replace existing outputs")
    return parser.parse_args()


def iter_images(input_dir: Path) -> list[Path]:
    return sorted(
        path for path in input_dir.rglob("*")
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS
    )


def output_path(root: Path, input_dir: Path, source_path: Path) -> Path:
    relative = source_path.relative_to(input_dir).with_suffix(".png")
    return root / relative


def build_checkerboard_background(size: tuple[int, int], tile_size: int = 128) -> Image.Image:
    background = Image.new("RGBA", size, (0, 0, 0, 0))
    light = (235, 235, 235, 255)
    dark = (205, 205, 205, 255)
    width, height = size

    for y in range(0, height, tile_size):
        for x in range(0, width, tile_size):
            color = light if ((x // tile_size) + (y // tile_size)) % 2 == 0 else dark
            tile = Image.new("RGBA", (min(tile_size, width - x), min(tile_size, height - y)), color)
            background.alpha_composite(tile, (x, y))

    return background


def save_preview_variant(image: Image.Image, destination: Path) -> None:
    preview_bg = build_checkerboard_background(image.size)
    preview_bg.alpha_composite(image)
    preview_bg.save(destination, format="PNG")


def normalize_cutout(image: Image.Image, canvas_size: int, subject_scale: float, bottom_padding: float) -> Image.Image:
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if bbox is None:
        return Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))

    subject = image.crop(bbox)
    subject_width, subject_height = subject.size
    max_subject_size = max(subject_width, subject_height)
    target_size = max(1, round(canvas_size * subject_scale))
    resize_ratio = min(target_size / max_subject_size, 1.0)
    resized_width = max(1, round(subject_width * resize_ratio))
    resized_height = max(1, round(subject_height * resize_ratio))
    resized_subject = subject.resize((resized_width, resized_height), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    x = (canvas_size - resized_width) // 2
    bottom_margin = round(canvas_size * bottom_padding)
    y = canvas_size - bottom_margin - resized_height
    y = max(0, min(y, canvas_size - resized_height))
    canvas.alpha_composite(resized_subject, (x, y))
    return canvas


def main() -> int:
    args = parse_args()
    input_dir = args.input_dir.expanduser().resolve()
    transparent_dir = args.transparent_dir.expanduser().resolve()
    preview_dir = args.preview_dir.expanduser().resolve()

    if not input_dir.exists():
        raise SystemExit(f"Input directory does not exist: {input_dir}")

    register_heif_opener()
    images = iter_images(input_dir)
    if not images:
        raise SystemExit(f"No supported images found in {input_dir}")

    transparent_dir.mkdir(parents=True, exist_ok=True)
    preview_dir.mkdir(parents=True, exist_ok=True)

    session = new_session(args.model)
    failures = 0

    for source_path in images:
        transparent_path = output_path(transparent_dir, input_dir, source_path)
        preview_path = output_path(preview_dir, input_dir, source_path)

        if not args.overwrite and transparent_path.exists() and preview_path.exists():
            print(f"Skipping existing: {source_path.name}")
            continue

        transparent_path.parent.mkdir(parents=True, exist_ok=True)
        preview_path.parent.mkdir(parents=True, exist_ok=True)

        try:
            with Image.open(source_path) as image:
                rgba_image = image.convert("RGBA")
                cutout = remove(rgba_image, session=session).convert("RGBA")
                normalized = normalize_cutout(
                    cutout,
                    canvas_size=args.canvas_size,
                    subject_scale=args.subject_scale,
                    bottom_padding=args.bottom_padding,
                )
                normalized.save(transparent_path, format="PNG")
                save_preview_variant(normalized, preview_path)
            print(f"Processed: {source_path}")
        except Exception as error:  # noqa: BLE001
            failures += 1
            print(f"Failed: {source_path}: {error}")

    print(f"Finished {len(images)} image(s) with {failures} failure(s).")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
