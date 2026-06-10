"""Sentinel repair provider used when no provider is configured."""


class DisabledRepairProvider:
    name = "none"
    available = False
    reason = "Repair provider is disabled"

    def repair(self, *args, **kwargs):  # noqa: D401
        return None
