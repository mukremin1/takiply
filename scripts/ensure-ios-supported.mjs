if (process.platform !== "darwin") {
  console.error("iOS run is only supported on macOS with Xcode installed.");
  process.exit(1);
}
