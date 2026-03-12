import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = process.cwd();
const androidDir = path.join(projectRoot, "android");
const localPropertiesPath = path.join(androidDir, "local.properties");
const gradlePropertiesPath = path.join(androidDir, "gradle.properties");

if (!fs.existsSync(androidDir)) {
  console.error("Android project folder not found. Run: npx cap add android");
  process.exit(1);
}

const readGradleJavaHome = () => {
  if (!fs.existsSync(gradlePropertiesPath)) return null;
  const gradleProperties = fs.readFileSync(gradlePropertiesPath, "utf8");
  const match = gradleProperties.match(/^org\.gradle\.java\.home=(.+)$/m);
  if (!match) return null;
  return match[1].trim().replace(/\\\\/g, "\\");
};

const parseJavaMajor = (text) => {
  const match = text.match(/version "(\d+)(?:\.(\d+))?/);
  if (!match) return null;
  const firstPart = Number(match[1]);
  const secondPart = match[2] ? Number(match[2]) : undefined;
  return firstPart === 1 && secondPart ? secondPart : firstPart;
};

const getJavaMajorForHome = (javaHome) => {
  if (!javaHome) return null;
  const releaseFile = path.join(javaHome, "release");
  if (!fs.existsSync(releaseFile)) return null;
  const releaseText = fs.readFileSync(releaseFile, "utf8");
  const match = releaseText.match(/^JAVA_VERSION="([^"]+)"/m);
  if (!match) return null;
  const versionText = `version "${match[1]}"`;
  const major = parseJavaMajor(versionText);
  return major ? { major, javaHome } : null;
};

const getJavaMajorFromPath = () => {
  const versionResult = spawnSync("java", ["-version"], { encoding: "utf8" });
  if (versionResult.error) return null;
  const versionText = `${versionResult.stdout}\n${versionResult.stderr}`;
  const major = parseJavaMajor(versionText);
  return major ? { major, javaHome: null } : null;
};

const findWindowsJavaHomes = () => {
  if (process.platform !== "win32") return [];
  const roots = ["C:\\Program Files\\Java", "C:\\Program Files\\Eclipse Adoptium"];
  const result = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    const dirs = fs
      .readdirSync(root, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory() && /jdk|temurin|hotspot/i.test(dirent.name))
      .map((dirent) => path.join(root, dirent.name));
    result.push(...dirs);
  }
  return result;
};

const dedupe = (values) => [...new Set(values.filter(Boolean))];

const escapeForGradle = (value) => value.replace(/\\/g, "\\\\");
const upsertGradleJavaHome = (javaHome) => {
  if (!javaHome) return;
  const targetLine = `org.gradle.java.home=${escapeForGradle(javaHome)}`;
  let gradleProperties = "";
  if (fs.existsSync(gradlePropertiesPath)) {
    gradleProperties = fs.readFileSync(gradlePropertiesPath, "utf8");
  }
  if (/^org\.gradle\.java\.home=/m.test(gradleProperties)) {
    const replaced = gradleProperties.replace(/^org\.gradle\.java\.home=.*$/m, targetLine);
    if (replaced !== gradleProperties) {
      fs.writeFileSync(gradlePropertiesPath, replaced, "utf8");
      console.log("Updated org.gradle.java.home in android/gradle.properties");
    }
    return;
  }
  const trimmed = gradleProperties.trimEnd();
  const nextContent = trimmed ? `${trimmed}\n${targetLine}\n` : `${targetLine}\n`;
  fs.writeFileSync(gradlePropertiesPath, nextContent, "utf8");
  console.log("Added org.gradle.java.home to android/gradle.properties");
};

const javaCandidates = dedupe([
  process.env.JAVA_HOME,
  readGradleJavaHome(),
  ...findWindowsJavaHomes()
]);

let selectedJava = null;
let detectedMax = null;
for (const javaHome of javaCandidates) {
  const detected = getJavaMajorForHome(javaHome);
  if (!detected) continue;
  if (!detectedMax || detected.major > detectedMax.major) detectedMax = detected;
  if (detected.major >= 21) {
    selectedJava = detected;
    break;
  }
}

if (!selectedJava) {
  const pathJava = getJavaMajorFromPath();
  if (pathJava && pathJava.major >= 21) {
    selectedJava = pathJava;
  }
}

if (!selectedJava) {
  const current = detectedMax?.major ?? getJavaMajorFromPath()?.major;
  if (current) {
    console.error(
      `JDK 21 is required for Capacitor Android (current: ${current}). Install JDK 21 and point JAVA_HOME/org.gradle.java.home to it.`
    );
  } else {
    console.error("Java not found. Install JDK 21 and set JAVA_HOME or org.gradle.java.home.");
  }
  process.exit(1);
}

if (selectedJava.javaHome) {
  upsertGradleJavaHome(selectedJava.javaHome);
}

const candidates = [
  process.env.ANDROID_HOME,
  process.env.ANDROID_SDK_ROOT,
  process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, "Android", "Sdk")
    : null,
  process.env.USERPROFILE
    ? path.join(process.env.USERPROFILE, "AppData", "Local", "Android", "Sdk")
    : null,
  process.env.HOME ? path.join(process.env.HOME, "Library", "Android", "sdk") : null,
  process.env.HOME ? path.join(process.env.HOME, "Android", "Sdk") : null
].filter(Boolean);

const sdkDir = candidates.find((candidate) => {
  try {
    return fs.existsSync(candidate) && fs.statSync(candidate).isDirectory();
  } catch {
    return false;
  }
});

if (!sdkDir) {
  console.error(
    "Android SDK not found. Set ANDROID_HOME or ANDROID_SDK_ROOT, or install SDK under the default Android Studio path."
  );
  process.exit(1);
}

const normalizedSdkDir = sdkDir.replace(/\\/g, "/");
const sdkLine = `sdk.dir=${normalizedSdkDir}`;

let content = "";
if (fs.existsSync(localPropertiesPath)) {
  content = fs.readFileSync(localPropertiesPath, "utf8");
}

if (/^sdk\.dir=/m.test(content)) {
  process.exit(0);
}

const trimmed = content.trimEnd();
const nextContent = trimmed ? `${trimmed}\n${sdkLine}\n` : `${sdkLine}\n`;
fs.writeFileSync(localPropertiesPath, nextContent, "utf8");
console.log(`Wrote Android SDK path to ${path.relative(projectRoot, localPropertiesPath)}`);
