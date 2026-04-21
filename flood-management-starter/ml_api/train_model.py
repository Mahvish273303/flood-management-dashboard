# ml_api/train_model.py
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report
import joblib
import os

DATA_PATH = "data/flood_data.csv"
OUT_MODEL = "model.pkl"

def load_and_prepare():
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"{DATA_PATH} not found!")

    df = pd.read_csv(DATA_PATH)

    # Features = all columns except FloodProbability
    X = df.drop(columns=["FloodProbability"])
    y_prob = df["FloodProbability"]

    # Convert probability to classes
    def prob_to_label(p):
        if p <= 0.4:
            return "Normal"
        elif p <= 0.6:
            return "Moderate"
        else:
            return "High"

    y = y_prob.apply(prob_to_label)

    return X, y

def train_and_save():
    X, y = load_and_prepare()
    le = LabelEncoder()
    y_enc = le.fit_transform(y)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y_enc, test_size=0.2, random_state=42, stratify=y_enc
    )

    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("rf", RandomForestClassifier(n_estimators=200, random_state=42, class_weight="balanced"))
    ])

    print("Training model...")
    pipeline.fit(X_train, y_train)

    print("Evaluating...")
    preds = pipeline.predict(X_test)
    print(classification_report(y_test, preds, target_names=le.classes_))

    # Save both pipeline and encoder
    joblib.dump({"pipeline": pipeline, "label_encoder": le, "features": X.columns.tolist()}, OUT_MODEL)
    print(f"✅ Model saved as {OUT_MODEL}")

if __name__ == "__main__":
    train_and_save()
