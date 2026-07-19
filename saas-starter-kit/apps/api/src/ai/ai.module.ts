import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AiConversation } from "./entities/ai-conversation.entity";
import { AiMessage } from "./entities/ai-message.entity";
import { AiUsage } from "./entities/ai-usage.entity";
import { AiPrompt } from "./entities/ai-prompt.entity";
import { AiService } from "./ai.service";
import { AiController } from "./ai.controller";
import { TenantModule } from "../tenant/tenant.module";
import { QueueModule } from "../core/queue/queue.module";

@Module({
  imports: [TypeOrmModule.forFeature([AiConversation, AiMessage, AiUsage, AiPrompt]), TenantModule, QueueModule],
  providers: [AiService],
  controllers: [AiController],
  exports: [AiService],
})
export class AiModule {}
