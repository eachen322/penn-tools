import type { UserApiKeyRepository } from "@penntools/core/repositories";
import type { ApiKeyProvider, SavedApiKey, UserId } from "@penntools/core/types";
import type { PrismaClient } from "@prisma/client";
import { ApiKeyProvider as PrismaProvider } from "@prisma/client";

function toProvider(provider: PrismaProvider): ApiKeyProvider {
  const map: Record<PrismaProvider, ApiKeyProvider> = {
    OPENAI: "openai",
    ANTHROPIC: "anthropic",
  };
  return map[provider];
}

function toPrismaProvider(provider: ApiKeyProvider): PrismaProvider {
  const map: Record<ApiKeyProvider, PrismaProvider> = {
    openai: PrismaProvider.OPENAI,
    anthropic: PrismaProvider.ANTHROPIC,
  };
  return map[provider];
}

function toSavedApiKey(record: { provider: PrismaProvider; last4: string; updatedAt: Date }): SavedApiKey {
  return {
    provider: toProvider(record.provider),
    last4: record.last4,
    updatedAt: record.updatedAt,
  };
}

export class PrismaUserApiKeyRepository implements UserApiKeyRepository {
  constructor(private readonly db: PrismaClient) {}

  async list(userId: UserId): Promise<SavedApiKey[]> {
    const records = await this.db.userApiKey.findMany({
      where: { userId },
      select: { provider: true, last4: true, updatedAt: true },
      orderBy: { provider: "asc" },
    });
    return records.map(toSavedApiKey);
  }

  async get(userId: UserId, provider: ApiKeyProvider): Promise<string | null> {
    const record = await this.db.userApiKey.findUnique({
      where: { userId_provider: { userId, provider: toPrismaProvider(provider) } },
      select: { secret: true },
    });
    return record?.secret ?? null;
  }

  async set(userId: UserId, provider: ApiKeyProvider, key: string): Promise<SavedApiKey> {
    const prismaProvider = toPrismaProvider(provider);
    const values = { secret: key, last4: key.slice(-4) };
    const record = await this.db.userApiKey.upsert({
      where: { userId_provider: { userId, provider: prismaProvider } },
      update: values,
      create: { userId, provider: prismaProvider, ...values },
    });
    return toSavedApiKey(record);
  }

  async remove(userId: UserId, provider: ApiKeyProvider): Promise<void> {
    await this.db.userApiKey.deleteMany({ where: { userId, provider: toPrismaProvider(provider) } });
  }
}
