FROM docker:29.9.2-cli
RUN apk add --no-cache python3
WORKDIR /runner
COPY runner/service.py /runner/service.py
CMD ["python3", "/runner/service.py"]
