
from fastapi import FastAPI

from app.routes.matching import router as matching_router

app = FastAPI(
    title="Commonsense AI Service",
    description="Intelligent Community Resource Matching Engine",
    version="1.0.0",
)

app.include_router(matching_router)


@app.get("/")
def home():
    return {
        "success": True,
        "message": "Commonsense AI Service is running!"
    }


@app.get("/health")
def health_check():
    return {
        "success": True,
        "service": "Commonsense AI",
        "status": "healthy"
    }
