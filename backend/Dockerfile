# ---- Runtime: Python + Gunicorn ----
FROM python:3.12-slim AS runtime

# Evita prompts de apt
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# Dependencias del sistema (si necesitas psycopg2, mysqlclient, etc. agrega aquí)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiamos requirements primero para aprovechar el cache
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copiamos el resto del código
COPY backend/ /app/

# Variables por defecto (puedes sobreescribirlas con .env/Compose)
ENV GUNICORN_BIND=0.0.0.0:8000 \
    GUNICORN_WORKERS=2 \
    GUNICORN_THREADS=2 \
    GUNICORN_TIMEOUT=60 \
    GUNICORN_APP=app:app

# Salud básica
HEALTHCHECK --interval=30s --timeout=5s --retries=5 CMD curl -f http://localhost:8000/health || exit 1

# Arranque con gunicorn
CMD gunicorn "$GUNICORN_APP" \
    --bind "$GUNICORN_BIND" \
    --workers "$GUNICORN_WORKERS" \
    --threads "$GUNICORN_THREADS" \
    --timeout "$GUNICORN_TIMEOUT"
