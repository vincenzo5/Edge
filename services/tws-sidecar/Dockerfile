# syntax=docker/dockerfile:1.7

FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TWS_SIDECAR_BIND=0.0.0.0 \
    TWS_SIDECAR_PORT=8765

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py ./
COPY tws_sidecar ./tws_sidecar

EXPOSE 8765

CMD ["python", "main.py"]
