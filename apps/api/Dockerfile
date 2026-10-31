FROM python:3.11-slim AS runner

ARG GIT_SHA
LABEL org.opencontainers.image.revision=$GIT_SHA
RUN echo -n "${GIT_SHA}" > /version.txt

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    tesseract-ocr \
    tesseract-ocr-hin \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

COPY --chown=appuser:appuser apps/api ./apps/api

USER appuser

ENV PYTHONUNBUFFERED=1 \
    PORT=8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

EXPOSE 8000

CMD ["uvicorn", "apps.api.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
