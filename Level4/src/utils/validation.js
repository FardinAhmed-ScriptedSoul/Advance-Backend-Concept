export const requireText = (value, name = "input") => {
  if (typeof value !== "string" || !value.trim()) {
    return { error: `${name} must be a non-empty string` };
  }

  return { value: value.trim() };
};

