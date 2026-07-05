let Queue = null;
let Worker = null;
let IORedis = null;

try {
  ({ Queue, Worker } = require("bullmq"));
  IORedis = require("ioredis");
} catch {
  Queue = null;
  Worker = null;
  IORedis = null;
}

const QUEUE_NAME = process.env.MESSAGE_QUEUE_NAME || "omanutro-messaging";
const MAX_ATTEMPTS = Math.max(1, Number(process.env.MESSAGE_QUEUE_ATTEMPTS || 5));
const BASE_DELAY_MS = Math.max(1000, Number(process.env.MESSAGE_QUEUE_RETRY_DELAY_MS || 30000));

let processor = null;
let queue = null;
let worker = null;
let connection = null;
const deadLetters = [];

function provider() {
  return String(process.env.MESSAGE_QUEUE_PROVIDER || "memory").toLowerCase();
}

function shouldUseBullMQ() {
  return provider() === "bullmq";
}

function bullMQReady() {
  return Boolean(Queue && Worker && IORedis && process.env.REDIS_URL);
}

function backoffDelay(attempt) {
  return Math.min(BASE_DELAY_MS * (2 ** Math.max(0, attempt - 1)), 15 * 60 * 1000);
}

function createConnection() {
  if (connection) return connection;
  connection = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  });
  return connection;
}

function ensureBullMQ() {
  if (!bullMQReady()) {
    throw new Error("BullMQ requires bullmq, ioredis, and REDIS_URL.");
  }
  if (!queue) {
    queue = new Queue(QUEUE_NAME, {
      connection: createConnection(),
      defaultJobOptions: {
        attempts: MAX_ATTEMPTS,
        backoff: { type: "exponential", delay: BASE_DELAY_MS },
        removeOnComplete: { age: 86400, count: 1000 },
        removeOnFail: false
      }
    });
  }
  if (!worker && processor) {
    worker = new Worker(QUEUE_NAME, async (job) => processor(job.data), { connection: createConnection() });
    worker.on("failed", (job, error) => {
      if (job?.attemptsMade >= MAX_ATTEMPTS) {
        deadLetters.push({
          id: job.id,
          data: job.data,
          error: error.message,
          failedAt: new Date().toISOString()
        });
      }
    });
  }
  return queue;
}

async function runMemoryJob(job, attempt = 1) {
  if (!processor) throw new Error("Message queue processor is not registered.");
  try {
    await processor(job);
  } catch (error) {
    if (!error.retryable || attempt >= MAX_ATTEMPTS) {
      deadLetters.push({
        id: job.id,
        data: job,
        error: error.message,
        attempts: attempt,
        failedAt: new Date().toISOString()
      });
      return;
    }
    setTimeout(() => runMemoryJob(job, attempt + 1), backoffDelay(attempt));
  }
}

function registerProcessor(handler) {
  processor = handler;
  if (shouldUseBullMQ() && bullMQReady()) ensureBullMQ();
}

async function enqueue(name, data = {}) {
  const id = data.jobId || `msgjob_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  if (shouldUseBullMQ()) {
    const bullQueue = ensureBullMQ();
    const job = await bullQueue.add(name, { ...data, jobName: name }, { jobId: id });
    return { queued: true, provider: "bullmq", jobId: job.id };
  }

  const job = { ...data, id, jobName: name };
  setImmediate(() => runMemoryJob(job));
  return { queued: true, provider: "memory", jobId: id };
}

function health() {
  return {
    provider: provider(),
    ready: shouldUseBullMQ() ? bullMQReady() && Boolean(queue) : Boolean(processor),
    redisConfigured: Boolean(process.env.REDIS_URL),
    deadLetters: deadLetters.length
  };
}

function validateStartupConfig({ strict = process.env.NODE_ENV === "production" } = {}) {
  const errors = [];
  if (shouldUseBullMQ() && !process.env.REDIS_URL) {
    errors.push("REDIS_URL is required when MESSAGE_QUEUE_PROVIDER=bullmq.");
  }
  if (shouldUseBullMQ() && !Queue) {
    errors.push("BullMQ dependencies are not available.");
  }
  if (strict && errors.length) {
    throw new Error(`Message queue configuration is invalid: ${errors.join(" ")}`);
  }
  return { ok: errors.length === 0, errors };
}

module.exports = {
  registerProcessor,
  enqueue,
  health,
  validateStartupConfig
};
