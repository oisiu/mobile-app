const fs = require("node:fs");
const { Buffer } = require("node:buffer");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");

const repository = process.env.GITHUB_REPOSITORY;
const runId = process.env.GITHUB_RUN_ID;
function exec(command, args) {
  try {
    const env = { ...process.env };
    for (const name of [
      "ANDROID_KEYSTORE_BASE64",
      "ANDROID_KEYSTORE_PASSWORD",
      "ANDROID_KEY_ALIAS",
      "ANDROID_KEY_PASSWORD",
      "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON",
    ])
      delete env[name];
    if (command !== "gh") {
      delete env.GH_TOKEN;
      delete env.GITHUB_TOKEN;
    }
    if (command === "jarsigner") {
      env.ANDROID_KEYSTORE_PASSWORD = process.env.ANDROID_KEYSTORE_PASSWORD;
      env.ANDROID_KEY_PASSWORD = process.env.ANDROID_KEY_PASSWORD;
    }
    return execFileSync(command, args, {
      env,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (cause) {
    // Node embeds stderr and arguments in the original exception message.
    // Keep stderr only for internal HTTP-status handling; never log it.
    const error = new Error(
      `${command} failed (exit ${cause.status ?? "unknown"}). Subprocess output withheld.`,
    );
    error.stderr = cause.stderr;
    throw error;
  }
}
const gh = (args) => exec("gh", args);
const api = (endpoint) =>
  JSON.parse(gh(["api", `repos/${repository}/${endpoint}`]));
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const write = (file, value) =>
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
const sha256 = (file) =>
  crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

function bump(version, kind) {
  assert(
    /^\d+\.\d+\.\d+$/.test(version),
    "Expected a stable major.minor.patch version.",
  );
  assert(
    ["patch", "minor", "major"].includes(kind),
    "Choose patch, minor, or major.",
  );
  const parts = version.split(".").map(Number);
  const index = { major: 0, minor: 1, patch: 2 }[kind];
  parts[index]++;
  for (let i = index + 1; i < 3; i++) parts[i] = 0;
  return parts.join(".");
}

function tagVersion(tag) {
  assert(/^v\d+\.\d+\.\d+$/.test(tag), "Release must be a tag such as v1.6.1.");
  return tag.slice(1);
}

function automaticReleaseTag(manifest, config, record) {
  const tag = `v${manifest.version}`;
  tagVersion(tag);
  assert(
    config.version === manifest.version &&
      record?.schema === 1 &&
      record.version === manifest.version &&
      record.versionCode === config.android.versionCode &&
      Number.isSafeInteger(record.versionCode) &&
      record.versionCode > 0,
    "Merge a matching preparation PR into main before releasing.",
  );
  return tag;
}

function selectRelease() {
  const manifest = read("package.json");
  const tag = `v${manifest.version}`;
  tagVersion(tag);
  const file = `.github/releases/${tag}.json`;
  assert(
    fs.existsSync(file),
    "Merge the Prepare release PR into main before releasing.",
  );
  const selected = automaticReleaseTag(
    manifest,
    read("app.json").expo,
    read(file),
  );
  fs.appendFileSync(process.env.GITHUB_ENV, `RELEASE_TAG=${selected}\n`);
  fs.appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `Selected release: **${selected}** from this main commit.\n`,
  );
}

function releaseNotes(text) {
  const notes = ["en-US", "es-ES"].map((language) => {
    const match = text.match(
      new RegExp(`<${language}>\\s*([\\s\\S]*?)\\s*</${language}>`),
    );
    assert(
      match && match[1].trim() && !match[1].includes("TODO"),
      `Write ${language} release notes before building.`,
    );
    assert(
      [...match[1].trim()].length <= 500,
      `${language} release notes exceed 500 characters.`,
    );
    return { language, text: match[1].trim() };
  });
  return notes;
}

function validateRun(run, expectedPath, commit) {
  assert(
    run.path === expectedPath &&
      (run.event === "workflow_dispatch" ||
        (expectedPath === ".github/workflows/build-android-release.yml" &&
          run.event === "push")) &&
      run.head_branch === "main" &&
      run.conclusion === "success" &&
      run.head_sha === commit,
    `Prerequisite ${expectedPath} must have completed successfully on the recorded commit.`,
  );
}

function productionRelease(track, code) {
  const releases = track.releases || [];
  assert(
    !releases.some((release) =>
      (release.versionCodes || []).some((value) => Number(value) > code),
    ),
    "Refusing to publish an older version than the current production release.",
  );
  assert(
    !releases.some(
      (release) =>
        release.status === "inProgress" || release.status === "halted",
    ),
    "Resolve the existing production staged rollout in Play Console first.",
  );
}

function requireReleaseTrigger(command) {
  const event = process.env.GITHUB_EVENT_NAME;
  const automatic =
    event === "push" && ["select", "validate-build", "sign"].includes(command);
  assert(
    repository &&
      runId &&
      (event === "workflow_dispatch" || automatic) &&
      process.env.GITHUB_REF === "refs/heads/main",
    "Run from main using an authorized release trigger.",
  );
}

function prepareFiles(kind, options = {}) {
  assert(
    (options.platform || "Android") === "Android",
    "iOS/TestFlight is coming soon; Apple setup is required.",
  );
  const notesText = `<en-US>\n${options.english?.trim() || "General updates and improvements."}\n</en-US>\n<es-ES>\n${options.spanish?.trim() || "Actualizaciones y mejoras generales."}\n</es-ES>\n`;
  assert(
    !/[<>]/.test(options.english || "") && !/[<>]/.test(options.spanish || ""),
    "Enter plain release notes without language tags.",
  );
  releaseNotes(notesText);
  const manifest = read("package.json");
  const config = read("app.json");
  assert(
    manifest.version === config.expo.version,
    "App and package versions disagree.",
  );
  const version = bump(manifest.version, kind);
  const code = config.expo.android.versionCode + 1;
  assert(
    Number.isSafeInteger(code) && code > 0 && code <= 2100000000,
    "Invalid Android versionCode.",
  );
  const recordFile = `.github/releases/v${version}.json`;
  assert(!fs.existsSync(recordFile), "This release has already been prepared.");
  manifest.version = config.expo.version = version;
  config.expo.android.versionCode = code;
  write("package.json", manifest);
  write("app.json", config);
  fs.mkdirSync(".github/releases", { recursive: true });
  write(recordFile, {
    schema: 1,
    version,
    versionCode: code,
    prepareRunId: runId,
  });
  fs.writeFileSync(
    `store/google-play/releases/${version}.txt`,
    notesText,
  );
  return version;
}

function prepared(tag) {
  const version = tagVersion(tag);
  const record = read(`.github/releases/${tag}.json`);
  const config = read("app.json").expo;
  assert(
    record.schema === 1 &&
      record.version === version &&
      config.version === version &&
      read("package.json").version === version &&
      record.versionCode === config.android.versionCode,
    "Selected release does not match the prepared app configuration.",
  );
  const commit = exec("git", [
    "log",
    "-1",
    "--format=%H",
    "--",
    `.github/releases/${tag}.json`,
  ]);
  const pulls = api(`commits/${commit}/pulls`);
  assert(
    pulls.some(
      (pr) =>
        pr.merged_at &&
        pr.base.ref === "main" &&
        pr.head.ref === `codex/release-${tag}`,
    ),
    "Merge the Prepare release PR before building.",
  );
  const prepareRun = api(`actions/runs/${record.prepareRunId}`);
  assert(
    prepareRun.path === ".github/workflows/prepare-release.yml" &&
      prepareRun.event === "workflow_dispatch" &&
      prepareRun.head_branch === "main" &&
      prepareRun.conclusion === "success",
    "Prepare release workflow did not succeed.",
  );
  return {
    ...record,
    notes: releaseNotes(
      fs.readFileSync(`store/google-play/releases/${version}.txt`, "utf8"),
    ),
  };
}

function requireUnbuiltTag(tag) {
  tagVersion(tag);
  try {
    api(`git/ref/tags/${tag}`);
  } catch (error) {
    if (error.stderr?.toString().includes("HTTP 404")) return;
    throw error;
  }
  throw new Error(
    "This release tag already exists. Preserve successful builds; inspect and remove only incomplete failed-build drafts/tags before retrying.",
  );
}

function buildMetadata() {
  const tag = process.env.RELEASE_TAG;
  const record = prepared(tag);
  const commit = exec("git", ["rev-parse", "HEAD"]);
  assert(
    commit === process.env.GITHUB_SHA,
    "Build source must be the selected main commit.",
  );
  const bundle = "android/app/build/outputs/bundle/release/app-release.aab";
  const entries = exec("unzip", ["-Z1", bundle]);
  assert(
    !/^META-INF\/.*\.(SF|RSA|DSA|EC)$/im.test(entries),
    "Expected an unsigned bundle before upload-key signing.",
  );
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "oisiu-sign-"));
  try {
    for (const name of [
      "ANDROID_KEYSTORE_BASE64",
      "ANDROID_KEYSTORE_PASSWORD",
      "ANDROID_KEY_ALIAS",
      "ANDROID_KEY_PASSWORD",
    ]) {
      assert(process.env[name], `Missing ${name} secret.`);
    }
    const keystore = path.join(directory, "upload.jks");
    fs.writeFileSync(
      keystore,
      Buffer.from(process.env.ANDROID_KEYSTORE_BASE64, "base64"),
      { mode: 0o600 },
    );
    fs.mkdirSync("release-output", { recursive: true });
    const signed = "release-output/oisiu.aab";
    exec("jarsigner", [
      "-keystore",
      keystore,
      "-storepass:env",
      "ANDROID_KEYSTORE_PASSWORD",
      "-keypass:env",
      "ANDROID_KEY_PASSWORD",
      "-signedjar",
      signed,
      bundle,
      process.env.ANDROID_KEY_ALIAS,
    ]);
    const verification = exec("jarsigner", ["-verify", signed]);
    assert(
      verification.includes("jar verified."),
      "Bundle signature verification failed.",
    );
    write("release-output/build.json", {
      ...record,
      tag,
      commit,
      buildRunId: runId,
      sha256: sha256(signed),
    });
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

function download(tag, directory, filename) {
  gh([
    "release",
    "download",
    tag,
    "--repo",
    repository,
    "--dir",
    directory,
    "--pattern",
    filename,
  ]);
  return path.join(directory, filename);
}

function releaseRecord(tag, directory) {
  const release = JSON.parse(
    gh([
      "release",
      "view",
      tag,
      "--repo",
      repository,
      "--json",
      "isDraft,assets",
    ]),
  );
  assert(
    release.isDraft,
    "Expected a draft release managed by the Android workflows.",
  );
  const record = read(download(tag, directory, "build.json"));
  assert(
    record.schema === 1 &&
      record.tag === tag &&
      record.version === tagVersion(tag) &&
      Number.isSafeInteger(record.versionCode) &&
      /^[a-f0-9]{64}$/.test(record.sha256),
    "Invalid build record.",
  );
  validateRun(
    api(`actions/runs/${record.buildRunId}`),
    ".github/workflows/build-android-release.yml",
    record.commit,
  );
  const ref = api(`git/ref/tags/${tag}`);
  assert(
    ref.object.type === "commit" && ref.object.sha === record.commit,
    "Release tag no longer matches the built commit.",
  );
  return { record, assets: release.assets };
}

function serviceCredentials(raw) {
  let credentials;
  try {
    credentials = JSON.parse(raw);
  } catch {
    throw new Error(
      "Invalid GOOGLE_PLAY_SERVICE_ACCOUNT_JSON secret. Expected service account JSON.",
    );
  }
  assert(
    credentials &&
      typeof credentials.client_email === "string" &&
      typeof credentials.private_key === "string",
    "Service account credential must contain client_email and private_key.",
  );
  return credentials;
}

async function googleRequest(url, options) {
  let response;
  try {
    response = await fetch(url, { ...options, redirect: "error" });
  } catch {
    throw new Error(
      "Google request failed or redirected. Response details withheld.",
    );
  }
  assert(
    response.ok,
    `Google ${options.method || "GET"} failed (${response.status}). Check Play Console permissions, release state, and publishing requirements.`,
  );
  try {
    return await response.json();
  } catch {
    throw new Error("Google returned invalid JSON. Response details withheld.");
  }
}

async function playClient(credentials) {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const message = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;
  let signature;
  try {
    signature = crypto
      .sign("RSA-SHA256", Buffer.from(message), credentials.private_key)
      .toString("base64url");
  } catch {
    throw new Error(
      "Cannot sign Google authentication request. Check the service account private key.",
    );
  }
  const tokenResponse = await googleRequest(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: `${message}.${signature}`,
      }),
      signal: AbortSignal.timeout(60000),
    },
  );
  const { access_token: token } = tokenResponse;
  assert(
    typeof token === "string" && token.length > 0,
    "Google did not return an access token.",
  );
  return async (endpoint, method = "GET", body, upload = false) => {
    const base = upload
      ? "https://androidpublisher.googleapis.com/upload/androidpublisher/v3/"
      : "https://androidpublisher.googleapis.com/androidpublisher/v3/";
    return googleRequest(`${base}applications/com.oisiu.app/${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": upload
          ? "application/octet-stream"
          : "application/json",
      },
      body:
        body === undefined ? undefined : upload ? body : JSON.stringify(body),
      signal: AbortSignal.timeout(180000),
    });
  };
}

async function publish(mode) {
  assert(["closed", "production"].includes(mode), "Unknown publishing stage.");
  const tag = process.env.RELEASE_TAG;
  tagVersion(tag);
  const track = process.env.CLOSED_TESTING_TRACK;
  assert(
    track &&
      !["internal", "internalsharing", "production", "beta"].includes(track),
    "Set CLOSED_TESTING_TRACK to the API identifier of your closed testing track (often alpha).",
  );
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "oisiu-publish-"));
  try {
    const { record, assets } = releaseRecord(tag, directory);
    if (process.env.SOURCE_BUILD_RUN_ID) {
      assert(
        String(record.buildRunId) === process.env.SOURCE_BUILD_RUN_ID &&
          record.commit === exec("git", ["rev-parse", "HEAD"]),
        "Testing must use the build record from the triggering successful run.",
      );
    }
    if (mode === "production") {
      assert(
        process.env.TESTED === "true",
        "Confirm you tested this release from closed testing.",
      );
      const closed = read(download(tag, directory, "closed.json"));
      assert(
        closed.tag === tag &&
          closed.sha256 === record.sha256 &&
          closed.versionCode === record.versionCode &&
          closed.track === track,
        "Closed testing record does not match this build and track.",
      );
      validateRun(
        api(`actions/runs/${closed.runId}`),
        ".github/workflows/release-closed-testing.yml",
        closed.workflowCommit,
      );
      assert(
        !assets.some((asset) => asset.name === "production.json"),
        "This release has already been published to production.",
      );
    }
    const client = await playClient(
      serviceCredentials(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON),
    );
    const edit = await client("edits", "POST", {});
    const base = `edits/${encodeURIComponent(edit.id)}`;
    const closedTrack = await client(
      `${base}/tracks/${encodeURIComponent(track)}`,
    );
    const code = String(record.versionCode);
    const existingClosed = (closedTrack.releases || []).find((release) =>
      (release.versionCodes || []).includes(code),
    );
    if (mode === "production") {
      assert(
        existingClosed?.status === "completed",
        "The selected version must be active in closed testing before production.",
      );
      productionRelease(
        await client(`${base}/tracks/production`),
        record.versionCode,
      );
    } else {
      assert(
        !(closedTrack.releases || []).some((release) =>
          (release.versionCodes || []).some(
            (value) => Number(value) > record.versionCode,
          ),
        ),
        "Refusing to replace a newer closed testing release.",
      );
      const bundles = await client(`${base}/bundles`);
      const existing = (bundles.bundles || []).find(
        (bundle) => String(bundle.versionCode) === code,
      );
      if (existing) {
        assert(
          existing.sha256 === record.sha256,
          "Play already contains a different bundle with this versionCode.",
        );
      } else {
        const bundle = download(tag, directory, "oisiu.aab");
        assert(
          sha256(bundle) === record.sha256,
          "Bundle checksum does not match the successful build.",
        );
        const uploaded = await client(
          `${base}/bundles?uploadType=media`,
          "POST",
          fs.readFileSync(bundle),
          true,
        );
        assert(
          String(uploaded.versionCode) === code &&
            uploaded.sha256 === record.sha256,
          "Uploaded bundle does not match the build record.",
        );
      }
    }
    const target = mode === "production" ? "production" : track;
    await client(`${base}/tracks/${encodeURIComponent(target)}`, "PUT", {
      track: target,
      releases: [
        {
          name: tag,
          status: "completed",
          versionCodes: [code],
          releaseNotes: record.notes,
        },
      ],
    });
    await client(`${base}:validate`, "POST");
    await client(`${base}:commit`, "POST");
    const filename = mode === "production" ? "production.json" : "closed.json";
    const proof = path.join(directory, filename);
    write(proof, {
      tag,
      versionCode: record.versionCode,
      sha256: record.sha256,
      track: target,
      runId,
      workflowCommit: process.env.GITHUB_SHA,
    });
    // Safe retries can recover a successful Play commit whose GitHub recording failed.
    gh(["release", "upload", tag, proof, "--repo", repository, "--clobber"]);
    console.log(
      `${tag} submitted to ${target}. Check Google Play review/publishing status in Play Console.`,
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

async function main() {
  const command = process.argv[2];
  if (command !== "validate-notes") requireReleaseTrigger(command);
  if (command === "prepare") {
    const version = prepareFiles(process.env.BUMP, {
      platform: process.env.RELEASE_PLATFORM,
      english: process.env.RELEASE_NOTES_EN,
      spanish: process.env.RELEASE_NOTES_ES,
    });
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      `version=${version}\ntag=v${version}\nbranch=codex/release-v${version}\n`,
    );
  } else if (command === "select") selectRelease();
  else if (command === "validate-notes") {
    releaseNotes(
      fs.readFileSync(
        `store/google-play/releases/${read("package.json").version}.txt`,
        "utf8",
      ),
    );
  } else if (command === "validate-build") {
    prepared(process.env.RELEASE_TAG);
    requireUnbuiltTag(process.env.RELEASE_TAG);
  } else if (command === "sign") buildMetadata();
  else if (command === "closed" || command === "production")
    await publish(command);
  else throw new Error("Unknown release command.");
}

module.exports = {
  requireReleaseTrigger,
  automaticReleaseTag,
  bump,
  tagVersion,
  releaseNotes,
  validateRun,
  productionRelease,
  prepareFiles,
  playClient,
  publish,
  serviceCredentials,
  exec,
  googleRequest,
  buildMetadata,
};
if (require.main === module)
  main().catch((error) => {
    // Subprocess, credential parsing, crypto, and API errors are sanitized at their source.
    console.error(error.message);
    process.exitCode = 1;
  });
