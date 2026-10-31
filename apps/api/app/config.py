"""
Application Configuration
Swasthya Sense — Cardiac Follow-Up & Early-Warning Prototype
"""

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT_DIR: Path = Path(__file__).resolve().parent.parent.parent.parent


class Settings(BaseSettings):
    PROJECT_NAME: str = "Swasthya Sense API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = False

    # Paths - resolve relative to repository root
    ROOT_DIR: Path = ROOT_DIR
    WEB_DIST_DIR: Path = ROOT_DIR / "apps" / "web" / "dist"

    # CORS configuration for React / Vite development
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",
    ]

    # Clinical Prototype Disclaimer
    CLINICAL_DISCLAIMER: str = (
        "PROTOTYPE — SYNTHETIC DATA ONLY — NOT A MEDICAL DEVICE: This system is a technology "
        "demonstration for cardiac follow-up workflows and does not provide formal diagnosis or medical advice."
    )

    # Supabase (configured in Phase 2)
    SUPABASE_URL: str = "http://localhost:54321"
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""

    # Groq (configured in Phase 6)
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # Tesseract OCR
    TESSERACT_CMD: str = r"C:\Users\Shrey\AppData\Local\Programs\Tesseract-OCR\tesseract.exe"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
