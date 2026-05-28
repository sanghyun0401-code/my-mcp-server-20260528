export default function HomePage() {
    return (
        <main
            style={{
                fontFamily: 'system-ui, sans-serif',
                maxWidth: 720,
                margin: '48px auto',
                padding: '0 24px',
                lineHeight: 1.6
            }}
        >
            <h1>my-mcp-server</h1>
            <p>
                Vercel에 배포 가능한 HTTP MCP 서버입니다. MCP 클라이언트에서 아래
                엔드포인트로 연결하세요.
            </p>
            <ul>
                <li>
                    <strong>MCP endpoint:</strong> <code>/api/mcp</code>
                </li>
                <li>
                    <strong>Transport:</strong> Streamable HTTP
                </li>
                <li>
                    <strong>Image generation:</strong> <code>x-hf-token</code>{' '}
                    헤더 또는 <code>HF_TOKEN</code> 환경변수
                </li>
            </ul>
            <p>
                로컬 개발: <code>npm run dev</code> 후{' '}
                <code>http://localhost:3000/api/mcp</code>
            </p>
        </main>
    )
}
