/// <reference types="astro/client" />

// 이 프로젝트는 @types/node를 별도로 설치하지 않는다. Vercel Serverless
// Function(Node.js 런타임)에서 `process.env`로 환경변수를 읽는 코드
// (src/lib/env.ts)가 타입 체크되도록, 실제로 쓰는 형태만 최소한으로
// 직접 선언한다.
declare const process: {
  env: Record<string, string | undefined>;
};
