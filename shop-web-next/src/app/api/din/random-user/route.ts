import { NextResponse } from "next/server";

/**
 * 调用 Python DIN 服务获取缓存用户列表，随机返回一个
 *
 * 优先命中缓存，避免实时推理延迟；如缓存用户不足则降级返回空。
 */
async function sampleCachedUserId(): Promise<{ userId: number; source: string }> {
  const dinBaseUrl = process.env.DIN_SERVICE_URL || "http://127.0.0.1:8000";
  const res = await fetch(
    `${dinBaseUrl}/api/recommend/users/sample?n=1000&onlyCached=true`,
    { cache: "no-store" },
  );

  if (!res.ok) {
    throw new Error(`DIN 服务返回错误: ${res.status}`);
  }

  const payload = (await res.json()) as {
    code?: number;
    msg?: string;
    data?: {
      userIds?: number[];
      modelVersion?: string;
      dataVersion?: string;
      year?: number;
      onlyCached?: boolean;
    };
  };

  const userIds = payload.data?.userIds || [];
  if (userIds.length === 0) {
    throw new Error("DIN 缓存用户池为空，请检查预计算缓存是否已生成");
  }

  const randomId = userIds[Math.floor(Math.random() * userIds.length)];
  return { userId: randomId, source: "din-cache" };
}

/**
 * GET /api/din/random-user
 *
 * 从 DIN 预计算缓存用户池中随机抽取一个用户 ID 返回给前端
 */
export async function GET() {
  try {
    const { userId, source } = await sampleCachedUserId();
    return NextResponse.json({
      code: 200,
      msg: "success",
      data: {
        userId,
        source,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "随机抽取缓存用户失败";
    console.error("[DIN Random User]", error);
    return NextResponse.json(
      { code: 500, msg: message, data: null },
      { status: 500 },
    );
  }
}
