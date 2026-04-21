from __future__ import annotations

from pathlib import Path

import numpy as np

from app.config import settings

try:
    from tensorflow import keras  # type: ignore

    _TF = True
except Exception:  # pragma: no cover - optional dependency
    keras = None  # type: ignore
    _TF = False


class LSTMService:
    def __init__(self) -> None:
        self._model = None
        path = settings.model_dir / "lstm_rainfall.keras"
        if _TF and path.exists():
            self._model = keras.models.load_model(path)  # type: ignore[union-attr]

    @property
    def available(self) -> bool:
        return self._model is not None

    def predict_next(self, sequence_mm: list[float]) -> tuple[float, str]:
        if not self.available or self._model is None:
            tail = float(np.mean(sequence_mm[-6:]))
            return float(max(0.0, tail * 0.95)), "Heuristic fallback (train LSTM with scripts/train_lstm.py)"

        arr = np.array(sequence_mm, dtype=np.float32).reshape(1, len(sequence_mm), 1)
        out = float(self._model.predict(arr, verbose=0)[0][0])
        return max(0.0, out), "LSTM"


lstm_service = LSTMService()
