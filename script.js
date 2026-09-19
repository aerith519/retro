const treeEl = document.getElementById("tree");

function iconFor(name) {
  const ext = name.split(".").pop().toLowerCase();
  if (["zip", "rar", "7z"].includes(ext)) return "🗜️";
  if (["exe", "msi"].includes(ext)) return "⚙️";
  if (["txt", "md"].includes(ext)) return "📄";
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "🖼️";
  return "📄";
}

function buildNode(node, isFolder) {
  const row = document.createElement("div");
  row.className = "row " + (isFolder ? "folder" : "file");

  const name = document.createElement("span");
  name.className = "name";
  name.textContent = (isFolder ? "📁 " : iconFor(node.name) + " ") + node.name;
  row.appendChild(name);

  const date = document.createElement("span");
  date.className = "date";
  date.textContent = node.date || "";
  row.appendChild(date);

  const size = document.createElement("span");
  size.className = "size";
  size.textContent = node.size || "";
  row.appendChild(size);

  return row;
}

function renderFolder(folderData, container) {
  const wrap = document.createElement("div");
  wrap.className = "node";

  const row = buildNode(folderData, true);
  const toggle = document.createElement("span");
  toggle.className = "toggle";
  toggle.textContent = "+";
  row.prepend(toggle);
  wrap.appendChild(row);

  const childrenEl = document.createElement("div");
  childrenEl.className = "children";
  wrap.appendChild(childrenEl);

  let built = false;
  row.addEventListener("click", () => {
    const open = childrenEl.classList.toggle("open");
    toggle.textContent = open ? "-" : "+";
    if (open && !built) {
      (folderData.folders || []).forEach(f => renderFolder(f, childrenEl));
      (folderData.files || []).forEach(f => renderFile(f, childrenEl));
      built = true;
    }
  });

  container.appendChild(wrap);
}

function renderFile(fileData, container) {
  const row = buildNode(fileData, false);
  const spacer = document.createElement("span");
  spacer.className = "toggle";
  row.prepend(spacer);
  row.addEventListener("click", () => {
    if (fileData.url) window.open(fileData.url, "_blank");
  });
  container.appendChild(row);
}

fetch("tree.json?_=" + Date.now())
  .then(r => r.json())
  .then(data => {
    (data.folders || []).forEach(f => renderFolder(f, treeEl));
    (data.files || []).forEach(f => renderFile(f, treeEl));
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
  fd.append("folder_id", folderIdInput.value || "0");

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
