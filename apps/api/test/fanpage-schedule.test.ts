import { ConfigService } from "@nestjs/config";
import { describe, expect, it, vi } from "vitest";
import { FanpageScheduleService, latestDueScheduleSlot } from "../src/workflow/fanpage-schedule.service.js";
import { FakeDatabase } from "./fake-database.js";
import { buildFanpageInput, buildAgentWorkflowRun } from "./helpers.js";

describe("Fanpage scheduling", () => {
  it("finds the latest due slot without backfilling multiple missed slots", () => {
    const fanpage = {
      id: "fanpage_1",
      scheduleConfig: {
        enabled: true,
        postsPerDay: 3,
        intervalMinutes: 120,
        startTimeLocal: "09:00",
        timezone: "Asia/Saigon"
      },
      lastScheduledAt: undefined
    };

    expect(latestDueScheduleSlot(fanpage, new Date("2026-05-01T05:30:00.000Z"))?.toISOString()).toBe("2026-05-01T04:00:00.000Z");
  });

  it("does not enqueue disabled fanpages or duplicate the last scheduled slot", async () => {
    const db = new FakeDatabase();
    db.createFanpage(
      buildFanpageInput({
        scheduleConfig: {
          enabled: false,
          postsPerDay: 1,
          intervalMinutes: 1440,
          startTimeLocal: "09:00",
          timezone: "Asia/Saigon"
        }
      })
    );
    const due = db.createFanpage(
      buildFanpageInput({
        name: "Due fanpage",
        facebookPageId: "page_2",
        scheduleConfig: {
          enabled: true,
          postsPerDay: 1,
          intervalMinutes: 1440,
          startTimeLocal: "09:00",
          timezone: "Asia/Saigon"
        }
      })
    );
    db.markFanpageScheduled(due.id, "2026-05-01T02:00:00.000Z");
    const queue = { enqueue: vi.fn().mockResolvedValue(buildAgentWorkflowRun()) };
    const service = new FanpageScheduleService(new ConfigService(), db, queue as never);

    await expect(service.enqueueDueSchedules(new Date("2026-05-01T02:30:00.000Z"))).resolves.toEqual([]);
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it("enqueues one workflow run for the latest due fanpage slot", async () => {
    const db = new FakeDatabase();
    const fanpage = db.createFanpage(
      buildFanpageInput({
        scheduleConfig: {
          enabled: true,
          postsPerDay: 2,
          intervalMinutes: 120,
          startTimeLocal: "09:00",
          timezone: "Asia/Saigon"
        }
      })
    );
    const queue = { enqueue: vi.fn().mockResolvedValue(buildAgentWorkflowRun({ campaignId: fanpage.campaignId })) };
    const service = new FanpageScheduleService(new ConfigService(), db, queue as never);

    const runs = await service.enqueueDueSchedules(new Date("2026-05-01T04:30:00.000Z"));

    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ fanpageId: fanpage.id, campaignId: fanpage.campaignId, scheduledAt: "2026-05-01T04:00:00.000Z" });
    expect(queue.enqueue).toHaveBeenCalledWith(
      fanpage.campaignId,
      expect.objectContaining({ id: "system:scheduler" }),
      expect.objectContaining({ graphRunId: `schedule:${fanpage.id}:2026-05-01T04:00:00.000Z` })
    );
    expect(db.getFanpage(fanpage.id).lastScheduledAt).toBe("2026-05-01T04:00:00.000Z");
  });
});
