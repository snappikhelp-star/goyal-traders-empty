from fastapi import FastAPI

app = FastAPI()


@app.get("/api/")
def root():
    return {"status": "ok", "service": "paintflow-crm backend stub"}


@app.get("/api/health")
def health():
    return {"status": "healthy"}
