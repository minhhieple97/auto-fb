import { useMutation } from "@tanstack/react-query";
import { Loader2, Terminal } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/button.js";
import { Textarea } from "../../components/ui/textarea.js";
import { api } from "../../lib/api-client.js";
import type { SourceTabProps } from "./source-constants.js";

const MIN_CURL_LENGTH = 5;

export function CurlSourceTab({ fanpageId, canCreate, onSuccess }: SourceTabProps) {
  const [curlText, setCurlText] = useState("");

  const createCurl = useMutation({
    mutationFn: ({ id, curlCommand }: { id: string; curlCommand: string }) =>
      api.createCurlSource(id, { curlCommand }),
    onSuccess: () => {
      setCurlText("");
      onSuccess();
    }
  });

  const disabled = !fanpageId || !canCreate || createCurl.isPending;
  const valid = curlText.trim().length >= MIN_CURL_LENGTH;

  function handleSubmit() {
    if (!fanpageId || !valid) return;
    createCurl.mutate({ id: fanpageId, curlCommand: curlText });
  }

  return (
    <div className="grid gap-4 py-4">
      <div>
        <label className="text-sm font-medium text-slate-700 mb-1.5 block">Paste cURL command</label>
        <Textarea
          disabled={disabled}
          className="min-h-32 font-mono text-xs"
          placeholder={`curl 'https://api.example.com/articles' \\\n  -H 'Accept: application/json'`}
          value={curlText}
          onChange={(e) => setCurlText(e.target.value)}
        />
        <p className="text-xs text-slate-400 mt-1">Supports GET/POST requests with headers and body.</p>
      </div>
      <div className="flex justify-end pt-2">
        <Button disabled={disabled || !valid} onClick={handleSubmit}>
          {createCurl.isPending ? (
            <><Loader2 size={14} className="mr-1.5 animate-spin" /> Adding...</>
          ) : (
            <><Terminal size={14} className="mr-1.5" /> Add cURL Source</>
          )}
        </Button>
      </div>
      {createCurl.isError && (
        <p className="text-xs text-red-600">{(createCurl.error as Error).message}</p>
      )}
    </div>
  );
}
