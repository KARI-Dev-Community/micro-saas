import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AiConversation } from "./entities/ai-conversation.entity";
import { AiMessage } from "./entities/ai-message.entity";
import { AiUsage } from "./entities/ai-usage.entity";
import { AiPrompt } from "./entities/ai-prompt.entity";
import { ConfigService } from "@nestjs/config";
import { RbacService } from "../tenant/rbac.service";
import { QueueRegistry, QUEUE_NAMES } from "../core/queue/queue.registry";
import { Permission } from "@shared/enums";

@Injectable()
export class AiService {
  constructor(
    @InjectRepository(AiConversation) private readonly convos: Repository<AiConversation>,
    @InjectRepository(AiMessage) private readonly messages: Repository<AiMessage>,
    @InjectRepository(AiUsage) private readonly usage: Repository<AiUsage>,
    @InjectRepository(AiPrompt) private readonly prompts: Repository<AiPrompt>,
    private readonly config: ConfigService,
    private readonly rbac: RbacService,
    private readonly queues: QueueRegistry
  ) {}

  async createConversation(input: { userId: string; organizationId?: string; title?: string; type?: string }): Promise<AiConversation> {
    return this.convos.save(this.convos.create(input));
  }

  async listConversations(userId: string): Promise<AiConversation[]> {
    return this.convos.find({ where: { userId, isActive: true }, order: { createdAt: "DESC" } });
  }

  async chat(input: {
    userId: string;
    organizationId?: string;
    conversationId?: string;
    prompt: string;
    systemPrompt?: string;
  }): Promise<{ conversationId: string; reply: string; usage: any }> {
    if (input.organizationId) {
      await this.rbac.assertPermission(input.userId, input.organizationId, Permission.AI_CHAT);
    }
    let conversationId = input.conversationId;
    if (!conversationId) {
      const c = await this.createConversation({ userId: input.userId, organizationId: input.organizationId });
      conversationId = c.id;
    }
    await this.messages.save(this.messages.create({ conversationId, role: "user", content: input.prompt }));

    // Enqueue AI processing to the BullMQ AI queue (keeps request latency low).
    const job = await this.queues.add(QUEUE_NAMES.AI, "chat", {
      conversationId,
      userId: input.userId,
      prompt: input.prompt,
      systemPrompt: input.systemPrompt,
      model: this.config.get("app.ai.chatModel"),
    }, { attempts: 2 });

    // For the starter kit we run synchronously here; the worker consumes the
    // same job shape in production. Replace with streaming SSE as needed.
    const reply = await this.runCompletion(input.prompt, input.systemPrompt);
    await this.messages.save(this.messages.create({ conversationId, role: "assistant", content: reply.content, promptTokens: reply.promptTokens, completionTokens: reply.completionTokens }));
    await this.trackUsage(input.organizationId, input.userId, reply);
    return { conversationId, reply: reply.content, usage: reply };
  }

  private async runCompletion(prompt: string, system?: string): Promise<{ content: string; promptTokens: number; completionTokens: number; costUsd: number }> {
    const apiKey = this.config.get("app.ai.openaiApiKey");
    if (!apiKey) {
      // No key configured: echo a stub so the flow is demoable locally.
      return { content: `(demo) Echo: ${prompt.slice(0, 200)}`, promptTokens: prompt.length, completionTokens: prompt.length, costUsd: 0 };
    }
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: this.config.get("app.ai.chatModel"),
        messages: [
          ...(system ? [{ role: "system", content: system }] : []),
          { role: "user", content: prompt },
        ],
      }),
    });
    const json = (await res.json()) as any;
    const choice = json.choices?.[0]?.message?.content ?? "";
    const usage = json.usage ?? { prompt_tokens: 0, completion_tokens: 0 };
    const costUsd = (usage.prompt_tokens * 0.00001 + usage.completion_tokens * 0.00003);
    return { content: choice, promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens, costUsd };
  }

  private async trackUsage(organizationId: string | undefined, userId: string | undefined, usage: { promptTokens: number; completionTokens: number; costUsd: number }) {
    if (!organizationId) return;
    const today = new Date().toISOString().slice(0, 10);
    const existing = await this.usage.findOne({ where: { organizationId, date: today, model: this.config.get("app.ai.chatModel") } });
    if (existing) {
      existing.promptTokens += usage.promptTokens;
      existing.completionTokens += usage.completionTokens;
      existing.costUsd = Number(existing.costUsd) + usage.costUsd;
      existing.requestCount += 1;
      await this.usage.save(existing);
    } else {
      await this.usage.save(this.usage.create({ organizationId, userId, date: today, model: this.config.get("app.ai.chatModel"), promptTokens: usage.promptTokens, completionTokens: usage.completionTokens, costUsd: usage.costUsd, requestCount: 1 }));
    }
  }

  async usageReport(organizationId: string): Promise<AiUsage[]> {
    return this.usage.find({ where: { organizationId }, order: { date: "DESC" }, take: 30 });
  }

  async listPrompts(organizationId?: string): Promise<AiPrompt[]> {
    return this.prompts.find({ where: organizationId ? { organizationId } : {}, order: { createdAt: "DESC" } });
  }

  async createPrompt(input: Partial<AiPrompt>): Promise<AiPrompt> {
    return this.prompts.save(this.prompts.create(input));
  }
}
