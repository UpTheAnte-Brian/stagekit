type PostgrestLikeError = {
  code?: string;
  details?: string | null;
  message?: string;
};

const SCENE_SCHEMA_TOKENS = [
  "job_scene_applications",
  "scene_templates",
  "scene_template_items",
  "scene_application_id",
  "scene_template_item_id",
];

export const SCENE_FEATURE_UNAVAILABLE_MESSAGE =
  "Scene templates are not available in this database yet. Apply the latest Supabase migration and reload.";

export function isMissingSceneSchemaError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const value = error as PostgrestLikeError;
  const haystack = `${value.code ?? ""} ${value.message ?? ""} ${value.details ?? ""}`.toLowerCase();

  return SCENE_SCHEMA_TOKENS.some((token) => haystack.includes(token));
}

export function toSceneSchemaAwareError(error: unknown) {
  if (isMissingSceneSchemaError(error)) {
    return new Error(SCENE_FEATURE_UNAVAILABLE_MESSAGE);
  }

  if (error instanceof Error) {
    return error;
  }

  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return new Error(error.message);
  }

  return new Error("Unknown error");
}
