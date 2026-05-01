Dưới đây là design kiến trúc ở mức vừa đủ để triển khai MVP, theo hướng **multi-agent + workflow có kiểm soát**, dùng **Node.js / TypeScript / LangChain / LangGraph**.

## 1. Giả định thiết kế

Hệ thống nên được thiết kế để **đăng lên Facebook Page mà bạn sở hữu/quản trị**, không nên đăng bằng browser automation giả lập người dùng. Với Facebook, hướng hợp lệ là dùng **Meta Graph API / Page Access Token**. Facebook Business SDK cho Node.js là SDK chính thức, hỗ trợ nhiều API của Meta như Pages, Business Manager, Instagram; tài liệu SDK cũng nêu access token có thể đại diện cho User, App hoặc Page, và Pages API cần Page access token. ([GitHub][1])

Phần “cào dữ liệu” nên lấy từ **nguồn được phép**: RSS, API công khai, website có quyền crawl, nguồn nội bộ, hoặc đối tác cung cấp dữ liệu. Không nên cào dữ liệu trực tiếp từ Facebook nếu không có quyền rõ ràng, vì robots.txt của Facebook nêu việc thu thập dữ liệu tự động trên Facebook bị cấm nếu không có sự cho phép bằng văn bản. ([Facebook][2])

## 2. Stack đề xuất

**Core backend**

- **Node.js + TypeScript**
- **NestJS** hoặc **Fastify** cho API service
- **LangGraph.js** cho orchestration agent/workflow
- **LangChain.js** cho model/tool abstraction
- **BullMQ + Redis** cho queue, retry, schedule
- **PostgreSQL** cho campaign, source, post, audit log
- **S3 / Cloudflare R2 / MinIO** cho ảnh
- **Qdrant / pgvector** cho semantic memory, dedupe nội dung

**External integration**

- **Meta Graph API / facebook-nodejs-business-sdk** để đăng bài
- **Crawlee / Playwright / Cheerio / RSS parser** cho crawler tùy loại nguồn
- **OpenTelemetry + LangSmith** hoặc custom tracing để debug agent flow

LangGraph phù hợp cho bài toán này vì nó hỗ trợ agent orchestration, long-term memory và human-in-the-loop; LangGraph cũng có persistence/checkpoint để lưu trạng thái từng bước, giúp pause/resume và khôi phục workflow khi lỗi. ([NPM][3])

## 3. Kiến trúc tổng thể

```text
                   ┌────────────────────┐
                   │ Admin Dashboard     │
                   │ Campaign / Sources  │
                   └─────────┬──────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────┐
│                API / Orchestrator                  │
│          NestJS/Fastify + LangGraph.js             │
└───────────────┬───────────────────────┬────────────┘
                │                       │
                ▼                       ▼
      ┌─────────────────┐      ┌────────────────────┐
      │ Job Scheduler   │      │ Agent State Store   │
      │ BullMQ + Redis  │      │ Postgres/Redis      │
      └───────┬─────────┘      └────────────────────┘
              │
              ▼
┌────────────────────────────────────────────────────┐
│              Multi-Agent Workflow                  │
│                                                    │
│ Supervisor Agent                                   │
│ ├─ Source Discovery Agent                          │
│ ├─ Scraper / Collector Agent                       │
│ ├─ Content Understanding Agent                     │
│ ├─ Copywriting Agent                               │
│ ├─ Image Agent                                     │
│ ├─ QA / Compliance Agent                           │
│ ├─ Scheduler Agent                                 │
│ └─ Publisher Agent                                 │
└───────────────┬────────────────────────────────────┘
                │
                ▼
        ┌───────────────┐
        │ Facebook Page │
        │ Graph API     │
        └───────────────┘
```

## 4. Các agent chính

### 4.1. Supervisor Agent

Agent điều phối chính. Nó không trực tiếp làm hết mọi việc, mà quyết định bước tiếp theo trong graph.

Nhiệm vụ:

- Nhận mục tiêu campaign.
- Gọi đúng agent theo trạng thái.
- Dừng workflow khi thiếu dữ liệu hoặc cần duyệt thủ công.
- Ghi lại decision log.

Có thể dùng pattern **Supervisor Agent**: một agent trung tâm điều phối các agent chuyên môn. LangGraph Supervisor JS cũng mô tả mô hình hierarchical multi-agent, trong đó supervisor kiểm soát luồng giao tiếp và phân công task cho agent chuyên biệt. ([LangChain AI][4])

---

### 4.2. Source Discovery Agent

Chọn nguồn dữ liệu để lấy nội dung.

Ví dụ input:

```json
{
  "topic": "AI tools for small business",
  "language": "vi",
  "source_policy": "rss_api_only",
  "campaign_id": "camp_001"
}
```

Output:

```json
{
  "sources": [
    {
      "type": "rss",
      "url": "https://example.com/feed",
      "priority": 0.9
    },
    {
      "type": "api",
      "url": "https://api.example.com/articles",
      "priority": 0.8
    }
  ]
}
```

---

### 4.3. Scraper / Collector Agent

Thu thập dữ liệu từ nguồn được duyệt.

Nên thiết kế theo adapter:

```text
SourceAdapter
├─ RssAdapter
├─ ApiAdapter
├─ StaticHtmlAdapter
├─ PlaywrightAdapter
└─ InternalDatabaseAdapter
```

Mỗi item sau khi crawl nên chuẩn hóa thành dạng:

```ts
type RawContentItem = {
  sourceUrl: string;
  title: string;
  text: string;
  images: string[];
  author?: string;
  publishedAt?: Date;
  license?: string;
  crawlTimestamp: Date;
};
```

Không nên để agent tùy ý crawl mọi URL. Nên có **source whitelist**, rate limit, robots.txt check, và lưu audit log.

---

### 4.4. Content Understanding Agent

Agent này đọc dữ liệu đã crawl và rút ra nội dung có thể dùng để viết bài.

Nhiệm vụ:

- Tóm tắt nội dung.
- Trích key facts.
- Phát hiện nội dung trùng.
- Xác định angle phù hợp cho Facebook.
- Lưu embedding để dedupe.

Output ví dụ:

```json
{
  "summary": "...",
  "key_points": ["...", "..."],
  "recommended_angle": "educational",
  "risk_flags": ["needs_source_check"]
}
```

---

### 4.5. Copywriting Agent

Sinh bài đăng Facebook.

Nên tách thành các mode:

```text
PostStyle
├─ News summary
├─ Educational
├─ Promotional
├─ Storytelling
├─ Short viral hook
└─ Expert opinion
```

Output nên có nhiều variant:

```json
{
  "variants": [
    {
      "text": "Bài viết phiên bản A...",
      "tone": "educational",
      "length": "medium"
    },
    {
      "text": "Bài viết phiên bản B...",
      "tone": "casual",
      "length": "short"
    }
  ]
}
```

Ở MVP, chỉ cần chọn 1 variant tốt nhất.

---

### 4.6. Image Agent

Xử lý ảnh cho bài viết.

Nhiệm vụ:

- Chọn ảnh từ nguồn crawl nếu có quyền dùng.
- Hoặc lấy ảnh từ asset library nội bộ.
- Hoặc gọi image generation service nếu bạn muốn tạo ảnh mới.
- Resize, compress, validate format.
- Upload ảnh vào object storage trước khi publish.

Không nên tự lấy ảnh từ web rồi đăng lại nếu không kiểm tra quyền sử dụng.

---

### 4.7. QA / Compliance Agent

Agent này rất quan trọng. Nó đóng vai trò “gatekeeper” trước khi đăng.

Check tối thiểu:

- Bài có copy nguyên văn quá nhiều không.
- Có claim nhạy cảm hoặc thiếu nguồn không.
- Có trùng với bài đã đăng không.
- Có chứa thông tin cá nhân không cần thiết không.
- Ảnh có quyền sử dụng không.
- Có phù hợp brand voice không.
- Có cần human approval không.

Flow tốt nhất cho giai đoạn đầu:

```text
Nếu confidence cao → tự động đăng
Nếu confidence thấp → đưa vào hàng chờ duyệt
Nếu có risk flag → không đăng
```

---

### 4.8. Scheduler Agent

Quyết định đăng ngay hay lên lịch.

Input:

```json
{
  "campaign_id": "camp_001",
  "post_type": "text_image",
  "priority": "normal",
  "target_page": "page_abc"
}
```

Output:

```json
{
  "publish_mode": "scheduled",
  "scheduled_at": "2026-05-01T09:00:00+07:00"
}
```

---

### 4.9. Publisher Agent

Agent này không nên “tự suy nghĩ” nhiều. Nó chỉ nhận payload đã được duyệt và gọi Facebook API.

Payload nội bộ:

```ts
type PublishPayload = {
  pageId: string;
  message: string;
  imageUrls?: string[];
  scheduledAt?: Date;
  campaignId: string;
};
```

Output:

```json
{
  "status": "published",
  "facebook_post_id": "123456789",
  "published_at": "..."
}
```

## 5. Flow end-to-end

```text
1. Admin tạo campaign
   ↓
2. Scheduler kích hoạt job
   ↓
3. Supervisor Agent bắt đầu workflow
   ↓
4. Source Discovery Agent chọn nguồn
   ↓
5. Scraper Agent crawl dữ liệu
   ↓
6. Content Understanding Agent tóm tắt, rút ý, dedupe
   ↓
7. Copywriting Agent viết bài Facebook
   ↓
8. Image Agent chọn/xử lý ảnh
   ↓
9. QA Agent kiểm tra rủi ro
   ↓
10. Nếu cần, gửi qua Human Review
   ↓
11. Scheduler Agent quyết định thời điểm đăng
   ↓
12. Publisher Agent gọi Meta Graph API
   ↓
13. Lưu post_id, log, trạng thái
   ↓
14. Feedback Agent đọc performance sau này
```

## 6. State machine LangGraph gợi ý

```text
START
  → load_campaign
  → discover_sources
  → collect_content
  → understand_content
  → generate_post
  → prepare_image
  → qa_check
      ├─ pass_auto_publish → schedule_or_publish
      ├─ need_human_review → wait_for_approval
      └─ reject → END
  → publish_to_facebook
  → save_result
END
```

Có thể chia thành graph chính và subgraph:

```text
MainGraph
├─ IngestionSubgraph
├─ ContentCreationSubgraph
├─ ReviewSubgraph
└─ PublishingSubgraph
```

## 7. Data model tối thiểu

```text
campaigns
- id
- name
- topic
- target_page_id
- language
- brand_voice
- status

sources
- id
- campaign_id
- type
- url
- crawl_policy
- enabled

content_items
- id
- source_id
- source_url
- title
- raw_text
- summary
- image_urls
- hash
- embedding_id

post_drafts
- id
- campaign_id
- content_item_id
- text
- image_asset_id
- status
- risk_score
- approval_status

published_posts
- id
- post_draft_id
- facebook_page_id
- facebook_post_id
- published_at
- status
- error_message

agent_runs
- id
- campaign_id
- graph_run_id
- node_name
- input_json
- output_json
- status
- created_at
```

## 8. MVP nên làm trước

Phiên bản đầu tiên nên giới hạn scope:

```text
MVP v1
├─ Chỉ đăng Facebook Page
├─ Chỉ hỗ trợ text + 1 image
├─ Chỉ crawl RSS/API/website whitelist
├─ Có human approval trước khi đăng
├─ Có dedupe bài viết
├─ Có log từng bước agent
└─ Có retry khi publish lỗi
```

Sau đó mới mở rộng:

```text
v2
├─ Multi-image post
├─ Auto schedule theo khung giờ tốt
├─ A/B testing caption
├─ Analytics feedback loop
├─ Auto rewrite theo performance
├─ Multi-page / multi-brand
└─ Instagram / LinkedIn / TikTok cross-posting
```

## 9. Thiết kế khuyến nghị cuối cùng

Tôi đề xuất dùng kiến trúc này:

```text
NestJS API
+ LangGraph.js orchestration
+ LangChain.js tools
+ BullMQ job queue
+ PostgreSQL state/audit
+ Redis queue/cache
+ S3/R2 image storage
+ pgvector/Qdrant dedupe memory
+ Meta Graph API Publisher
+ Admin Dashboard for approval  (react/typescript/zustand/tailwind/zod/react-query)
```

Điểm quan trọng nhất là **không để AI agent có quyền đăng trực tiếp mà không qua guardrail**. Agent có thể đề xuất, viết, chọn ảnh, lên lịch; nhưng bước publish nên đi qua một node rất rõ ràng: `QA → Approval Policy → Publisher`. Điều này giúp hệ thống an toàn, dễ debug và dễ mở rộng.

[1]: https://github.com/facebook/facebook-nodejs-business-sdk 'GitHub - facebook/facebook-nodejs-business-sdk: Node.js SDK for Meta Marketing APIs · GitHub'
[2]: https://www.facebook.com/robots.txt/ 'www.facebook.com'
[3]: https://www.npmjs.com/package/%40langchain/langgraph?utm_source=chatgpt.com '@langchain/langgraph - npm'
[4]: https://langchain-ai.github.io/langgraphjs/reference/modules/langgraph-supervisor.html?utm_source=chatgpt.com '@langchain/langgraph-supervisor | LangGraph.js API Reference'
