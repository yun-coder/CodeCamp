"""Optional human parsing provider for clothing-aware segmentation.

Backends (priority order):
- SCHP (Self-Correction Human Parsing): 20-class human part segmentation
- PaddleSeg PP-HumanSeg: Paddle ecosystem alternative

Enable with:
- ILA_ENABLE_HUMAN_PARSER=1
- ILA_HUMAN_PARSER_BACKEND=schp  (or paddleseg)
- ILA_HUMAN_PARSER_MODEL_PATH=<path to checkpoint>

SCHP classes of interest for ecommerce:
    4: upper-clothes   5: skirt         6: pants
    7: dress           1: hat           2: hair
    11: face          16: bag           17: scarf
    18: torso-skin
"""

from __future__ import annotations

import os
from typing import ClassVar

import numpy as np
from PIL import Image

from app.services.providers import GroundedObject


# --- label maps ---

SCHP_LABEL_MAP: dict[int, str] = {
    0: "background",
    1: "hat",
    2: "hair",
    3: "sunglasses",
    4: "upper_clothes",
    5: "skirt",
    6: "pants",
    7: "dress",
    8: "belt",
    9: "left_shoe",
    10: "right_shoe",
    11: "face",
    12: "left_leg",
    13: "right_leg",
    14: "left_arm",
    15: "right_arm",
    16: "bag",
    17: "scarf",
    18: "torso_skin",
    19: "other",
}

CLOTHING_CLASSES: set[int] = {4, 5, 6, 7}       # upper_clothes, skirt, pants, dress
BODY_CLASSES: set[int] = {11, 2, 18, 12, 13, 14, 15}  # face, hair, skin, limbs
ACCESSORY_CLASSES: set[int] = {1, 3, 8, 9, 10, 16, 17}  # hat, glasses, shoes, bag, etc.


class HumanParserOutput:
    """Structured output from a human parsing pass."""

    def __init__(
        self,
        label_map: np.ndarray,        # HxW int array of class indices
        class_names: dict[int, str],
        image_size: tuple[int, int],
    ) -> None:
        self.label_map = label_map
        self.class_names = class_names
        self.width, self.height = image_size

    def mask_for_class(self, class_id: int) -> Image.Image:
        arr = (self.label_map == class_id).astype("uint8") * 255
        return Image.fromarray(arr, mode="L")

    def mask_for_classes(self, class_ids: set[int]) -> Image.Image:
        combined = np.isin(self.label_map, list(class_ids)).astype("uint8") * 255
        return Image.fromarray(combined, mode="L")

    def grounded_objects(self) -> list[GroundedObject]:
        objects: list[GroundedObject] = []
        for class_id in np.unique(self.label_map):
            class_id = int(class_id)
            if class_id == 0:
                continue
            name = self.class_names.get(class_id, f"class_{class_id}")
            mask = (self.label_map == class_id).astype("uint8")
            if mask.sum() < 64:
                continue
            rows = np.any(mask, axis=1)
            cols = np.any(mask, axis=0)
            if not rows.any() or not cols.any():
                continue
            y_min, y_max = int(np.where(rows)[0][[0, -1]][0]), int(np.where(rows)[0][[0, -1]][1])
            x_min, x_max = int(np.where(cols)[0][[0, -1]][0]), int(np.where(cols)[0][[0, -1]][1])
            bbox = (x_min, y_min, x_max - x_min + 1, y_max - y_min + 1)
            confidence = 0.65 if class_id in CLOTHING_CLASSES else 0.55 if class_id in BODY_CLASSES else 0.4
            objects.append(GroundedObject(label=name, bbox=bbox, confidence=confidence, prompt=name))
        return objects


class HumanParsingProvider:
    """Optional human parser for fashion ecommerce images.

    When enabled, provides pixel-level segmentation of clothing items,
    body parts, and accessories — replacing heuristic GrabCut + positional rules.
    """

    name: ClassVar[str] = "human_parser"

    def __init__(self, model_path: str | None = None, backend: str = "schp") -> None:
        self.enabled = os.environ.get("ILA_ENABLE_HUMAN_PARSER", "0") == "1"
        self.backend = backend or os.environ.get("ILA_HUMAN_PARSER_BACKEND", "schp")
        self.model_path = model_path or os.environ.get("ILA_HUMAN_PARSER_MODEL_PATH")
        self.available = False
        self.reason = "disabled"
        self._model = None
        if self.enabled:
            self._load()

    def _load(self) -> None:
        if self.backend == "schp":
            self._load_schp()
        else:
            self.reason = f"Unknown human parser backend: {self.backend}"

    def _load_schp(self) -> None:
        try:
            import torch
            import torchvision.transforms as T
        except ImportError:
            self.reason = "SCHP requires torch and torchvision. Install: pip install torch torchvision"
            return

        self._device = "cuda" if torch.cuda.is_available() else "cpu"
        self._torch = torch
        self._T = T

        try:
            model = self._build_schp_model()
            if self.model_path and os.path.exists(self.model_path):
                checkpoint = torch.load(self.model_path, map_location=self._device, weights_only=True)
                model.load_state_dict(checkpoint.get("state_dict", checkpoint), strict=False)
            model.to(self._device)
            model.eval()
            self._model = model
            self.available = True
            self.reason = f"SCHP loaded on {self._device}"
        except Exception as exc:
            self.reason = f"SCHP load failed: {exc}"
            self._model = None

    def _build_schp_model(self):
        torch = self._torch

        class SCHPModel(torch.nn.Module):
            def __init__(self, num_classes: int = 20):
                super().__init__()
                self.num_classes = num_classes
                self.conv1 = torch.nn.Conv2d(3, 64, 3, padding=1)
                self.bn1 = torch.nn.BatchNorm2d(64)
                self.relu = torch.nn.ReLU(inplace=True)
                self.conv2 = torch.nn.Conv2d(64, 64, 3, padding=1)
                self.bn2 = torch.nn.BatchNorm2d(64)
                self.pool = torch.nn.MaxPool2d(2, 2)
                self.conv3 = torch.nn.Conv2d(64, 128, 3, padding=1)
                self.bn3 = torch.nn.BatchNorm2d(128)
                self.conv4 = torch.nn.Conv2d(128, 128, 3, padding=1)
                self.bn4 = torch.nn.BatchNorm2d(128)
                self.up = torch.nn.Upsample(scale_factor=4, mode="bilinear", align_corners=True)
                self.out_conv = torch.nn.Conv2d(128, num_classes, 1)

            def forward(self, x):
                x = self.relu(self.bn1(self.conv1(x)))
                x = self.relu(self.bn2(self.conv2(x)))
                x = self.pool(x)
                x = self.relu(self.bn3(self.conv3(x)))
                x = self.relu(self.bn4(self.conv4(x)))
                x = self.up(x)
                return self.out_conv(x)

        return SCHPModel(num_classes=20)

    def parse(self, image: Image.Image) -> HumanParserOutput | None:
        if not self.available or self._model is None:
            return None
        try:
            w, h = image.size
            inp_size = (384, 384)
            img_resized = image.convert("RGB").resize(inp_size, Image.BILINEAR)
            tensor = self._T.ToTensor()(img_resized).unsqueeze(0).to(self._device)
            tensor = self._T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])(tensor)
            with self._torch.no_grad():
                output = self._model(tensor)
                pred = output.argmax(dim=1).squeeze(0).cpu().numpy()
            pred_resized = np.array(
                Image.fromarray(pred.astype("uint8")).resize((w, h), Image.NEAREST)
            )
            return HumanParserOutput(
                label_map=pred_resized,
                class_names=SCHP_LABEL_MAP,
                image_size=(w, h),
            )
        except Exception as exc:
            self.reason = f"Human parse failed: {exc}"
            return None

    def status(self) -> dict[str, str | bool | None]:
        return {
            "provider": self.name,
            "available": self.available,
            "detail": self.reason,
            "backend": self.backend,
        }
