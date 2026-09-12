"use client";

import { useEffect, useState } from "react";

const KEY = "dm_thirdparty";

type Report = {
  origin: string;
  embedded: boolean;
  cookieWritten: boolean;
  cookieRead: string | null;
  storageWritten: boolean;
  storageRead: string | null;
  id: string;
  isNew: boolean;
  hasStorageAccess: string;
  partitioned: string;
  referrer: string;
  error?: string;
};

/** Behaves like an embedded tracker: tries to set and read its own state. */
function probe(): Report {
  const r: Report = {
    origin: location.origin,
    embedded: top !== self,
    cookieWritten: false,
    cookieRead: null,
    storageWritten: false,
    storageRead: null,
    id: "",
    isNew: false,
    hasStorageAccess: "unknown",
    partitioned: "unknown",
    referrer: document.referrer || "(none)",
  };

  let existing: string | null = null;
  try {
    existing =
      document.cookie.split("; ").find((c) => c.startsWith(`${KEY}=`))?.split("=")[1] ?? null;
    r.cookieRead = existing;
  } catch {
    /* cookies fully blocked */
  }
  try {
    const ls = localStorage.getItem(KEY);
    r.storageRead = ls;
    existing = existing ?? ls;
  } catch (e) {
    r.error = (e as Error).message;
  }

  r.isNew = !existing;
  r.id = existing ?? `tp-${Math.random().toString(36).slice(2, 10)}`;

  try {
    document.cookie = `${KEY}=${r.id}; path=/; max-age=31536000; SameSite=None; Secure`;
    r.cookieWritten = document.cookie.includes(`${KEY}=`);
  } catch {
    r.cookieWritten = false;
  }
  try {
    localStorage.setItem(KEY, r.id);
    r.storageWritten = localStorage.getItem(KEY) === r.id;
  } catch {
    r.storageWritten = false;
  }

  r.partitioned =
    "hasStorageAccess" in document
      ? "browser supports partitioned storage"
      : "no Storage Access API";
  return r;
}

export function EmbedClient() {
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    const r = probe();
    const doc = document as Document & { hasStorageAccess?: () => Promise<boolean> };
    (async () => {
      try {
        r.hasStorageAccess = doc.hasStorageAccess ? String(await doc.hasStorageAccess()) : "unsupported";
      } catch {
        r.hasStorageAccess = "not available";
      }
      setReport(r);
      parent.postMessage({ type: "dm-thirdparty", report: r }, "*");
    })();
  }, []);

  return (
    <div style={{ font: "12.5px ui-monospace, monospace", padding: 8, color: "#16161a" }}>
      {report ? (
        <>
          third-party context · origin {report.origin} · id {report.id}{" "}
          {report.isNew ? "(new here)" : "(recognized)"}
        </>
      ) : (
        "…"
      )}
    </div>
  );
}
