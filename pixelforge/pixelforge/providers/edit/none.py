"""Sentinel image-edit provider used when no real provider is configured."""


class DisabledImageEditProvider:
    name = "none"
    available = False
    reason = "Image edit provider is disabled"

    def edit_product_replacement(self, *args, **kwargs):  # noqa: D401
        return None
