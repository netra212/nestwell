export async function clientAPI<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, options);
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error("The request couldn’t be completed. Please try again.");
  }
  if (!response.ok)
    throw new Error(
      body.error?.message ||
        "The request couldn’t be completed. Please try again.",
    );
  return body;
}
