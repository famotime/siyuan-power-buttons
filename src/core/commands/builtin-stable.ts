type ApiResponse<T> = {
  code?: number;
  msg?: string;
  data?: T;
};

type NotebookSummary = {
  id: string;
  closed?: boolean;
};

type NotebookConfResponse = {
  conf?: {
    dailyNoteSavePath?: string;
  };
};

type FetchPost = (url: string, data: unknown) => Promise<ApiResponse<unknown>>;

function isOkResponse<T>(response: ApiResponse<T> | null | undefined): response is ApiResponse<T> & { code: 0 } {
  return response?.code === 0;
}

function escapeSqlString(value: string): string {
  return value.replaceAll("'", "''");
}

async function resolveDailyNotePath(fetchPost: FetchPost, notebookId: string): Promise<string | null> {
  const confResponse = await fetchPost("/api/notebook/getNotebookConf", {
    notebook: notebookId,
  }) as ApiResponse<NotebookConfResponse>;
  const template = isOkResponse(confResponse)
    ? confResponse.data?.conf?.dailyNoteSavePath?.trim()
    : "";
  if (!template) {
    return null;
  }

  const pathResponse = await fetchPost("/api/template/renderSprig", {
    template,
  }) as ApiResponse<string>;
  const path = isOkResponse(pathResponse) && typeof pathResponse.data === "string"
    ? pathResponse.data.trim()
    : "";

  return path || null;
}

async function findExistingDocId(fetchPost: FetchPost, notebookId: string, hpath: string): Promise<string | null> {
  const response = await fetchPost("/api/query/sql", {
    stmt: `SELECT id FROM blocks WHERE box = '${escapeSqlString(notebookId)}' AND hpath = '${escapeSqlString(hpath)}' AND type = 'd' LIMIT 1`,
  }) as ApiResponse<Array<{ id?: string }>>;
  const id = isOkResponse(response) ? response.data?.[0]?.id?.trim() : "";
  return id || null;
}

async function openDailyNoteByApi(options: {
  app: unknown;
  openTab: (options: { app: unknown; doc: { id: string } }) => void;
  fetchPost: FetchPost;
}): Promise<boolean> {
  const notebooksResponse = await options.fetchPost("/api/notebook/lsNotebooks", "") as ApiResponse<{ notebooks?: NotebookSummary[] }>;
  const notebooks = isOkResponse(notebooksResponse) && Array.isArray(notebooksResponse.data?.notebooks)
    ? notebooksResponse.data.notebooks
    : [];
  const notebook = notebooks.find(candidate => !candidate.closed) || notebooks[0];
  if (!notebook?.id) {
    return false;
  }

  const hpath = await resolveDailyNotePath(options.fetchPost, notebook.id);
  if (!hpath) {
    return false;
  }

  const existingDocId = await findExistingDocId(options.fetchPost, notebook.id, hpath);
  if (existingDocId) {
    options.openTab({
      app: options.app,
      doc: {
        id: existingDocId,
      },
    });
    return true;
  }

  const createResponse = await options.fetchPost("/api/filetree/createDocWithMd", {
    notebook: notebook.id,
    path: hpath,
    markdown: "",
  }) as ApiResponse<string>;
  const createdDocId = isOkResponse(createResponse) && typeof createResponse.data === "string"
    ? createResponse.data.trim()
    : "";
  if (!createdDocId) {
    return false;
  }

  options.openTab({
    app: options.app,
    doc: {
      id: createdDocId,
    },
  });
  return true;
}

export async function executeBuiltinCommandStable(commandId: string, options: {
  app?: unknown;
  openAppSetting?: (app: unknown) => void;
  openTab?: (options: { app: unknown; doc: { id: string } }) => void;
  fetchPost?: FetchPost;
  runBuiltinCommandByDom: (commandId: string) => boolean | Promise<boolean>;
}): Promise<boolean> {
  if (commandId === "config" && options.app && options.openAppSetting) {
    options.openAppSetting(options.app);
    return true;
  }

  if (await options.runBuiltinCommandByDom(commandId)) {
    return true;
  }

  if (commandId !== "dailyNote" || !options.app || !options.openTab || !options.fetchPost) {
    return false;
  }

  try {
    return await openDailyNoteByApi({
      app: options.app,
      openTab: options.openTab,
      fetchPost: options.fetchPost,
    });
  } catch {
    return false;
  }
}
