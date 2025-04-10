import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as path from 'path';
import * as dotenv from "dotenv";

// 절대 경로를 사용하여 .env 파일 로드
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Create an MCP server
const server = new McpServer({
    name: "GW-MCP-Server-Demo",
    version: "0.0.1"
});

// Add an addition tool
server.tool("add",
    { a: z.number(), b: z.number() },
    async ({ a, b }) => ({
        content: [{ type: "text", text: String(a + b) }]
    })
);

server.tool("create_task",
    {
        title: z.string().min(1).max(200),
        contents: z.string().min(1).max(10000),
        priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
    },
    async ({ title, contents, priority, startDate, endDate }) => {
        try {
            // 환경 변수에서 API 키 가져오기
            const apiKey = process.env.FLOW_API_KEY;
            if (apiKey === undefined || apiKey === null || apiKey === "") {
                return { content: [{ type: 'text', text: `API Key not found in environment variables` }] };
            }
            
            const aiResponse = await fetch('https://api.flow.team/v1/posts/projects/2388321/tasks', {
                method: 'post',
                headers: {
                    'Content-Type': 'application/json',
                    'x-flow-api-key': apiKey
                },
                body: JSON.stringify({
                    registerId: "origin@zerostudio.co.kr",
                    title,
                    contents,
                    status: "request",
                })
            });
            // priority,
            //     startDate,
            //     endDate,
            //     workers: ["origin@zerostudio.co.kr"],
            const data = await aiResponse.json();

            // 안전하게 오류 메시지 처리
            const errorMessage = data.response?.error?.message || '';
            return { content: [{ type: "text", text: `태스크가 성공적으로 생성되었습니다: ${data.response?.success || false} ${errorMessage}` }] };
        } catch (e) {
            return {
                content: [{ type: "text", text: `태스크 생성 중 오류가 발생했습니다: ${e}` }],
                isError: true
            };
        }
    }
);

// Add a dynamic greeting resource
server.resource(
    "greeting",
    new ResourceTemplate("greeting://{name}", { list: undefined }),
    async (uri, { name }) => ({
        contents: [{
            uri: uri.href,
            text: `Hello, ${name}!`
        }]
    })
);

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
// 최상위 레벨 await를 사용하는 대신 즉시 실행 함수로 감싸기
(async () => {
  await server.connect(transport);
})();