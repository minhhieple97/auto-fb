import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PostDraft } from "@auto-fb/shared";
import { Check, Trash2 } from "lucide-react";
import { queryKeys } from "../../app/query-keys.js";
import { api } from "../../lib/api-client.js";

type DraftInboxProps = {
  canReview?: boolean;
  drafts: PostDraft[];
  onChanged: () => Promise<void>;
};

export function DraftInbox({ canReview = true, drafts, onChanged }: DraftInboxProps) {
  const queryClient = useQueryClient();
  const approve = useMutation({
    mutationFn: ({ id, confirmProduction }: { id: string; confirmProduction?: boolean }) =>
      api.approveDraft(id, {
        ...(confirmProduction ? { confirmProduction } : {})
      }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.draftsRoot }),
        queryClient.invalidateQueries({ queryKey: queryKeys.publishedPostsRoot }),
        onChanged()
      ])
  });
  const reject = useMutation({
    mutationFn: api.rejectDraft,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.draftsRoot }),
        queryClient.invalidateQueries({ queryKey: queryKeys.publishedPostsRoot }),
        onChanged()
      ])
  });

  function approveDraft(draft: PostDraft) {
    const isProduction = draft.fanpage?.environment === "production";
    if (isProduction && !window.confirm(`Publish approved draft to production fanpage ${draft.fanpage?.name ?? draft.fanpage?.facebookPageId}?`)) {
      return;
    }
    approve.mutate({ id: draft.id, ...(isProduction ? { confirmProduction: true } : {}) });
  }

  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center gap-2">
        <Check size={18} />
        <h2 className="text-base font-semibold">Approval inbox</h2>
      </div>
      <div className="space-y-3">
        {drafts.length === 0 ? <p className="text-sm text-slate-600">No pending drafts</p> : null}
        {drafts.map((draft) => (
          <article className="rounded-md border border-line p-4" key={draft.id}>
            <div className="mb-3 grid gap-3 md:grid-cols-[1fr_180px]">
              <div>
                <div className="mb-2 text-sm font-semibold">{draft.contentItem?.title ?? draft.contentItemId}</div>
                <p className="whitespace-pre-wrap text-sm leading-6">{draft.text}</p>
              </div>
              {draft.imageAsset?.publicUrl ? (
                <img className="h-32 w-full rounded-md object-cover" src={draft.imageAsset.publicUrl} alt="" />
              ) : (
                <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-line text-sm text-slate-500">No image</div>
              )}
            </div>
            <div className="mb-3 flex flex-wrap gap-2 text-xs">
              {draft.fanpage ? (
                <span className="rounded bg-slate-100 px-2 py-1">
                  {draft.fanpage.name} - {draft.fanpage.environment === "sandbox" ? "Sandbox" : "Production"}
                </span>
              ) : null}
              <span className="rounded bg-slate-100 px-2 py-1">Risk {draft.riskScore}</span>
              {draft.riskFlags.map((flag) => (
                <span className="rounded bg-amber-100 px-2 py-1 text-warn" key={flag}>
                  {flag}
                </span>
              ))}
            </div>
            {canReview ? (
              <div className="flex gap-2">
                <button className="button bg-action text-white" onClick={() => approveDraft(draft)} title="Approve and publish">
                  <Check size={16} />
                  Approve
                </button>
                <button className="button border border-line bg-white text-ink" onClick={() => reject.mutate(draft.id)} title="Reject">
                  <Trash2 size={16} />
                  Reject
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
