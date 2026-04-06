type KernelResponse = {
  code: number;
  data: unknown;
};

export type KernelFetcher = (url: string, data: unknown) => Promise<KernelResponse>;

export async function getAppVersion(fetcher: KernelFetcher): Promise<string | null> {
  const response = await fetcher("/api/system/version", "");
  return response.code === 0 ? response.data as string : null;
}
