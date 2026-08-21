/**
 * Provisions/updates the real backends (Non-CTC-Expense, RC Portal) as AWS
 * Lambda functions with public Function URLs, as part of the SAME build that
 * deploys Emami_Apps' frontend — so one Amplify deploy is genuinely "one app."
 *
 * Runs BEFORE build:embedded in amplify.yml. Each backend's real Function URL
 * is written into that app's own .env so its frontend build bundles the live
 * URL, not localhost.
 *
 * No-ops (with a warning, not an error) if AWS credentials aren't configured —
 * so local builds and first-time setup never break.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const dotenv = require('dotenv');
const archiver = require('archiver');

const REGION = process.env.AWS_REGION || 'ap-south-1';
// This is the real deployed hub domain (see App.tsx's canonical/og:url tags, sitemap.xml,
// robots.txt) — a stale 'apps.emamiapps.in' default here previously meant the Lambda Function
// URL's own CORS config (set only once, at first creation) would silently reject fetch calls
// from the actual site unless this env var was set explicitly at deploy time.
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'https://www.emamiapps.in';

// hub-auth's Function URL hit an unresolved AWS-account-level access issue (public traffic
// getting a 403 despite correct config), so login moved off it entirely — the EmamiApps hub's
// Microsoft sign-in now lives on the mouldhealthcheck Azure App Service instead (see
// embedded-apps/mouldhealthcheck/backend/server.js, "EMAMIAPPS HUB LOGIN" section). This Lambda
// is still deployed here, though: it now serves only the Manage Access API (Postgres-backed
// authorized-user/app-grant storage, see backend/server.js) — a different EXPO_PUBLIC_* env var
// (below) than the one login uses, since they're two unrelated backends now.
const BACKENDS = [
  {
    name: 'hub-auth',
    functionName: 'emami-apps-hub-auth',
    dir: path.join(__dirname, '..', 'backend'),
    frontendEnvFile: path.join(__dirname, '..', '.env'),
    frontendEnvKey: 'EXPO_PUBLIC_ACCESS_API_URL',
    frontendEnvSuffix: '/api',
  },
  {
    name: 'non-ctc-expense',
    functionName: 'emami-apps-non-ctc-expense',
    dir: path.join(__dirname, '..', 'embedded-apps', 'non-ctc-expense', 'backend'),
    frontendEnvFile: path.join(__dirname, '..', 'embedded-apps', 'non-ctc-expense', '.env'),
    frontendEnvKey: 'EXPO_PUBLIC_API_URL',
  },
  {
    name: 'rc-portal',
    functionName: 'emami-apps-rc-portal',
    dir: path.join(__dirname, '..', 'embedded-apps', 'rc-portal', 'backend'),
    frontendEnvFile: path.join(__dirname, '..', 'embedded-apps', 'rc-portal', '.env'),
    frontendEnvKey: 'VITE_API_BASE_URL',
    frontendEnvSuffix: '/api',
  },
];

async function zipDir(dir) {
  const zipPath = path.join(os.tmpdir(), `${path.basename(dir)}-${Date.now()}.zip`);
  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);
    archive.glob('**/*', { cwd: dir, ignore: ['.env', '.env.*'] });
    archive.finalize();
  });
  return zipPath;
}

function setFrontendEnvUrl(envFile, key, url) {
  const existing = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf-8') : '';
  const lines = existing.split('\n').filter((l) => l.trim() && !l.startsWith(`${key}=`));
  lines.push(`${key}=${url}`);
  fs.writeFileSync(envFile, lines.join('\n') + '\n');
}

async function deployBackend(lambda, iam, backend) {
  const { CreateFunctionCommand, UpdateFunctionCodeCommand, UpdateFunctionConfigurationCommand,
    GetFunctionCommand, CreateFunctionUrlConfigCommand, GetFunctionUrlConfigCommand,
    AddPermissionCommand, waitUntilFunctionUpdatedV2 } = require('@aws-sdk/client-lambda');

  const envFile = path.join(backend.dir, '.env');
  const env = fs.existsSync(envFile) ? dotenv.parse(fs.readFileSync(envFile)) : {};
  delete env.PORT; // Lambda controls its own port

  console.log(`[${backend.name}] npm install (production deps for Lambda package) ...`);
  execSync('npm install --omit=dev --no-audit --no-fund', { cwd: backend.dir, stdio: 'inherit' });

  console.log(`[${backend.name}] zipping ${backend.dir} ...`);
  const zipPath = await zipDir(backend.dir);
  const zipBuffer = fs.readFileSync(zipPath);

  let exists = true;
  try {
    await lambda.send(new GetFunctionCommand({ FunctionName: backend.functionName }));
  } catch (e) {
    if (e.name === 'ResourceNotFoundException') exists = false;
    else throw e;
  }

  const roleArn = process.env.LAMBDA_EXECUTION_ROLE_ARN;
  if (!exists) {
    if (!roleArn) throw new Error('LAMBDA_EXECUTION_ROLE_ARN is required to create a new function');
    console.log(`[${backend.name}] creating function ${backend.functionName} ...`);
    await lambda.send(new CreateFunctionCommand({
      FunctionName: backend.functionName,
      Runtime: 'nodejs20.x',
      Role: roleArn,
      Handler: 'lambda.handler',
      Code: { ZipFile: zipBuffer },
      Timeout: 30,
      MemorySize: 512,
      Environment: { Variables: env },
    }));
    await waitUntilFunctionUpdatedV2({ client: lambda, maxWaitTime: 60 }, { FunctionName: backend.functionName });
  } else {
    console.log(`[${backend.name}] updating code + config for ${backend.functionName} ...`);
    await lambda.send(new UpdateFunctionCodeCommand({ FunctionName: backend.functionName, ZipFile: zipBuffer }));
    await waitUntilFunctionUpdatedV2({ client: lambda, maxWaitTime: 60 }, { FunctionName: backend.functionName });
    await lambda.send(new UpdateFunctionConfigurationCommand({
      FunctionName: backend.functionName,
      Environment: { Variables: env },
    }));
    await waitUntilFunctionUpdatedV2({ client: lambda, maxWaitTime: 60 }, { FunctionName: backend.functionName });
  }
  fs.unlinkSync(zipPath);

  let functionUrl;
  try {
    const cfg = await lambda.send(new GetFunctionUrlConfigCommand({ FunctionName: backend.functionName }));
    functionUrl = cfg.FunctionUrl;
  } catch (e) {
    if (e.name !== 'ResourceNotFoundException') throw e;
    console.log(`[${backend.name}] creating Function URL ...`);
    const created = await lambda.send(new CreateFunctionUrlConfigCommand({
      FunctionName: backend.functionName,
      AuthType: 'NONE',
      Cors: {
        AllowOrigins: [FRONTEND_ORIGIN],
        AllowMethods: ['*'],
        AllowHeaders: ['*'],
      },
    }));
    functionUrl = created.FunctionUrl;
    try {
      await lambda.send(new AddPermissionCommand({
        FunctionName: backend.functionName,
        StatementId: 'FunctionURLAllowPublicAccess',
        Action: 'lambda:InvokeFunctionUrl',
        Principal: '*',
        FunctionUrlAuthType: 'NONE',
      }));
    } catch (e2) {
      if (e2.name !== 'ResourceConflictException') throw e2;
    }
  }

  const cleanUrl = functionUrl.replace(/\/$/, '');
  const finalUrl = `${cleanUrl}${backend.frontendEnvSuffix || ''}`;
  setFrontendEnvUrl(backend.frontendEnvFile, backend.frontendEnvKey, finalUrl);
  console.log(`[${backend.name}] live at ${finalUrl}`);
}

async function main() {
  const hasCreds = process.env.AWS_ACCESS_KEY_ID || process.env.AWS_SESSION_TOKEN
    || process.env.AWS_EXECUTION_ENV || process.env.AWS_ROLE_ARN;
  if (!hasCreds) {
    console.warn('deploy-lambdas: no AWS credentials detected in this environment — skipping backend deploy.');
    console.warn('Frontends will build against whatever API URL is already in each app\'s .env (e.g. localhost for local dev).');
    return;
  }

  const { LambdaClient } = require('@aws-sdk/client-lambda');
  const lambda = new LambdaClient({ region: REGION });

  for (const backend of BACKENDS) {
    await deployBackend(lambda, null, backend);
  }
}

main().catch((err) => {
  console.error('deploy-lambdas failed:', err);
  process.exit(1);
});
