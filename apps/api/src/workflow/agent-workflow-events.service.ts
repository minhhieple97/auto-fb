import { Injectable, type MessageEvent } from "@nestjs/common";
import type { AgentWorkflowRunDetail, AgentWorkflowRunEvent } from "@auto-fb/shared";
import { Observable, Subject } from "rxjs";

@Injectable()
export class AgentWorkflowEventsService {
  private readonly events = new Subject<AgentWorkflowRunEvent>();

  emit(run: AgentWorkflowRunDetail): void {
    this.events.next({ type: "workflow_run_updated", run });
  }

  stream(campaignId?: string): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      const subscription = this.events.subscribe((event) => {
        if (campaignId && event.run.campaignId !== campaignId) {
          return;
        }
        subscriber.next({ type: event.type, data: event });
      });

      return () => subscription.unsubscribe();
    });
  }
}
