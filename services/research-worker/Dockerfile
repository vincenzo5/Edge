# syntax=docker/dockerfile:1.7

FROM python:3.12-slim

WORKDIR /worker

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN groupadd -r research && useradd -r -g research -d /worker research

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY run_cell.py ./

RUN chown -R research:research /worker

USER research

ENTRYPOINT ["python", "/worker/run_cell.py"]
