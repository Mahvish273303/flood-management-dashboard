from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.lstm_service import lstm_service
from app.model_service import model_service
from app.schemas import LSTMPredictRequest, LSTMPredictResponse, PredictRiskRequest, PredictRiskResponse

app = FastAPI(title="Flood Risk ML API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, object]:
    return {
        "status": "ok",
        "models_loaded": model_service.available_models(),
        "lstm_available": lstm_service.available,
    }


@app.post("/predict-risk", response_model=PredictRiskResponse)
def predict_risk(body: PredictRiskRequest) -> PredictRiskResponse:
    requested = body.model
    if requested and requested not in model_service.available_models():
        requested = None

    risk, used_model, probs = model_service.predict(
        rainfall=body.rainfall,
        elevation=body.elevation,
        distance_to_river=body.distance_to_river,
        soil_type=body.soil_type,
        model=requested,
    )
    return PredictRiskResponse(risk=risk, model=used_model, probabilities=probs)


@app.post("/predict-rainfall-lstm", response_model=LSTMPredictResponse)
def predict_rainfall_lstm(body: LSTMPredictRequest) -> LSTMPredictResponse:
    val, note = lstm_service.predict_next(body.rainfall_sequence_mm)
    return LSTMPredictResponse(
        next_hour_rainfall_mm=val,
        model_available=lstm_service.available,
        note=note,
    )


def run() -> None:
    import uvicorn

    uvicorn.run("app.main:app", host=settings.ml_host, port=settings.ml_port, reload=False)


if __name__ == "__main__":
    run()
