from app.models import ThirdPartySettings
from app.services.providers import PaddleOCRCloudProvider, _objects_from_ocr_data, _objects_from_markdown


def test_paddleocr_cloud_pruned_result_parser():
    data = {
        "rec_texts": ["Cloud OCR"],
        "rec_scores": [0.88],
        "rec_boxes": [[5, 8, 105, 40]],
    }

    objects = _objects_from_ocr_data(data, 0.25)

    assert len(objects) == 1
    assert objects[0].label == "Cloud OCR"
    assert objects[0].bbox == (5, 8, 100, 32)


def test_paddleocr_cloud_layout_markdown_parser():
    provider = PaddleOCRCloudProvider(
        ThirdPartySettings(
            paddleocr_access_token="test-token",
            paddleocr_model="PaddleOCR-VL-1.6",
        )
    )
    result = {
        "layoutParsingResults": [
            {
                "markdown": {
                    "text": "# SALE\n\nOnly today",
                }
            }
        ]
    }

    objects = provider._objects_from_result(result, (400, 300))

    assert [item.label for item in objects] == ["SALE", "Only today"]
    assert all(item.confidence == 1.0 for item in objects)


def test_paddleocr_cloud_jobs_url_accepts_base_or_full_path():
    assert (
        PaddleOCRCloudProvider._jobs_url("https://paddleocr.aistudio-app.com")
        == "https://paddleocr.aistudio-app.com/api/v2/ocr/jobs"
    )
    assert (
        PaddleOCRCloudProvider._jobs_url("https://paddleocr.aistudio-app.com/api/v2/ocr/jobs")
        == "https://paddleocr.aistudio-app.com/api/v2/ocr/jobs"
    )


def test_paddleocr_markdown_parser_builds_stable_boxes():
    objects = _objects_from_markdown("A\nB", (200, 100))

    assert [item.label for item in objects] == ["A", "B"]
    assert objects[0].bbox[2] > 0
    assert objects[1].bbox[1] > objects[0].bbox[1]


def test_paddleocr_markdown_parser_drops_image_placeholders():
    objects = _objects_from_markdown('<div><img src="x"></div>\n# GO\n![image](x)\nCLICK IT', (750, 1066))

    assert [item.label for item in objects] == ["GO", "CLICK IT"]
