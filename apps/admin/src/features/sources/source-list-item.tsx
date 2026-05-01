import { sourceTypes, type Source } from "@auto-fb/shared";
import { Badge } from "../../components/ui/badge.js";
import { getSourceIcon, truncateCurl } from "./source-constants.js";

type SourceListItemProps = {
  source: Source;
};

export function SourceListItem({ source }: SourceListItemProps) {
  const Icon = getSourceIcon(source.type);
  const metadata = source.metadata as Record<string, string> | undefined;
  const displayUrl = source.url || truncateCurl(metadata?.curlCommand);
  const titleAttr = source.url || metadata?.curlCommand;

  return (
    <div className="group rounded-lg border border-slate-200 bg-white p-3 text-sm transition-all hover:border-slate-300 hover:shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-md bg-slate-100 p-1.5 text-slate-500">
          <Icon size={14} />
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-900">{source.type}</span>
            <SourceStatusBadge enabled={source.enabled} />
          </div>
          <p className="mt-1 truncate text-xs text-slate-500" title={titleAttr}>
            {displayUrl}
          </p>
          {source.type === sourceTypes.geminiSearch && metadata?.snippet && (
            <p className="mt-0.5 truncate text-xs text-violet-500">
              🔍 {metadata.snippet}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SourceStatusBadge({ enabled }: { enabled: boolean }) {
  if (enabled) {
    return (
      <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-normal bg-emerald-50 text-emerald-700 border-emerald-200">
        Active
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-normal bg-slate-50 text-slate-500 border-slate-200">
      Disabled
    </Badge>
  );
}
