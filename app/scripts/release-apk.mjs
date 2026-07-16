// Builds and signs the release APK that ships on a GitHub release.
//
// Why this isn't just a Gradle signingConfig: ReFocus was signed with the debug
// key up to v1.3.0, and Android refuses an update whose signing certificate
// differs from the installed one. Switching to a real release key therefore has
// to be a *rotation* — an APK Signature Scheme v3 proof-of-rotation lineage that
// says "this release key is the rightful successor to that debug key". The Android
// Gradle Plugin has no --lineage option, so signing happens here instead, after
// Gradle emits the unsigned APK.
//
// The result carries two signer blocks:
//   API 24..32  → the old debug key, so devices that predate v3.1 rotation see the
//                 exact certificate they already have installed and take the update
//   API 33+     → the new release key, accepted because the lineage proves it
//                 descends from the debug key
//
// Which means: keep BOTH keystores forever. Losing the debug keystore doesn't just
// lose history — it makes it impossible to sign an update that old devices, or any
// device still on v1.3.0, will accept.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, copyFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ANDROID = resolve('android');
const OUT_DIR = resolve('dist-apk');

const die = (msg) => { console.error(`✗ ${msg}`); process.exit(1); };

// apksigner ships as a .bat/.sh wrapper around a jar. We run the jar through java
// ourselves: Node can't execFile a .bat without a shell, and putting the keystore
// password through a shell means worrying about quoting it. java takes an argv.
//
// build-tools are versioned directories; take the newest rather than pinning a
// version that a given machine may not have installed.
function apksignerJar() {
  const home = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (!home) die('ANDROID_HOME is not set.');
  const dir = join(home, 'build-tools');
  if (!existsSync(dir)) die(`No build-tools under ${dir}`);
  const newest = readdirSync(dir).sort().pop();
  const jar = join(dir, newest, 'lib', 'apksigner.jar');
  if (!existsSync(jar)) die(`apksigner.jar not found at ${jar}`);
  return jar;
}

function javaExe() {
  const home = process.env.JAVA_HOME;
  const exe = home ? join(home, 'bin', process.platform === 'win32' ? 'java.exe' : 'java') : 'java';
  if (home && !existsSync(exe)) die(`java not found at ${exe}`);
  return exe;
}

function props(file) {
  if (!existsSync(file)) {
    die(`${file} is missing.\n  This holds the release keystore's passwords and is deliberately\n  gitignored, so a fresh clone has to be given it. See README → Signing.`);
  }
  return Object.fromEntries(
    readFileSync(file, 'utf8')
      .split('\n')
      .filter((l) => l.trim() && !l.trim().startsWith('#'))
      .map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      }),
  );
}

const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
const ks = props(join(ANDROID, 'keystore.properties'));
const keystore = join(ANDROID, ks.storeFile);
const lineage = join(ANDROID, 'signing-lineage.bin');
const debugKeystore = join(process.env.USERPROFILE || process.env.HOME, '.android', 'debug.keystore');

for (const [label, path] of [['release keystore', keystore], ['lineage', lineage], ['debug keystore', debugKeystore]]) {
  if (!existsSync(path)) die(`${label} not found: ${path}`);
}

console.log(`Building ReFocus v${version} (release)…`);
// gradlew is a .bat on Windows, which Node won't execFile without a shell — so it
// goes through cmd. It needs its absolute path: cmd /c does not resolve a bare
// script name against cwd.
const gradleArgs = ['assembleRelease', '-q', '--console=plain'];
if (process.platform === 'win32') {
  execFileSync(process.env.ComSpec || 'cmd.exe', ['/c', join(ANDROID, 'gradlew.bat'), ...gradleArgs], { cwd: ANDROID, stdio: 'inherit' });
} else {
  execFileSync(join(ANDROID, 'gradlew'), gradleArgs, { cwd: ANDROID, stdio: 'inherit' });
}

const unsigned = join(ANDROID, 'app/build/outputs/apk/release/app-release-unsigned.apk');
if (!existsSync(unsigned)) die(`Gradle produced no APK at ${unsigned}`);

mkdirSync(OUT_DIR, { recursive: true });
const out = join(OUT_DIR, `ReFocus-v${version}.apk`);
copyFileSync(unsigned, out);

const java = javaExe();
const apksigner = (args) => execFileSync(java, ['-jar', apksignerJar(), ...args], { encoding: 'utf8' });

console.log('Signing with rotation (debug → release)…');
apksigner([
  'sign',
  '--lineage', lineage,
  // Order matters: the *first* signer is the oldest in the lineage. It signs v1/v2,
  // which is what pre-33 devices — and every device still running v1.3.0 — check.
  '--ks', debugKeystore, '--ks-pass', 'pass:android', '--ks-key-alias', 'androiddebugkey', '--key-pass', 'pass:android',
  '--next-signer', '--ks', keystore, '--ks-pass', `pass:${ks.storePassword}`, '--ks-key-alias', ks.keyAlias, '--key-pass', `pass:${ks.keyPassword}`,
  '--min-sdk-version', '24',
  out,
]);

// Verify rather than trust: a rotation that silently lost the old signer would
// still produce a perfectly valid APK, and would brick updates for everyone on
// v1.3.0 — a failure that only shows up on someone else's phone.
const report = apksigner(['verify', '-v', '--print-certs', '--min-sdk-version', '24', out]);
const signers = [...report.matchAll(/Signer \(minSdkVersion=(\d+), maxSdkVersion=\d+\) certificate DN: (.+)/g)];
if (!/v2 scheme \(APK Signature Scheme v2\): true/.test(report)) die('v2 signature missing — devices below API 33 would reject this.');
if (!signers.some(([, , dn]) => /Android Debug/.test(dn))) die('The old debug signer is gone — updates over v1.3.0 would fail.');
if (!signers.some(([, , dn]) => /CN=ReFocus/.test(dn))) die('The release signer is missing from the lineage.');

console.log(`\n✓ ${out}`);
for (const [, minSdk, dn] of signers) console.log(`  API ${minSdk}+ → ${dn}`);
