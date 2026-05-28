# TypeScript MCP Server (Vercel HTTP)

Next.js App Router와 [`mcp-handler`](https://github.com/vercel/mcp-handler)를 사용해 Vercel에 배포 가능한 HTTP MCP 서버입니다.

## 프로젝트 구조

```
├── app/
│   ├── api/[transport]/route.ts   # HTTP MCP 엔드포인트 (/api/mcp)
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   └── mcp-server.ts              # 도구/프롬프트/리소스 등록 로직
├── next.config.ts
├── vercel.json
├── package.json
└── tsconfig.json
```

## 제공 기능

| 유형 | 이름 | 설명 |
|------|------|------|
| Tool | `greet` | 이름과 언어로 인사말 반환 |
| Tool | `calculate` | 사칙연산 |
| Tool | `current_time` | timezone 기준 현재 시간 |
| Tool | `geocode_city` | 도시명 → 위도·경도 |
| Tool | `get_weather` | 좌표 기준 날씨 조회 |
| Tool | `generate_image` | HuggingFace FLUX.1-schnell 이미지 생성 |
| Prompt | `code-review` | 코드 리뷰 프롬프트 |
| Resource | `server-info` | 서버 메타 정보 |

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 (선택)

`.env.example`을 참고해 `.env.local`을 생성합니다.

```bash
HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

`generate_image` 도구는 **요청 헤더 `x-hf-token`을 우선** 사용하고, 없을 경우 `HF_TOKEN` 환경변수를 폴백으로 사용합니다.

### 3. 로컬 개발

```bash
npm run dev
```

- 홈: `http://localhost:3000`
- MCP endpoint: `http://localhost:3000/api/mcp`

### 4. 프로덕션 빌드

```bash
npm run build
npm run start
```

## Vercel 배포

1. [Vercel](https://vercel.com)에 프로젝트를 연결합니다.
2. (선택) Vercel 대시보드에서 `HF_TOKEN` 환경변수를 설정합니다.
3. 배포 후 MCP endpoint: `https://<your-deployment>.vercel.app/api/mcp`

`vercel.json`에서 이미지 생성을 고려해 Function `maxDuration`을 60초로 설정했습니다.

```bash
npx vercel deploy
```

## Cursor MCP 연결 (HTTP)

`.cursor/mcp.json` 예시:

```json
{
    "mcpServers": {
        "my-mcp-server": {
            "url": "http://localhost:3000/api/mcp",
            "headers": {
                "x-hf-token": "hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            }
        }
    }
}
```

Vercel 배포 후에는 `url`을 배포 URL로 변경합니다.

```json
{
    "mcpServers": {
        "my-mcp-server": {
            "url": "https://<your-deployment>.vercel.app/api/mcp",
            "headers": {
                "x-hf-token": "hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            }
        }
    }
}
```

## x-hf-token 헤더

`generate_image` 도구는 클라이언트가 HuggingFace 토큰을 직접 전달할 수 있도록 `x-hf-token` 커스텀 헤더를 지원합니다.

- **우선순위**: `x-hf-token` 헤더 → `HF_TOKEN` 환경변수
- **둘 다 없을 때**: 친절한 에러 메시지 반환

이 방식을 사용하면 서버에 토큰을 저장하지 않고도 클라이언트별로 토큰을 전달할 수 있습니다.

## 주요 의존성

- **next** — App Router 기반 HTTP 서버
- **mcp-handler** — Vercel용 MCP HTTP 어댑터
- **@modelcontextprotocol/sdk** — MCP 프로토콜 SDK
- **@huggingface/inference** — HuggingFace Inference API
- **zod** — 스키마 검증

## 참고 자료

- [Vercel MCP 배포 가이드](https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel)
- [mcp-handler](https://github.com/vercel/mcp-handler)
- [Model Context Protocol](https://modelcontextprotocol.io/)

## 라이선스

MIT
