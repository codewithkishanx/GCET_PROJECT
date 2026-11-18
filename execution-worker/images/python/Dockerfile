FROM python:3.12-alpine

# Runs as an unprivileged user; the working directory is a size-limited tmpfs
# provided by the sandbox at runtime and the source mount is read-only.
USER 65534:65534
WORKDIR /work

CMD ["python3", "--version"]
