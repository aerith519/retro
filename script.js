const treeEl = document.getElementById("tree");

function iconFor(name) {
  const ext = name.split(".").pop().toLowerCase();
  if (["zip", "rar", "7z"].includes(ext)) return "🗜️";
  if (["exe", "msi"].includes(ext)) return "⚙️";
  if (["txt", "md"].includes(ext)) return "📄";
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "🖼️";
  return "📄";
}

// ancestorFlags: array of booleans, one per ancestor level, true = that
// ancestor was the LAST item in its own list (so we draw blank space
// instead of a continuing "│" under it).
function prefixFor(ancestorFlags) {
  return ancestorFlags.map(isLast => (isLast ? "    " : "\u2502   ")).join("");
}

function renderList(folders, files, container, ancestorFlags) {
  const items = [
    ...folders.map(f => ({ ...f, __isFolder: true })),
    ...files.map(f => ({ ...f, __isFolder: false })),
  ];

  items.forEach((item, idx) => {
    const isLastItem = idx === items.length - 1;
    const branch = isLastItem ? "\u2514\u2500\u2500 " : "\u251c\u2500\u2500 "; // └── / ├──
    const prefix = prefixFor(ancestorFlags);

    if (item.__isFolder) {
      renderFolder(item, container, prefix, branch, ancestorFlags, isLastItem);
    } else {
      renderFile(item, container, prefix, branch);
    }
  });
}

function renderFolder(folderData, container, prefix, branch, ancestorFlags, isLastItem) {
  const wrap = document.createElement("div");

  const row = document.createElement("div");
  row.className = "row folder";

  const name = document.createElement("span");
  name.className = "name";
  const setLabel = (open) => {
    name.textContent = prefix + branch + (open ? "- " : "+ ") + "\uD83D\uDCC1 " + folderData.name;
  };
  setLabel(false);
  row.appendChild(name);

  const date = document.createElement("span");
  date.className = "date";
  date.textContent = folderData.date || "";
  row.appendChild(date);

  const size = document.createElement("span");
  size.className = "size";
  size.textContent = folderData.size || "";
  row.appendChild(size);

  wrap.appendChild(row);

  const childrenEl = document.createElement("div");
  childrenEl.className = "children";
  wrap.appendChild(childrenEl);

  let built = false;
  row.addEventListener("click", () => {
    const open = childrenEl.classList.toggle("open");
    setLabel(open);
    if (open && !built) {
      renderList(
        folderData.folders || [],
        folderData.files || [],
        childrenEl,
        [...ancestorFlags, isLastItem]
      );
      built = true;
    }
  });

  container.appendChild(wrap);
}

function renderFile(fileData, container, prefix, branch) {
  const row = document.createElement("div");
  row.className = "row file";

  const name = document.createElement("span");
  name.className = "name";
  name.textContent = prefix + branch + "  " + iconFor(fileData.name) + " " + fileData.name;
  row.appendChild(name);

  const date = document.createElement("span");
  date.className = "date";
  date.textContent = fileData.date || "";
  row.appendChild(date);

  const size = document.createElement("span");
  size.className = "size";
  size.textContent = fileData.size || "";
  row.appendChild(size);

  row.addEventListener("click", () => {
    if (fileData.url) window.open(fileData.url, "_blank");
  });

  container.appendChild(row);
}

fetch("tree.json?_=" + Date.now())
  .then(r => r.json())
  .then(data => {
    renderList(data.folders || [], data.files || [], treeEl, []);
  })
  .catch(() => {
    treeEl.textContent = "Could not load tree.json";
  });

// ---- password unlock ----
const unlockBtn = document.getElementById("unlockBtn");
const passModal = document.getElementById("passModal");
const passInput = document.getElementById("passInput");
const passSubmit = document.getElementById("passSubmit");
const passCancel = document.getElementById("passCancel");
const passError = document.getElementById("passError");
const uploadModal = document.getElementById("uploadModal");

let unlockedCode = null;

unlockBtn.addEventListener("click", () => {
  passError.classList.add("hidden");
  passInput.value = "";
  passModal.classList.remove("hidden");
  passInput.focus();
});
passCancel.addEventListener("click", () => passModal.classList.add("hidden"));

passSubmit.addEventListener("click", async () => {
  const code = passInput.value;
  try {
    const res = await fetch(window.BACKEND_URL + "/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: code })
    });
    const data = await res.json();
    if (data.ok) {
      unlockedCode = code;
      passModal.classList.add("hidden");
      uploadModal.classList.remove("hidden");
    } else {
      passError.classList.remove("hidden");
    }
  } catch (e) {
    passError.textContent = "Backend unreachable.";
    passError.classList.remove("hidden");
  }
});

// ---- upload ----
const uploadCancel = document.getElementById("uploadCancel");
const uploadSubmit = document.getElementById("uploadSubmit");
const fileInput = document.getElementById("fileInput");
const folderIdInput = document.getElementById("folderIdInput");
const uploadStatus = document.getElementById("uploadStatus");

uploadCancel.addEventListener("click", () => uploadModal.classList.add("hidden"));

uploadSubmit.addEventListener("click", async () => {
  if (!fileInput.files.length) {
    uploadStatus.textContent = "Choose a file first.";
    return;
  }
  uploadStatus.textContent = "Uploading...";
  const fd = new FormData();
  fd.append("password", unlockedCode);
  fd.append("file", fileInput.files[0]);
  fd.append("folder_id", folderIdInput.value || "");

  try {
    const res = await fetch(window.BACKEND_URL + "/upload", {
      method: "POST",
      body: fd
    });
    const data = await res.json();
    if (data.ok) {
      uploadStatus.textContent = "Uploaded! Tree will refresh shortly.";
    } else {
      uploadStatus.textContent = "Error: " + (data.error || "unknown");
    }
  } catch (e) {
    uploadStatus.textContent = "Upload failed: " + e.message;
  }
});
