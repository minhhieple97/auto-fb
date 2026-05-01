import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PostDraft } from "@auto-fb/shared";
import { Check, Trash2 } from "lucide-react";
import { api } from "../../lib/api-client.js";

type DraftInboxProps = {
  drafts: PostDraft[];
  onChanged: () => Promise<void>;
};

export function DraftInbox({ drafts, onChanged }: DraftInboxProps) {
  const queryClient = useQueryClient();
  const approve = useMutation({
    mutationFn: api.approveDraft,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["drafts"] }),
        queryClient.invalidateQueries({ queryKey: ["published-posts"] }),
        onChanged()
      ])
  });
  const reject = useMutation({
    mutationFn: api.rejectDraft,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["drafts"] }),
        queryClient.invalidateQueries({ queryKey: ["published-posts"] }),
        onChanged()
      ])
  });

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
              <span className="rounded bg-slate-100 px-2 py-1">Risk {draft.riskScore}</span>
              {draft.riskFlags.map((flag) => (
                <span className="rounded bg-amber-100 px-2 py-1 text-warn" key={flag}>
                  {flag}
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <button className="button bg-action text-white" onClick={() => approve.mutate(draft.id)} title="Approve and publish dry run">
                <Check size={16} />
                Approve
              </button>
              <button className="button border border-line bg-white text-ink" onClick={() => reject.mutate(draft.id)} title="Reject">
                <Trash2 size={16} />
                Reject
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
