"""
Train RandomForest and XGBoost classifiers on sample (or custom) flood dataset.
Writes joblib models + training_metadata.json to ml-model/models/
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier

ROOT = Path(__file__).resolve().parents[1]
DATA_DEFAULT = ROOT / "data" / "sample_flood_training.csv"
MODEL_DIR = ROOT / "models"


def build_xy(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    feature_cols = ["rainfall_mm", "elevation_m", "distance_to_river_km", "soil_type_encoded"]
    X = df[feature_cols]
    y = df["risk_label"].str.upper()
    return X, y


def train_rf(X_train, y_train) -> Pipeline:
    pipe = Pipeline(
        steps=[
            ("scaler", StandardScaler()),
            (
                "clf",
                RandomForestClassifier(
                    n_estimators=200,
                    max_depth=8,
                    class_weight="balanced",
                    random_state=42,
                ),
            ),
        ]
    )
    pipe.fit(X_train, y_train)
    return pipe


def train_xgb(X_train, y_train) -> Pipeline:
    pipe = Pipeline(
        steps=[
            ("scaler", StandardScaler()),
            (
                "clf",
                XGBClassifier(
                    n_estimators=180,
                    max_depth=5,
                    learning_rate=0.08,
                    subsample=0.9,
                    colsample_bytree=0.9,
                    random_state=42,
                    objective="multi:softprob",
                ),
            ),
        ]
    )
    pipe.fit(X_train, y_train)
    return pipe


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, default=DATA_DEFAULT)
    args = parser.parse_args()

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    df = pd.read_csv(args.data)
    X, y = build_xy(df)
    try:
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)
    except ValueError:
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42)

    rf = train_rf(X_train, y_train)
    xgb = train_xgb(X_train, y_train)

    joblib.dump(rf, MODEL_DIR / "random_forest.joblib")
    joblib.dump(xgb, MODEL_DIR / "xgboost.joblib")

    reports = {
        "random_forest": classification_report(y_test, rf.predict(X_test), output_dict=True),
        "xgboost": classification_report(y_test, xgb.predict(X_test), output_dict=True),
    }
    (MODEL_DIR / "training_metadata.json").write_text(json.dumps(reports, indent=2), encoding="utf-8")
    print("Saved models to", MODEL_DIR)


if __name__ == "__main__":
    main()
