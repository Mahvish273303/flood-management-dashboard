from __future__ import annotations

import json
from pathlib import Path
from typing import Literal

import joblib
import numpy as np

from app.config import settings
from app.schemas import SoilEncoding

RiskLabel = Literal["SAFE", "WARNING", "DANGER"]
ModelName = Literal["random_forest", "xgboost"]

LABEL_CLASSES: list[RiskLabel] = ["DANGER", "SAFE", "WARNING"]


class ModelService:
    def __init__(self) -> None:
        self._models: dict[ModelName, object | None] = {"random_forest": None, "xgboost": None}
        self._metadata: dict[str, object] = {}
        self._load()

    def _model_paths(self) -> dict[ModelName, Path]:
        base = settings.model_dir
        return {
            "random_forest": base / "random_forest.joblib",
            "xgboost": base / "xgboost.joblib",
        }

    def _load(self) -> None:
        meta_path = settings.model_dir / "training_metadata.json"
        if meta_path.exists():
            self._metadata = json.loads(meta_path.read_text(encoding="utf-8"))

        for name, path in self._model_paths().items():
            if path.exists():
                self._models[name] = joblib.load(path)

    def available_models(self) -> list[ModelName]:
        return [k for k, v in self._models.items() if v is not None]

    def predict(
        self,
        rainfall: float,
        elevation: float,
        distance_to_river: float,
        soil_type: str,
        model: ModelName | None,
    ) -> tuple[RiskLabel, ModelName, dict[str, float]]:
        resolved: ModelName = model or (settings.default_model if settings.default_model in self._models else "random_forest")  # type: ignore[assignment]
        if self._models.get(resolved) is None:
            for fallback in ("random_forest", "xgboost"):
                if self._models.get(fallback) is not None:
                    resolved = fallback  # type: ignore[assignment]
                    break
        clf = self._models.get(resolved)
        if clf is None:
            risk = self._heuristic_risk(rainfall, elevation, distance_to_river, soil_type)
            probs = {risk: 1.0, **{x: 0.0 for x in LABEL_CLASSES if x != risk}}
            return risk, "heuristic", probs

        X = np.array(
            [[rainfall, elevation, distance_to_river, SoilEncoding.encode(soil_type)]],
            dtype=float,
        )
        pred_idx = int(clf.predict(X)[0])
        classes = list(getattr(clf, "classes_", LABEL_CLASSES))
        if pred_idx < 0 or pred_idx >= len(classes):
            risk = self._heuristic_risk(rainfall, elevation, distance_to_river, soil_type)
            return risk, resolved, {risk: 1.0}

        risk = str(classes[pred_idx]).upper()
        if hasattr(clf, "predict_proba"):
            proba = clf.predict_proba(X)[0]
            probs = {str(classes[i]).upper(): float(proba[i]) for i in range(len(classes))}
        else:
            probs = {risk: 1.0}
        return risk, resolved, probs  # type: ignore[return-value]

    @staticmethod
    def _heuristic_risk(rainfall: float, elevation: float, distance_to_river: float, soil_type: str) -> RiskLabel:
        score = 0.0
        score += max(0, rainfall - 20) * 0.04
        score += max(0, 150 - elevation) * 0.02
        score += max(0, 3 - distance_to_river) * 1.2
        if soil_type in ("clay", "silt"):
            score += 1.0
        if score < 4:
            return "SAFE"
        if score < 9:
            return "WARNING"
        return "DANGER"


model_service = ModelService()
