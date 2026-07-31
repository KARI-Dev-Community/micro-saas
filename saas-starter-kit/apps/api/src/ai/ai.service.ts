import { Injectable } from "@nestjs/common";
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
  }): Promise<{ jobId: string; conversationId: string; status: string }> {
    if (input.organizationId) {
      await this.rbac.assertPermission(input.userId, input.organizationId, Permission.AI_CHAT);
    }
    let conversationId = input.conversationId;
    if (!conversationId) {
      const c = await this.createConversation({ userId: input.userId, organizationId: input.organizationId });
      conversationId = c.id;
    }
    await this.messages.save(this.messages.create({ conversationId, role: "user", content: input.prompt }));

    const job = await this.queues.add(QUEUE_NAMES.AI, "chat", {
      conversationId,
      userId: input.userId,
      organizationId: input.organizationId,
      prompt: input.prompt,
      systemPrompt: input.systemPrompt,
      model: this.config.get("app.ai.chatModel"),
    }, { attempts: 2 });

    return { jobId: job.id!, conversationId, status: "processing" };
  }

  async usageReport(organizationId: string): Promise<AiUsage[]> {
    return this.usage.find({ where: { organizationId }, order: { date: "DESC" }, take: 30 });
  }

  async listPrompts(organizationId?: string): Promise<AiPrompt[]> {
    if (!organizationId) return [];
    return this.prompts.find({ where: { organizationId }, order: { createdAt: "DESC" } });
  }

  async createPrompt(input: Partial<AiPrompt>): Promise<AiPrompt> {
    return this.prompts.save(this.prompts.create(input));
  }
}
