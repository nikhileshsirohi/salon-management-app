import re


PHONE_PATTERN = re.compile(r"^\+[1-9]\d{7,14}$")


def normalize_phone_number(value: str | None) -> str | None:
    if value is None:
        return None

    stripped = value.strip()
    if not stripped:
        return None

    if stripped.startswith("+"):
        digits = re.sub(r"\D", "", stripped[1:])
        normalized = f"+{digits}"
    else:
        digits = re.sub(r"\D", "", stripped)
        normalized = f"+91{digits}" if len(digits) == 10 else f"+{digits}"

    if not PHONE_PATTERN.fullmatch(normalized):
        raise ValueError("phone must include a valid country code, for example +91 9876543210")

    return normalized
