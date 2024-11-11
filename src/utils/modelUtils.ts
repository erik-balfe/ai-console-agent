import { AVAILABLE_MODELS } from "../constants";
import { ModelId, ModelShortName } from "./interface";

export function resolveModelId(modelInput: string): ModelId {
  // Direct model ID check
  if (Object.values(AVAILABLE_MODELS).includes(modelInput as ModelId)) {
    return modelInput as ModelId;
  }

  // Shortname check
  const modelId = AVAILABLE_MODELS[modelInput as ModelShortName];
  if (modelId) {
    return modelId;
  }

  // Generate formatted error message
  const availableOptions = Object.entries(AVAILABLE_MODELS)
    .map(([shortName, id]) => `  ${shortName} => ${id}`)
    .join("\n");

  throw new Error(`Invalid model '${modelInput}'.\nAvailable options:\n${availableOptions}`);
}
