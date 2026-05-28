import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { InferenceClient } from '@huggingface/inference'
import { z } from 'zod'

export const SERVER_NAME = 'my-mcp-server'
export const SERVER_VERSION = '1.0.0'

const SERVER_TOOLS = [
    { name: 'greet', description: '이름과 언어를 입력하면 인사말을 반환합니다.' },
    { name: 'calculate', description: '두 숫자와 연산자로 사칙연산 결과를 반환합니다.' },
    { name: 'current_time', description: 'timezone을 입력받아 해당 지역의 현재 시간을 반환합니다.' },
    { name: 'geocode_city', description: '도시 이름으로 위도·경도 좌표를 조회합니다.' },
    { name: 'get_weather', description: '위도·경도 좌표로 현재 날씨 정보를 조회합니다.' },
    {
        name: 'generate_image',
        description: 'HuggingFace FLUX.1-schnell로 프롬프트 기반 이미지를 생성합니다.'
    }
]

const SERVER_PROMPTS = [
    {
        name: 'code-review',
        description: '코드를 입력받아 코드 리뷰 베스트 프랙티스에 따라 리뷰합니다.'
    }
]

const SERVER_INFO_URI = `mcp://${SERVER_NAME}/info`

const textResponse = (text: string) => ({
    content: [{ type: 'text' as const, text }],
    structuredContent: { content: [{ type: 'text' as const, text }] }
})

const textOutputSchema = z.object({
    content: z
        .array(
            z.object({
                type: z.literal('text'),
                text: z.string()
            })
        )
        .describe('결과')
})

const weatherCodeMap: Record<number, string> = {
    0: '맑음',
    1: '대체로 맑음',
    2: '부분적으로 흐림',
    3: '흐림',
    45: '안개',
    48: '서리 안개',
    51: '가벼운 이슬비',
    53: '이슬비',
    55: '강한 이슬비',
    56: '가벼운 어는 이슬비',
    57: '어는 이슬비',
    61: '약한 비',
    63: '비',
    65: '강한 비',
    66: '가벼운 어는 비',
    67: '어는 비',
    71: '약한 눈',
    73: '눈',
    75: '강한 눈',
    77: '눈 알갱이',
    80: '약한 소나기',
    81: '소나기',
    82: '강한 소나기',
    85: '약한 눈 소나기',
    86: '강한 눈 소나기',
    95: '뇌우',
    96: '우박을 동반한 뇌우',
    99: '강한 우박을 동반한 뇌우'
}

interface KoreanCity {
    englishName: string
    latitude: number
    longitude: number
    displayNameKo: string
}

const koreanCityDefinitions: Array<{
    names: string[]
    englishName: string
    latitude: number
    longitude: number
    displayNameKo: string
}> = [
    { names: ['서울', '서울특별시'], englishName: 'Seoul', latitude: 37.566, longitude: 126.9784, displayNameKo: '서울' },
    { names: ['부산', '부산광역시'], englishName: 'Busan', latitude: 35.10168, longitude: 129.03004, displayNameKo: '부산' },
    { names: ['인천', '인천광역시'], englishName: 'Incheon', latitude: 37.4563, longitude: 126.7052, displayNameKo: '인천' },
    { names: ['대구', '대구광역시'], englishName: 'Daegu', latitude: 35.8714, longitude: 128.6014, displayNameKo: '대구' },
    { names: ['대전', '대전광역시'], englishName: 'Daejeon', latitude: 36.3504, longitude: 127.3845, displayNameKo: '대전' },
    { names: ['광주', '광주광역시'], englishName: 'Gwangju', latitude: 35.1595, longitude: 126.8526, displayNameKo: '광주' },
    { names: ['울산', '울산광역시'], englishName: 'Ulsan', latitude: 35.5384, longitude: 129.3114, displayNameKo: '울산' },
    { names: ['세종', '세종특별자치시'], englishName: 'Sejong', latitude: 36.4801, longitude: 127.289, displayNameKo: '세종' },
    { names: ['수원', '수원시'], englishName: 'Suwon', latitude: 37.2636, longitude: 127.0286, displayNameKo: '수원' },
    { names: ['고양', '고양시'], englishName: 'Goyang', latitude: 37.6584, longitude: 126.832, displayNameKo: '고양' },
    { names: ['용인', '용인시'], englishName: 'Yongin', latitude: 37.2411, longitude: 127.1776, displayNameKo: '용인' },
    { names: ['성남', '성남시'], englishName: 'Seongnam', latitude: 37.4201, longitude: 127.1262, displayNameKo: '성남' },
    { names: ['부천', '부천시'], englishName: 'Bucheon', latitude: 37.5034, longitude: 126.766, displayNameKo: '부천' },
    { names: ['청주', '청주시'], englishName: 'Cheongju', latitude: 36.6424, longitude: 127.489, displayNameKo: '청주' },
    { names: ['전주', '전주시'], englishName: 'Jeonju', latitude: 35.8242, longitude: 127.148, displayNameKo: '전주' },
    { names: ['천안', '천안시'], englishName: 'Cheonan', latitude: 36.8151, longitude: 127.1139, displayNameKo: '천안' },
    { names: ['창원', '창원시'], englishName: 'Changwon', latitude: 35.228, longitude: 128.6811, displayNameKo: '창원' },
    { names: ['포항', '포항시'], englishName: 'Pohang', latitude: 36.019, longitude: 129.3435, displayNameKo: '포항' },
    { names: ['제주', '제주시', '제주도'], englishName: 'Jeju', latitude: 33.4996, longitude: 126.5312, displayNameKo: '제주' },
    { names: ['춘천', '춘천시'], englishName: 'Chuncheon', latitude: 37.8813, longitude: 127.7298, displayNameKo: '춘천' },
    { names: ['강릉', '강릉시'], englishName: 'Gangneung', latitude: 37.7519, longitude: 128.8761, displayNameKo: '강릉' },
    { names: ['목포', '목포시'], englishName: 'Mokpo', latitude: 34.8118, longitude: 126.3922, displayNameKo: '목포' },
    { names: ['여수', '여수시'], englishName: 'Yeosu', latitude: 34.7604, longitude: 127.6622, displayNameKo: '여수' },
    { names: ['순천', '순천시'], englishName: 'Suncheon', latitude: 34.9506, longitude: 127.4872, displayNameKo: '순천' },
    { names: ['김해', '김해시'], englishName: 'Gimhae', latitude: 35.2285, longitude: 128.889, displayNameKo: '김해' },
    { names: ['안산', '안산시'], englishName: 'Ansan', latitude: 37.3219, longitude: 126.8309, displayNameKo: '안산' },
    { names: ['파주', '파주시'], englishName: 'Paju', latitude: 37.7599, longitude: 126.78, displayNameKo: '파주' },
    { names: ['김포', '김포시'], englishName: 'Gimpo', latitude: 37.6152, longitude: 126.7155, displayNameKo: '김포' }
]

const koreanCityMap = new Map<string, KoreanCity>()
const koreanToEnglishMap = new Map<string, string>()

for (const city of koreanCityDefinitions) {
    for (const name of city.names) {
        koreanCityMap.set(name, {
            englishName: city.englishName,
            latitude: city.latitude,
            longitude: city.longitude,
            displayNameKo: city.displayNameKo
        })
        koreanToEnglishMap.set(name, city.englishName)
    }
}

const resolveKoreanCity = (city: string): KoreanCity | undefined =>
    koreanCityMap.get(city.trim())

const resolveEnglishCityName = (city: string): string | undefined =>
    koreanToEnglishMap.get(city.trim())

const getWeatherDescription = (code: number): string =>
    weatherCodeMap[code] ?? `알 수 없는 날씨 (코드: ${code})`

const resolveHfToken = (headers: Record<string, string | string[] | undefined>): string | undefined => {
    const raw = headers['x-hf-token'] ?? headers['X-HF-Token']
    const headerToken = Array.isArray(raw) ? raw[0] : raw
    return headerToken || process.env.HF_TOKEN
}

export function registerAll(server: McpServer): void {
    server.registerResource(
        'server-info',
        SERVER_INFO_URI,
        {
            title: 'MCP Server Info',
            description: '이 MCP 서버의 이름, 버전, 제공 도구 목록 등 메타 정보',
            mimeType: 'application/json'
        },
        async () => ({
            contents: [
                {
                    uri: SERVER_INFO_URI,
                    mimeType: 'application/json',
                    text: JSON.stringify(
                        {
                            name: SERVER_NAME,
                            version: SERVER_VERSION,
                            description:
                                'TypeScript 기반 MCP 서버 (인사, 계산, 시간, 지오코딩, 날씨, 이미지 생성, 코드 리뷰)',
                            transport: 'http',
                            tools: SERVER_TOOLS,
                            prompts: SERVER_PROMPTS,
                            resources: [{ name: 'server-info', uri: SERVER_INFO_URI }]
                        },
                        null,
                        2
                    )
                }
            ]
        })
    )

    server.registerPrompt(
        'code-review',
        {
            title: 'Code Review',
            description: '코드를 입력받아 코드 리뷰 베스트 프랙티스에 따라 리뷰합니다.',
            argsSchema: {
                code: z.string().describe('리뷰할 코드'),
                language: z
                    .string()
                    .optional()
                    .describe('프로그래밍 언어 (예: TypeScript, Python)'),
                context: z
                    .string()
                    .optional()
                    .describe('코드의 목적이나 배경 설명 (선택)')
            }
        },
        async ({ code, language, context }) => {
            const languageLine = language
                ? `프로그래밍 언어: ${language}`
                : '프로그래밍 언어: 코드에서 자동 추론'
            const contextLine = context ? `\n\n## 코드 배경\n${context}` : ''

            return {
                messages: [
                    {
                        role: 'user',
                        content: {
                            type: 'text',
                            text: `다음 코드를 코드 리뷰 베스트 프랙티스에 따라 리뷰해 주세요.

${languageLine}${contextLine}

## 리뷰 대상 코드
\`\`\`
${code}
\`\`\`

## 리뷰 지침
아래 항목을 기준으로 구체적이고 실행 가능한 피드백을 제공해 주세요.

1. **가독성**: 네이밍, 함수/모듈 크기, 코드 구조, 주석의 적절성
2. **정확성**: 로직 오류, 엣지 케이스 누락, 타입 안전성
3. **보안**: 입력 검증, 인증/인가, 민감 정보 노출, SQL/XSS 등 취약점
4. **성능**: 불필요한 연산, N+1 문제, 메모리 누수 가능성
5. **에러 처리**: 예외 처리, 실패 시나리오, 사용자 친화적 에러 메시지
6. **테스트 용이성**: 의존성 주입, 순수 함수, 모킹 가능성
7. **유지보수성**: 중복 코드, 관심사 분리, 확장성

## 출력 형식
- **요약**: 전체적인 코드 품질 평가 (1~2문장)
- **잘된 점**: 긍정적인 부분 (bullet list)
- **개선 필요**: 심각도별 분류 (Critical / Major / Minor)
  - 각 항목마다 문제 설명, 해당 코드 위치, 구체적인 개선 제안 포함
- **리팩토링 예시**: 가장 중요한 개선 사항 1~2개에 대한 수정 코드 예시`
                        }
                    }
                ]
            }
        }
    )

    server.registerTool(
        'greet',
        {
            description: '이름과 언어를 입력하면 인사말을 반환합니다.',
            inputSchema: z.object({
                name: z.string().describe('인사할 사람의 이름'),
                language: z
                    .enum(['ko', 'en'])
                    .optional()
                    .default('en')
                    .describe('인사 언어 (기본값: en)')
            }),
            outputSchema: z.object({
                content: z
                    .array(
                        z.object({
                            type: z.literal('text'),
                            text: z.string().describe('인사말')
                        })
                    )
                    .describe('인사말')
            })
        },
        async ({ name, language }) => {
            const greeting =
                language === 'ko'
                    ? `안녕하세요, ${name}님!`
                    : `Hey there, ${name}! 👋 Nice to meet you!`

            return {
                content: [{ type: 'text' as const, text: greeting }],
                structuredContent: {
                    content: [{ type: 'text' as const, text: greeting }]
                }
            }
        }
    )

    server.registerTool(
        'calculate',
        {
            description: '두 숫자와 연산자(+, -, *, /)를 입력받아 사칙연산 결과를 반환합니다.',
            inputSchema: z.object({
                operator: z
                    .enum(['+', '-', '*', '/'])
                    .describe('연산자 (+, -, *, /)'),
                a: z.number().describe('첫 번째 숫자'),
                b: z.number().describe('두 번째 숫자')
            }),
            outputSchema: z.object({
                content: z
                    .array(
                        z.object({
                            type: z.literal('text'),
                            text: z.string().describe('계산 결과')
                        })
                    )
                    .describe('계산 결과')
            })
        },
        async ({ operator, a, b }) => {
            let result: number

            if (operator === '+') result = a + b
            else if (operator === '-') result = a - b
            else if (operator === '*') result = a * b
            else {
                if (b === 0) {
                    const text = '0으로 나눌 수 없습니다.'
                    return {
                        content: [{ type: 'text' as const, text }],
                        structuredContent: { content: [{ type: 'text' as const, text }] }
                    }
                }
                result = a / b
            }

            const text = `${a} ${operator} ${b} = ${result}`
            return {
                content: [{ type: 'text' as const, text }],
                structuredContent: { content: [{ type: 'text' as const, text }] }
            }
        }
    )

    server.registerTool(
        'current_time',
        {
            description: 'timezone을 입력받아 해당 지역의 현재 시간을 반환합니다.',
            inputSchema: z.object({
                timezone: z
                    .string()
                    .optional()
                    .default('UTC')
                    .describe('IANA timezone 문자열 (예: Asia/Seoul, America/New_York, UTC)')
            }),
            outputSchema: z.object({
                content: z
                    .array(
                        z.object({
                            type: z.literal('text'),
                            text: z.string().describe('현재 시간')
                        })
                    )
                    .describe('현재 시간')
            })
        },
        async ({ timezone }) => {
            let text: string
            try {
                const now = new Date()
                const formatted = new Intl.DateTimeFormat('ko-KR', {
                    timeZone: timezone,
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                }).format(now)
                text = `${timezone} 현재 시간: ${formatted}`
            } catch {
                text = `올바르지 않은 timezone입니다: "${timezone}"`
            }

            return {
                content: [{ type: 'text' as const, text }],
                structuredContent: { content: [{ type: 'text' as const, text }] }
            }
        }
    )

    server.registerTool(
        'geocode_city',
        {
            description:
                '도시 이름으로 위도·경도 좌표를 조회합니다. 대한민국 주요 도시는 한글 이름(서울, 부산 등)으로 빠르게 조회할 수 있습니다.',
            inputSchema: z.object({
                city: z.string().describe('도시 이름 (예: Seoul, 서울, Busan, 부산)'),
                language: z
                    .enum(['ko', 'en'])
                    .optional()
                    .default('ko')
                    .describe('검색 결과 언어 (기본값: ko)')
            }),
            outputSchema: textOutputSchema
        },
        async ({ city, language }) => {
            const normalizedCity = city.trim()
            const preset = resolveKoreanCity(normalizedCity)

            if (preset) {
                const text = `${preset.displayNameKo}(${preset.englishName}, KR): 위도 ${preset.latitude}, 경도 ${preset.longitude}`
                return textResponse(text)
            }

            const englishName = resolveEnglishCityName(normalizedCity) ?? normalizedCity

            try {
                const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
                url.searchParams.set('name', englishName)
                url.searchParams.set('count', '1')
                url.searchParams.set('language', language)
                url.searchParams.set('format', 'json')
                if (resolveEnglishCityName(normalizedCity)) {
                    url.searchParams.set('countryCode', 'KR')
                }

                const response = await fetch(url)
                if (!response.ok) {
                    return textResponse(
                        `지오코딩 API 요청에 실패했습니다. (HTTP ${response.status})`
                    )
                }

                const data = (await response.json()) as {
                    results?: Array<{
                        name: string
                        country_code: string
                        latitude: number
                        longitude: number
                    }>
                }

                const result = data.results?.[0]
                if (!result) {
                    return textResponse(`"${city}"에 해당하는 도시를 찾을 수 없습니다.`)
                }

                const text = `${result.name}(${result.country_code}): 위도 ${result.latitude}, 경도 ${result.longitude}`
                return textResponse(text)
            } catch {
                return textResponse(
                    '지오코딩 중 오류가 발생했습니다. 네트워크 연결을 확인해 주세요.'
                )
            }
        }
    )

    server.registerTool(
        'get_weather',
        {
            description: '위도·경도 좌표로 현재 날씨 정보를 조회합니다.',
            inputSchema: z.object({
                latitude: z
                    .number()
                    .min(-90)
                    .max(90)
                    .describe('위도 (-90 ~ 90)'),
                longitude: z
                    .number()
                    .min(-180)
                    .max(180)
                    .describe('경도 (-180 ~ 180)')
            }),
            outputSchema: textOutputSchema
        },
        async ({ latitude, longitude }) => {
            try {
                const url = new URL('https://api.open-meteo.com/v1/forecast')
                url.searchParams.set('latitude', String(latitude))
                url.searchParams.set('longitude', String(longitude))
                url.searchParams.set(
                    'current',
                    'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m'
                )
                url.searchParams.set('timezone', 'auto')

                const response = await fetch(url)
                if (!response.ok) {
                    return textResponse(
                        `날씨 API 요청에 실패했습니다. (HTTP ${response.status})`
                    )
                }

                const data = (await response.json()) as {
                    current?: {
                        temperature_2m: number
                        relative_humidity_2m: number
                        weather_code: number
                        wind_speed_10m: number
                    }
                }

                const current = data.current
                if (!current) {
                    return textResponse('날씨 정보를 가져올 수 없습니다.')
                }

                const description = getWeatherDescription(current.weather_code)
                const text = `현재 날씨: ${description} / 기온 ${current.temperature_2m}°C / 습도 ${current.relative_humidity_2m}% / 풍속 ${current.wind_speed_10m} m/s`
                return textResponse(text)
            } catch {
                return textResponse(
                    '날씨 조회 중 오류가 발생했습니다. 네트워크 연결을 확인해 주세요.'
                )
            }
        }
    )

    server.registerTool(
        'generate_image',
        {
            description:
                'HuggingFace FLUX.1-schnell 모델로 텍스트 프롬프트 기반 이미지를 생성합니다.',
            inputSchema: z.object({
                prompt: z.string().describe('이미지 생성 프롬프트'),
                num_inference_steps: z
                    .number()
                    .int()
                    .min(1)
                    .max(10)
                    .optional()
                    .default(4)
                    .describe('추론 스텝 수 (1~10, 기본값: 4)')
            }),
            outputSchema: z.object({
                content: z.array(
                    z.discriminatedUnion('type', [
                        z.object({
                            type: z.literal('image'),
                            data: z.string(),
                            mimeType: z.string()
                        }),
                        z.object({
                            type: z.literal('text'),
                            text: z.string()
                        })
                    ])
                )
            })
        },
        async ({ prompt, num_inference_steps }, extra) => {
            const headers = extra.requestInfo?.headers ?? {}
            const token = resolveHfToken(headers)

            if (!token) {
                return textResponse(
                    'HF 토큰이 없습니다. 요청 시 x-hf-token 헤더를 포함하거나 HF_TOKEN 환경변수를 설정해 주세요.'
                )
            }

            try {
                const client = new InferenceClient(token)
                const image = await client.textToImage(
                    {
                        provider: 'together',
                        model: 'black-forest-labs/FLUX.1-schnell',
                        inputs: prompt,
                        parameters: { num_inference_steps }
                    },
                    { outputType: 'blob' }
                )

                const base64 = Buffer.from(await image.arrayBuffer()).toString('base64')
                const mimeType = image.type || 'image/png'
                const imageContent = {
                    type: 'image' as const,
                    data: base64,
                    mimeType
                }

                return {
                    content: [imageContent],
                    structuredContent: { content: [imageContent] }
                }
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : '알 수 없는 오류'
                return textResponse(`이미지 생성 실패: ${message}`)
            }
        }
    )
}
