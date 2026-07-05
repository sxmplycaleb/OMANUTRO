# Twilio Messaging Integration

OMANUTRO uses a centralized backend messaging layer at `backend/services/messaging`.
Application code should call `MessagingService` instead of importing the Twilio SDK directly.

## What Changed

- Added Twilio SMS, WhatsApp, and Verify support.
- Added `message_logs` for outbound messages, OTP sends/checks, callback updates, failures, and retry attempts.
- Added Twilio status callback handling at `/api/messaging/twilio/status`.
- Refactored auth OTP flows to use Twilio Verify instead of local OTP storage.
- Refactored order notifications to queue background message sends.
- Added admin messaging APIs under `/api/messaging`.

## Environment Variables

Copy `.env.example` and set the Twilio values in your local or deployment environment:

```env
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_API_KEY_SID=
TWILIO_API_KEY_SECRET=
TWILIO_SMS_FROM=
TWILIO_MESSAGING_SERVICE_SID=
TWILIO_WHATSAPP_FROM=
TWILIO_VERIFY_SERVICE_SID=
MESSAGING_PROVIDER=twilio
MESSAGING_DEFAULT_CHANNEL=whatsapp
ENABLE_SMS=true
ENABLE_WHATSAPP=true
ENABLE_VERIFY=true
ENABLE_MESSAGE_LOGS=true
TWILIO_STATUS_CALLBACK=
TWILIO_VALIDATE_STATUS_CALLBACK=true
MESSAGE_QUEUE_PROVIDER=memory
MESSAGE_QUEUE_ATTEMPTS=5
MESSAGE_QUEUE_RETRY_DELAY_MS=30000
REDIS_URL=
MESSAGING_DRY_RUN=
```

Use `TWILIO_AUTH_TOKEN` for the free trial. Later, set `TWILIO_API_KEY_SID` and `TWILIO_API_KEY_SECRET`; the Twilio client will use the API key pair without changing business logic.

The code also accepts existing local aliases: `TWILIO_PHONE_NUMBER` for SMS, `TWILIO_WHATSAPP_NUMBER` for WhatsApp, and `VERIFY_SERVICE_SID` for Verify.

In production, set `MESSAGE_QUEUE_PROVIDER=bullmq` and `REDIS_URL` to use BullMQ with Redis-backed retries. Local development uses the built-in memory queue by default.

Set `MESSAGING_DRY_RUN=1` only for tests or local diagnostics that should exercise the queue/logging path without contacting Twilio.

## WhatsApp Sandbox

For development with Twilio WhatsApp Sandbox:

- Set `TWILIO_WHATSAPP_FROM` to the sandbox sender, usually `whatsapp:+14155238886`.
- Join the sandbox from the recipient phone before testing.
- Free-form sandbox messages are supported for development.
- Production WhatsApp templates are not implemented yet. The code is structured so production sender migration is configuration-only unless you later choose template-based content.

## OTP Verification

Twilio Verify is used for:

- Registration OTP
- Phone verification support
- Password reset OTP

The app no longer stores plaintext or hashed OTPs for these flows. Password reset still stores a short-lived reset token hash after Verify approves the code.

## Message Channels

Supported channels:

- `sms`
- `whatsapp`
- `whatsapp_sms_fallback`

Set `MESSAGING_DEFAULT_CHANNEL` to choose the default. Explicit admin/API calls can pass a channel when needed.

## Admin APIs

All admin messaging APIs require `integrations:manage`.

- `GET /api/messaging/logs`
- `POST /api/messaging/sms`
- `POST /api/messaging/whatsapp`
- `POST /api/messaging/broadcast`

Broadcast currently queues messages for explicit recipients, or all users with phone numbers when no recipient list is provided.

## Delivery Status

Configure Twilio status callbacks to:

```text
https://your-domain.example/api/messaging/twilio/status
```

Set the same URL in `TWILIO_STATUS_CALLBACK`. Callback events update `message_logs.status`, `sent_at`, `delivered_at`, and `error` where provided by Twilio.

Webhook signatures are validated with `TWILIO_AUTH_TOKEN`. Keep `TWILIO_VALIDATE_STATUS_CALLBACK=true` in production.

## Health Check

Admins with `integrations:manage` can check:

```text
GET /api/messaging/health
GET /admin/messaging/health
```

The response includes queue readiness, loaded credentials, Twilio API authentication, and Verify service reachability.

## Rate Limits

OTP sends and verification checks are limited to 5 attempts per normalized phone number within 10 minutes. Locked requests return HTTP `429` with a friendly retry message.

## Local Testing

```bash
npm start
```

Then test auth OTP or admin messaging with real Twilio sandbox/trial credentials. The smoke test avoids Twilio network calls by using email registration for its test customer.

## Deployment

On Vercel, set all required environment variables in the Vercel project settings. SQLite is temporary on Vercel in the current project, so production message logs will reset on cold starts unless the app is moved to persistent storage.

For production message logs and rate limits, use persistent storage such as PostgreSQL, MySQL, or Turso. SQLite remains suitable for local development.

## Troubleshooting

- `Twilio credentials are not configured.`: set `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`, or the API key pair.
- `TWILIO_VERIFY_SERVICE_SID is not configured.`: create a Verify service in Twilio and set its SID.
- WhatsApp messages fail in sandbox: confirm the recipient joined the sandbox.
- SMS fails on trial: confirm the recipient is verified in Twilio trial settings.
- Callback returns 403: set `TWILIO_STATUS_CALLBACK` to the exact public callback URL configured in Twilio, or set `TWILIO_VALIDATE_STATUS_CALLBACK=false` only for local debugging.
