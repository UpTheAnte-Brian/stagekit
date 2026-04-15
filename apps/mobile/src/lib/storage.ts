export async function fileUriToArrayBuffer(uri: string) {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error("Failed to read image from device.");
  }

  return response.arrayBuffer();
}
