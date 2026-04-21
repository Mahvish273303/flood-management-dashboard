"""
Optional: train a tiny LSTM on synthetic rainfall sequences (requires tensorflow).
Install: pip install -r requirements-lstm.txt
"""
from __future__ import annotations

from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / "models"


def synthetic_dataset(n: int = 2000, seq: int = 24) -> tuple[np.ndarray, np.ndarray]:
    rng = np.random.default_rng(42)
    X = rng.uniform(0, 80, size=(n, seq, 1)).astype(np.float32)
    trend = np.mean(X[:, -6:, :], axis=1) * 1.05
    noise = rng.normal(0, 3, size=(n, 1)).astype(np.float32)
    y = np.clip(trend + noise, 0, None)
    return X, y.astype(np.float32)


def main() -> None:
    try:
        from tensorflow import keras  # type: ignore
        from tensorflow.keras import layers  # type: ignore
    except ImportError as e:  # pragma: no cover
        raise SystemExit("TensorFlow not installed. Use: pip install -r requirements-lstm.txt") from e

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    X, y = synthetic_dataset()
    model = keras.Sequential(
        [
            layers.Input(shape=(X.shape[1], 1)),
            layers.LSTM(32, return_sequences=False),
            layers.Dense(16, activation="relu"),
            layers.Dense(1, activation="relu"),
        ]
    )
    model.compile(optimizer="adam", loss="mse", metrics=["mae"])
    model.fit(X, y, epochs=12, batch_size=64, validation_split=0.1, verbose=1)
    out_path = MODEL_DIR / "lstm_rainfall.keras"
    model.save(out_path)
    print("Saved", out_path)


if __name__ == "__main__":
    main()
