// Run by GitHub Actions. Reads UDROP_KEY1/UDROP_KEY2 from env, talks to udrop.com,
// writes tree.json. Keys never leave this process.
const BASE = "https://www.udrop.com/api/v2";
const KEY1 = process.env.UDROP_KEY1;
const KEY2 = process.env.UDROP_KEY2;

async function post(path, body) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body)
  });
  const data = await res.json();
  if (data._status !== "success") {
    throw new Error(path + " failed: " + JSON.stringify(data));
  }
  return data.data;
}

function formatSize(bytes) {
  if (!bytes) return "";
  const n = Number(bytes);
  if (n > 1e9) return (n / 1e9).toFixed(1) + "GB";
  if (n > 1e6) return (n / 1e6).toFixed(1) + "MB";
  if (n > 1e3) return (n / 1e3).toFixed(1) + "KB";
  return n + "B";
}

async function main() {
  if (!KEY1 || !KEY2) throw new Error("UDROP_KEY1 / UDROP_KEY2 not set");

  const auth = await post("/authorize", { key1: KEY1, key2: KEY2 });
  const token = auth.access_token;
  const accountId = auth.account_id;

  async function listFolder(parentFolderId) {
    const listing = await post("/folder/listing", {
      access_token: token,
      account_id: accountId,
      parent_folder_id: parentFolderId || ""
    });

    const folders = [];
    for (const f of listing.folders || []) {
      folders.push({
        name: f.folderName,
        date: (f.date_added || "").split(" ")[0],
        size: formatSize(f.totalSize),
        ...(await listFolder(f.id))
      });
    }

    const files = (listing.files || []).map(f => ({
      name: f.filename,
      date: "", // udrop's folder/listing does not return a per-file date
      size: formatSize(f.fileSize),
      url: f.url_file || (f.shortUrl ? "https://www.udrop.com/" + f.shortUrl : "")
    }));

    return { folders, files };
  }

  const tree = await listFolder(null);

  const fs = await import("node:fs");
  fs.writeFileSync("tree.json", JSON.stringify(tree, null, 2));
  console.log("tree.json written");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
