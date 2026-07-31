import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AiMessage } from "../ai/entities/ai-message.entity";
import { AiUsage } from "../ai/entities/ai-usage.entity";
import { ConfigService } from "@nestjs/config";

// AI processing jobs: runs completions off the request path, persists messages.
@Processor("ai")
export class AiConsumer extends WorkerHost {
  private readonly logger = new Logger(AiConsumer.name);

  constructor(
    @InjectRepository(AiMessage) private readonly messages: Repository<AiMessage>,
    @InjectRepository(AiUsage) private readonly usage: Repository<AiUsage>,
    private readonly config: ConfigService
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    const { conversationId, prompt, systemPrompt, model, userId, organizationId } = job.data;
    const reply = await this.complete(prompt, systemPrompt, model);
    await this.messages.save(this.messages.create({ conversationId, role: "assistant", content: reply.content, promptTokens: reply.promptTokens, completionTokens: reply.completionTokens }));
    if (organizationId) {
      const today = new Date().toISOString().slice(0, 10);
      const existing = await this.usage.findOne({ where: { organizationId, date: today, model: model ?? "gpt-4o-mini" } });
      if (existing) {
        existing.promptTokens += reply.promptTokens;
        existing.completionTokens += reply.completionTokens;
        existing.costUsd = Number(existing.costUsd) + reply.costUsd;
        existing.requestCount += 1;
        await this.usage.save(existing);
      } else {
        await this.usage.save(this.usage.create({ organizationId, userId, date: today, model: model ?? "gpt-4o-mini", promptTokens: reply.promptTokens, completionTokens: reply.completionTokens, costUsd: reply.costUsd, requestCount: 1 }));
      }
    }
  }

  private async complete(prompt: string, system?: string, model?: string): Promise<any> {
    const apiKey = this.config.get("app.ai.openaiApiKey");
    if (!apiKey) return { content: `(demo) ${prompt.slice(0, 200)}`, promptTokens: 0, completionTokens: 0, costUsd: 0 };
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: model ?? "gpt-4o-mini", messages: [...(system ? [{ role: "system", content: system }] : []), { role: "user", content: prompt }] }),
    });
    const json = (await res.json()) as any;
    const usage = json.usage ?? { prompt_tokens: 0, completion_tokens: 0 };
    const costUsd = (usage.prompt_tokens * 0.00001 + usage.completion_tokens * 0.00003);
    return { content: json.choices?.[0]?.message?.content ?? "", promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens, costUsd };
  }
}
