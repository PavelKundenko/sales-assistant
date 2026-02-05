import axios from 'axios';
import { IsNull } from 'typeorm';
import dataSource from '../../data-source';
import { UserEntity } from '../modules/users/entities/user.entity';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TELEGRAM_TOKEN) {
  throw new Error('Missing TELEGRAM_BOT_TOKEN environment variable');
}

const BACKFILL_DELAY_MS = Number(process.env.BACKFILL_DELAY_MS ?? 35);
const BACKFILL_LIMIT = Number(process.env.BACKFILL_LIMIT ?? 0);

const telegramApi = axios.create({
  baseURL: `https://api.telegram.org/bot${TELEGRAM_TOKEN}`,
  timeout: 10_000,
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function run(): Promise<void> {
  await dataSource.initialize();

  try {
    const repository = dataSource.getRepository(UserEntity);
    const users = await repository.find({
      where: { telegramUsername: IsNull() },
      order: { createdAt: 'ASC' },
      take: BACKFILL_LIMIT > 0 ? BACKFILL_LIMIT : undefined,
    });

    if (users.length === 0) {
      console.log('No users without telegram_username found.');
      return;
    }

    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const [index, user] of users.entries()) {
      try {
        const response = await telegramApi.get('/getChat', {
          params: { chat_id: user.telegramId },
        });

        const username = response.data?.ok ? (response.data.result?.username ?? null) : null;

        if (username) {
          await repository.update({ id: user.id }, { telegramUsername: username });
          updated += 1;
        } else {
          skipped += 1;
        }
      } catch (error) {
        failed += 1;
        const reason = error instanceof Error ? error.message : String(error);
        console.warn(`Failed to backfill user ${user.id} (${user.telegramId}): ${reason}`);
      }

      if (index < users.length - 1 && BACKFILL_DELAY_MS > 0) {
        await sleep(BACKFILL_DELAY_MS);
      }
    }

    console.log(
      `Backfill complete. Updated: ${updated}, skipped (no username): ${skipped}, failed: ${failed}, total: ${users.length}`,
    );
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

void run();
