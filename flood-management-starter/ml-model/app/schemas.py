from typing import Literal, Optional

from pydantic import BaseModel, Field


SoilType = Literal["clay", "loam", "sand", "silt", "rocky"]


class PredictRiskRequest(BaseModel):
    rainfall: float = Field(..., description="Rainfall in mm (recent window)")
    elevation: float = Field(..., description="Elevation in meters")
    distance_to_river: float = Field(..., description="Distance to nearest river in km")
    soil_type: SoilType
    model: Optional[Literal["random_forest", "xgboost"]] = None


class PredictRiskResponse(BaseModel):
    risk: Literal["SAFE", "WARNING", "DANGER"]
    model: Literal["random_forest", "xgboost", "heuristic"]
    probabilities: dict[str, float]


class SoilEncoding:
    MAP = {"clay": 0, "loam": 1, "sand": 2, "silt": 3, "rocky": 4}

    @classmethod
    def encode(cls, soil: str) -> int:
        return cls.MAP.get(soil, 1)


class LSTMPredictRequest(BaseModel):
    rainfall_sequence_mm: list[float] = Field(..., min_length=6, max_length=168)


class LSTMPredictResponse(BaseModel):
    next_hour_rainfall_mm: float
    model_available: bool
    note: str = ""
