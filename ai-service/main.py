
from fastapi import FastAPI

app = FastAPI(
    title="Commonsense AI Service",
    description="NLP and intelligent resource matching",
    version="1.0.0"
)

@app.get("/health")
def health():
    return {
        "success": True,
        "message": "Commonsense AI Service is running"
    }
