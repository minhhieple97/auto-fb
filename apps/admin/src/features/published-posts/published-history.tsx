import type { PublishedPost } from "@auto-fb/shared";

type PublishedHistoryProps = {
  posts: PublishedPost[];
};

export function PublishedHistory({ posts }: PublishedHistoryProps) {
  return (
    <div className="panel p-4">
      <h2 className="mb-3 text-base font-semibold">Published history</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-line text-slate-600">
            <tr>
              <th className="py-2">Status</th>
              <th>Facebook post</th>
              <th>Draft</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr className="border-b border-line" key={post.id}>
                <td className="py-2">{post.status}</td>
                <td>{post.facebookPostId ?? "-"}</td>
                <td>{post.postDraftId}</td>
                <td>{post.errorMessage ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {posts.length === 0 ? <p className="py-3 text-sm text-slate-600">No published posts</p> : null}
      </div>
    </div>
  );
}
