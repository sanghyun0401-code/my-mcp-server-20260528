import { createMcpHandler } from 'mcp-handler'
import { registerAll, SERVER_NAME, SERVER_VERSION } from '@/lib/mcp-server'

const handler = createMcpHandler(
    (server) => registerAll(server),
    {
        serverInfo: {
            name: SERVER_NAME,
            version: SERVER_VERSION
        },
        capabilities: {
            tools: {},
            prompts: {},
            resources: {}
        }
    },
    {
        basePath: '/api',
        maxDuration: 60,
        verboseLogs: process.env.NODE_ENV === 'development'
    }
)

export { handler as GET, handler as POST, handler as DELETE }
