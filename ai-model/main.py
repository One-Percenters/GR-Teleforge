from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
from typing import List, Dict, Any

app = FastAPI(title="HackToyota AI Model API")

# Enable CORS for Node.js backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response models
class PredictionRequest(BaseModel):
    data: List[float]
    
class PredictionResponse(BaseModel):
    prediction: str
    confidence: float
    timestamp: str

@app.get("/")
def read_root():
    return {
        "message": "HackToyota AI Model API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/predict", response_model=PredictionResponse)
def predict(request: PredictionRequest):
    """
    Mock prediction endpoint - replace with your actual model later
    """
    from datetime import datetime
    
    # Mock prediction logic (replace with your trained model)
    prediction_value = "Sample Prediction Result"
    confidence_score = float(np.random.random())
    
    return PredictionResponse(
        prediction=prediction_value,
        confidence=confidence_score,
        timestamp=datetime.now().isoformat()
    )

@app.get("/model-info")
def model_info():
    """
    Return information about the model
    """
    return {
        "model_name": "Stolen Fund Thesis Model",
        "version": "0.1.0",
        "status": "mock",
        "description": "AI model for race telemetry analysis"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
