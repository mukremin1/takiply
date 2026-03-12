function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

export async function request(data, latency = 120) {
  await new Promise((resolve) => setTimeout(resolve, latency));
  return clone(data);
}