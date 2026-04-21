import axios from "axios";
import { config } from "../config.js";

const client = axios.create({
  baseURL: config.mlServiceUrl,
  timeout: 15_000,
});

export async function predictRisk(payload) {
  const { data } = await client.post("/predict-risk", payload);
  return data;
}

export async function predictLstmSequence(sequence) {
  const { data } = await client.post("/predict-rainfall-lstm", {
    rainfall_sequence_mm: sequence,
  });
  return data;
}
