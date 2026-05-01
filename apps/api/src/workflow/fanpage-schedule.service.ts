import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { permissionsForRole, type AgentWorkflowRunDetail, type Fanpage, type FanpageScheduleConfig } from "@auto-fb/shared";
import type { SupabaseActor } from "../auth/supabase-auth.service.js";
import { appDefaults, envKeys } from "../common/app.constants.js";
import { DATABASE_REPOSITORY, type DatabaseRepository } from "../persistence/database.repository.js";
import { AgentWorkflowQueueService } from "./agent-workflow-queue.service.js";

const SYSTEM_SCHEDULER_ACTOR: SupabaseActor = {
  authUserId: "system:scheduler",
  id: "system:scheduler",
  email: "scheduler@auto-fb.local",
  role: "owner",
  status: "active",
  permissions: permissionsForRole("owner")
};

export type ScheduledFanpageRun = {
  fanpageId: string;
  campaignId: string;
  scheduledAt: string;
  run: AgentWorkflowRunDetail;
};

@Injectable()
export class FanpageScheduleService implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | undefined;

  constructor(
    config: ConfigService,
    @Inject(DATABASE_REPOSITORY) private readonly db: DatabaseRepository,
    private readonly queue: AgentWorkflowQueueService
  ) {
    const redisUrl = config.get<string>(envKeys.redisUrl);
    if (redisUrl) {
      const intervalMs = Number(
        config.get<string | number>(envKeys.fanpageSchedulerIntervalMs, appDefaults.fanpageSchedulerIntervalMs)
      );
      this.timer = setInterval(() => {
        void this.enqueueDueSchedules().catch(() => undefined);
      }, Number.isFinite(intervalMs) && intervalMs > 0 ? intervalMs : appDefaults.fanpageSchedulerIntervalMs);
    }
  }

  onModuleInit(): void {
    if (this.timer) {
      void this.enqueueDueSchedules().catch(() => undefined);
    }
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async enqueueDueSchedules(now = new Date()): Promise<ScheduledFanpageRun[]> {
    const fanpages = await this.db.listSchedulableFanpages();
    const runs: ScheduledFanpageRun[] = [];

    for (const fanpage of fanpages) {
      const dueSlot = latestDueScheduleSlot(fanpage, now);
      if (!dueSlot) continue;

      const scheduledAt = dueSlot.toISOString();
      const run = await this.queue.enqueue(fanpage.campaignId, SYSTEM_SCHEDULER_ACTOR, {
        graphRunId: scheduleGraphRunId(fanpage.id, scheduledAt)
      });
      await this.db.markFanpageScheduled(fanpage.id, scheduledAt);
      runs.push({ fanpageId: fanpage.id, campaignId: fanpage.campaignId, scheduledAt, run });
    }

    return runs;
  }
}

export function latestDueScheduleSlot(fanpage: Pick<Fanpage, "id" | "lastScheduledAt" | "scheduleConfig">, now: Date): Date | undefined {
  const latestSlot = latestSlotAtOrBefore(fanpage.scheduleConfig, now);
  if (!latestSlot) return undefined;
  if (fanpage.lastScheduledAt && latestSlot.getTime() <= new Date(fanpage.lastScheduledAt).getTime()) return undefined;
  return latestSlot;
}

function latestSlotAtOrBefore(scheduleConfig: FanpageScheduleConfig, now: Date): Date | undefined {
  if (!scheduleConfig.enabled) return undefined;

  const localToday = localDateParts(now, scheduleConfig.timezone);
  const candidates: Date[] = [];
  for (const dayOffset of [-1, 0]) {
    const localDay = addDays(localToday, dayOffset);
    for (let index = 0; index < scheduleConfig.postsPerDay; index += 1) {
      const slot = scheduleSlotUtc(localDay, scheduleConfig, index);
      if (slot.getTime() <= now.getTime()) candidates.push(slot);
    }
  }

  return candidates.sort((a, b) => b.getTime() - a.getTime())[0];
}

function scheduleSlotUtc(localDay: LocalDateParts, scheduleConfig: FanpageScheduleConfig, slotIndex: number): Date {
  const [startHour = 0, startMinute = 0] = scheduleConfig.startTimeLocal.split(":").map((value) => Number(value));
  const totalMinutes = startHour * 60 + startMinute + slotIndex * scheduleConfig.intervalMinutes;
  const dayOffset = Math.floor(totalMinutes / 1440);
  const minuteOfDay = totalMinutes % 1440;
  const slotDay = addDays(localDay, dayOffset);
  return zonedLocalTimeToUtc(
    {
      ...slotDay,
      hour: Math.floor(minuteOfDay / 60),
      minute: minuteOfDay % 60,
      second: 0
    },
    scheduleConfig.timezone
  );
}

function scheduleGraphRunId(fanpageId: string, scheduledAt: string): string {
  return `schedule:${fanpageId}:${scheduledAt}`;
}

type LocalDateParts = {
  year: number;
  month: number;
  day: number;
};

type LocalDateTimeParts = LocalDateParts & {
  hour: number;
  minute: number;
  second: number;
};

function localDateParts(date: Date, timeZone: string): LocalDateParts {
  const parts = localParts(date, timeZone);
  return { year: parts.year, month: parts.month, day: parts.day };
}

function addDays(parts: LocalDateParts, days: number): LocalDateParts {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate()
  };
}

function zonedLocalTimeToUtc(parts: LocalDateTimeParts, timeZone: string): Date {
  let utcMs = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  for (let index = 0; index < 3; index += 1) {
    utcMs = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - timeZoneOffsetMs(new Date(utcMs), timeZone);
  }
  return new Date(utcMs);
}

function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = localParts(date, timeZone);
  const localAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return localAsUtc - date.getTime();
}

function localParts(date: Date, timeZone: string): LocalDateTimeParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  const values = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second)
  };
}
