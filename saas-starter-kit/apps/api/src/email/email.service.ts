import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { QueueRegistry, QUEUE_NAMES } from "../core/queue/queue.registry";

export interface EmailMessage {
  to: string;
  subject: string;
  template: string; // template key, e.g. "welcome"
  context: Record<string, unknown>;
  locale?: string;
}

// Enqueues emails to the BullMQ email queue. Actual sending is done by the
// worker (email.consumer). Falls back to console logging when no provider
// is configured (local dev).
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly queues: QueueRegistry
  ) {}

  async send(msg: EmailMessage): Promise<void> {
    await this.queues.add(QUEUE_NAMES.EMAIL, "send", msg, {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
    });
    this.logger.debug(`Queued email "${msg.template}" -> ${msg.to}`);
  }

  // Used by the worker; not meant to be called from request handlers.
  async deliver(msg: EmailMessage): Promise<void> {
    const provider = this.config.get<string>("app.email.provider");
    const html = renderTemplate(msg.template, msg.context);
    if (provider === "console") {
      this.logger.log(
        `[email:console] to=${msg.to} subject="${msg.subject}"\n${html}`
      );
      return;
    }
    // TODO: integrate SMTP / Resend / SES. The contract is stable.
    this.logger.warn(`Email provider "${provider}" not implemented; logging instead.`);
    this.logger.log(`[email] to=${msg.to} subject="${msg.subject}"`);
  }
}

// Minimal template renderer. Replace with MJML/Handlebars in production.
const TEMPLATES: Record<string, (c: Record<string, unknown>) => string> = {
  welcome: (c) =>
    `<h1>Welcome ${c.name ?? ""}</h1><p>Confirm your email: ${c.link ?? ""}</p>`,
  verify_email: (c) => `<p>Verify your email: ${c.link ?? ""}</p>`,
  forgot_password: (c) => `<p>Reset your password: ${c.link ?? ""}</p>`,
  invoice: (c) => `<p>Invoice ${c.number ?? ""}: ${c.amount ?? ""}</p>`,
};

function renderTemplate(key: string, ctx: Record<string, unknown>): string {
  const tpl = TEMPLATES[key] ?? ((c) => `<pre>${JSON.stringify(c)}</pre>`);
  return tpl(ctx);
}
