import { http } from "./http";

export const uploadDocument = async (file: File) => {
  const form = new FormData();
  form.append("file", file);

  return http.post("/docs/admin/upload_docs", form, {
    headers: { "Content-Type": "multipart/form-data" }
  });
};
