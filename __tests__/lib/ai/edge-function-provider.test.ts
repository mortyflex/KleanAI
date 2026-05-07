import { EdgeFunctionAIProvider } from '../../../src/lib/ai/edge-function-provider';
import { __setImageEncoderForTests } from '../../../src/lib/ai/encode-image';
import { analyzeFridgeImages } from '../../../src/features/vision/services/fridge-vision.service';
import { clearAILogs, getAILogs } from '../../../src/lib/ai/logs';

type FetchArgs = Parameters<typeof fetch>;
type FetchImpl = (...args: FetchArgs) => Promise<Response>;

const FAKE_BASE_URL = 'https://klean.test.supabase.co';
const FAKE_ANON = 'test-anon-key';

function makeFetch(impl: FetchImpl): jest.Mock<Promise<Response>, FetchArgs> {
  return jest.fn(impl);
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  __setImageEncoderForTests(async (_uri, mimeType) => ({
    data: 'BASE64DATA',
    mimeType: mimeType ?? 'image/jpeg',
  }));
  clearAILogs();
});

afterEach(() => {
  __setImageEncoderForTests(null);
});

describe('EdgeFunctionAIProvider — direct calls', () => {
  it('posts base64 images to the analyze-fridge-images endpoint with auth headers', async () => {
    const fetchImpl = makeFetch(async () =>
      jsonResponse(200, {
        schemaVersion: '1',
        detected: [{ label: 'Eggs', confidence: 0.9 }],
      }),
    );
    const provider = new EdgeFunctionAIProvider({
      baseUrl: FAKE_BASE_URL,
      anonKey: FAKE_ANON,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const result = await provider.analyzeFridgeImages({
      images: [{ uri: 'file:///mock/a.jpg', mimeType: 'image/jpeg' }],
      promptVersion: 'fridge-vision/v1',
    });

    expect(result.schemaVersion).toBe('1');
    expect(result.detected).toHaveLength(1);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [calledUrl, init] = fetchImpl.mock.calls[0];
    expect(calledUrl).toBe(`${FAKE_BASE_URL}/functions/v1/analyze-fridge-images`);
    const initObj = init as RequestInit;
    expect(initObj.method).toBe('POST');
    expect((initObj.headers as Record<string, string>).apikey).toBe(FAKE_ANON);
    expect((initObj.headers as Record<string, string>).authorization).toBe(
      `Bearer ${FAKE_ANON}`,
    );
    const body = JSON.parse(initObj.body as string);
    expect(body.images).toEqual([{ data: 'BASE64DATA', mimeType: 'image/jpeg' }]);
  });

  it('throws when the edge function returns a non-2xx error JSON', async () => {
    const fetchImpl = makeFetch(async () =>
      jsonResponse(500, {
        error: 'missing_gemini_key',
        message: 'GEMINI_API_KEY is not set.',
      }),
    );
    const provider = new EdgeFunctionAIProvider({
      baseUrl: FAKE_BASE_URL,
      anonKey: FAKE_ANON,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(
      provider.analyzeFridgeImages({
        images: [{ uri: 'file:///mock/a.jpg' }],
        promptVersion: 'fridge-vision/v1',
      }),
    ).rejects.toThrow(/missing_gemini_key/);
  });

  it('throws on network failure', async () => {
    const fetchImpl = makeFetch(async () => {
      throw new Error('offline');
    });
    const provider = new EdgeFunctionAIProvider({
      baseUrl: FAKE_BASE_URL,
      anonKey: FAKE_ANON,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(
      provider.analyzeFridgeImages({
        images: [{ uri: 'file:///mock/a.jpg' }],
        promptVersion: 'fridge-vision/v1',
      }),
    ).rejects.toThrow(/edge-function unreachable/);
  });

  it('throws when the edge function returns non-JSON', async () => {
    const fetchImpl = makeFetch(async () =>
      new Response('<html>oops</html>', { status: 200 }),
    );
    const provider = new EdgeFunctionAIProvider({
      baseUrl: FAKE_BASE_URL,
      anonKey: FAKE_ANON,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(
      provider.analyzeFridgeImages({
        images: [{ uri: 'file:///mock/a.jpg' }],
        promptVersion: 'fridge-vision/v1',
      }),
    ).rejects.toThrow(/non-JSON/);
  });
});

describe('EdgeFunctionAIProvider — through fridge-vision service', () => {
  it('returns mapped detections on a valid Gemini response', async () => {
    const fetchImpl = makeFetch(async () =>
      jsonResponse(200, {
        schemaVersion: '1',
        detected: [
          { label: 'Chicken breast', confidence: 0.92 },
          { label: 'Eggs', confidence: 0.88 },
        ],
      }),
    );
    const provider = new EdgeFunctionAIProvider({
      baseUrl: FAKE_BASE_URL,
      anonKey: FAKE_ANON,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const result = await analyzeFridgeImages({
      images: [{ uri: 'file:///mock/a.jpg' }],
      provider,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.detected.map((d) => d.internalId).sort()).toEqual([
        'chicken_breast',
        'eggs',
      ]);
    }
    expect(getAILogs()).toHaveLength(1);
    expect(getAILogs()[0]).toMatchObject({
      providerId: 'gemini',
      succeeded: true,
    });
  });

  it('falls into invalid_schema when Gemini returns a malformed payload', async () => {
    const fetchImpl = makeFetch(async () =>
      jsonResponse(200, {
        schemaVersion: '1',
        detected: [{ label: 'Eggs', confidence: 42 }],
      }),
    );
    const provider = new EdgeFunctionAIProvider({
      baseUrl: FAKE_BASE_URL,
      anonKey: FAKE_ANON,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const result = await analyzeFridgeImages({
      images: [{ uri: 'file:///mock/a.jpg' }],
      provider,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid_schema');
  });

  it('falls into provider_error when the edge function returns 502', async () => {
    const fetchImpl = makeFetch(async () =>
      jsonResponse(502, {
        error: 'gemini_error',
        message: 'upstream timeout',
      }),
    );
    const provider = new EdgeFunctionAIProvider({
      baseUrl: FAKE_BASE_URL,
      anonKey: FAKE_ANON,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const result = await analyzeFridgeImages({
      images: [{ uri: 'file:///mock/a.jpg' }],
      provider,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('provider_error');
      expect(result.details).toMatch(/gemini_error/);
    }
  });
});
