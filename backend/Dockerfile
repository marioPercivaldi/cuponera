# ---- Python + Poetry + Gunicorn ----
FROM python:3.12-slim AS runtime

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    POETRY_VERSION=1.8.3 \
    POETRY_HOME=/opt/poetry \
    POETRY_NO_INTERACTION=1 \
    POETRY_VIRTUALENVS_CREATE=false

# Paquetes del sistema que suelen hacer falta para compilar deps y healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl \
 && rm -rf /var/lib/apt/lists/*

# Instalar Poetry vía pip (simple y reproducible)
RUN pip install "poetry==${POETRY_VERSION}"

WORKDIR /app

# ---- Capa de dependencias (cache-friendly) ----
# Copiamos solo manifestos primero para cachear el 'poetry install'
COPY backend/pyproject.toml backend/poetry.lock* /app/

# Instalar solo las dependencias de producción (no dev)
# --no-root: no instala el propio paquete si tu backend es empacable
RUN poetry install --only main --no-root

# ---- Código de la app ----
COPY backend/ /app/

# Vars por defecto (podés override con .env o compose)
ENV GUNICORN_BIND=0.0.0.0:8000 \
    GUNICORN_WORKERS=2 \
    GUNICORN_THREADS=2 \
    GUNICORN_TIMEOUT=60 \
    GUNICORN_APP=app:app

# Healthcheck simple (requiere endpoint /health en tu Flask)
HEALTHCHECK --interval=30s --timeout=5s --retries=5 \
  CMD curl -fsS http://localhost:8000/health || exit 1

# Arranque con Gunicorn (usando las envs de arriba)
CMD ["sh","-c","gunicorn \"$GUNICORN_APP\" --bind \"$GUNICORN_BIND\" --workers \"$GUNICORN_WORKERS\" --threads \"$GUNICORN_THREADS\" --timeout \"$GUNICORN_TIMEOUT\""]
