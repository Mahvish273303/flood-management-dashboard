from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib

# Load model
model_bundle = joblib.load("model.pkl")
pipeline = model_bundle["pipeline"]
label_encoder = model_bundle["label_encoder"]
features = model_bundle["features"]

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dynamic Pydantic model
class Item(BaseModel):
    MonsoonIntensity: float
    TopographyDrainage: float
    RiverManagement: float
    Deforestation: float
    Urbanization: float
    ClimateChange: float
    DamsQuality: float
    Siltation: float
    AgriculturalPractices: float
    Encroachments: float
    IneffectiveDisasterPreparedness: float
    DrainageSystems: float
    CoastalVulnerability: float
    Landslides: float
    Watersheds: float
    DeterioratingInfrastructure: float
    PopulationScore: float
    WetlandLoss: float
    InadequatePlanning: float
    PoliticalFactors: float

@app.post("/predict")
def predict(item: Item):
    X = [[getattr(item, f) for f in features]]
    pred_enc = pipeline.predict(X)[0]
    pred_label = label_encoder.inverse_transform([pred_enc])[0]
    return {"risk_level": pred_label}
