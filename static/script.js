const gallery = document.getElementById("gallery");
let currentIndex = 0;
let scrollTimeout;
let isLoading = false;
let currentFolder = "";
let mode = "";

function openViewer(index) {
  const all = [...gallery.querySelectorAll(".gallery-img")];
  const viewer = document.getElementById("viewer");

  currentIndex = index;

  viewer.style.display = "flex";
  viewer.style.opacity = "1";
  updateViewer();
  document.body.style.overflow = "hidden"; // disable background scroll
}
function updateButtons() {
  const all = [...gallery.querySelectorAll(".gallery-img")];

  document.getElementById("prev").disabled = currentIndex === 0;
  document.getElementById("next").disabled = currentIndex === all.length - 1;
}

function cleanPath(url) {
  return url.replace(/^\/(video|images)\//, "");
}

function updateViewer() {
  const viewer = document.getElementById("viewer");
  const viewerContent = viewer.querySelector(".viewer-content");
  const viewerImg = document.getElementById("viewer-img");
  const downloadBtn = document.getElementById("download-btn");
  const image_name = document.getElementById("img-name-overlay");

  const all = [...gallery.querySelectorAll(".gallery-img")];
  const item = all[currentIndex];

    if (!item) return;

  // 🧹 Remove old video if exists
  const oldVideo = viewerContent.querySelector("video");
  if (oldVideo) {
    oldVideo.pause();
    oldVideo.remove();
  }

  let fileUrl = "";
  let fileName = item.dataset.name || "download";

//  image_name.textContent = fileName;

  // 🎥 If video
  if (item.tagName === "VIDEO") {
    viewerImg.style.display = "none";

    fileUrl = item.dataset.src;

    const video = document.createElement("video");
    video.src = item.dataset.src || item.src;
    video.controls = true;
    video.autoplay = true;
    video.muted = false;

    video.style.maxWidth = "90vw";
    video.style.maxHeight = "90vh";

    // 👉 insert between prev and next buttons
    const nextBtn = document.getElementById("next");
    viewerContent.insertBefore(video, nextBtn);

  } else {
    // 📷 Image
    viewerImg.style.display = "block";
    fileUrl = item.dataset.full || item.src;
    viewerImg.src = fileUrl;
  }

    image_name.querySelector(".name").textContent = fileName;
    image_name.querySelector(".path").textContent = cleanPath(fileUrl);
    image_name.querySelector(".date").textContent = "";


  // 👁️ Show viewer
  viewer.style.display = "flex";
  viewer.style.opacity = "1";

//  downloadBtn.href = fileUrl;
//  downloadBtn.download = fileName;
  downloadBtn.onclick = function () {
  window.pywebview.api.download_file(fileUrl, fileName);
};

  updateButtons();
}



function closeViewer() {
  const viewer = document.getElementById("viewer");

  const video = viewer.querySelector("video");
  if (video) {
    video.pause();
    video.currentTime = 0;
    video.remove(); // ✅ just remove video, not whole HTML
  }

  viewer.style.opacity = "0";
  document.body.style.overflow = "auto";

  setTimeout(() => {
    viewer.style.display = "none";
  }, 200);
}

function showPreview(e, src) {
  const popup = document.getElementById("popup");
  const img = document.getElementById("popup-img");
  const caption = document.getElementById("popup-caption");

  const parts = src.split(/[\\/]/).filter(Boolean);

  caption.textContent = parts.pop();
  img.src = src;
  popup.style.display = "block";
}

function movePreview(e) {
  const popup = document.getElementById("popup");

  const popupWidth = popup.offsetWidth || 300;
  const popupHeight = popup.offsetHeight || 300;

  let x = e.clientX + 15; // default: right side
  let y = e.clientY + 15;

  // 👉 If going outside right edge → move to left
  if (x + popupWidth > window.innerWidth) {
    x = e.clientX - popupWidth - 15;
  }

  // 👉 If going outside bottom → move up
  if (y + popupHeight > window.innerHeight) {
    y = e.clientY - popupHeight - 15;
  }

  // 👉 Extra: prevent going off left/top
  if (x < 0) x = 10;
  if (y < 0) y = 10;

  popup.style.left = x + "px";
  popup.style.top = y + "px";
}

function hidePreview() {
  document.getElementById("popup").style.display = "none";
}

gallery.addEventListener("mouseover", (e) => {
  const media = e.target.closest(".gallery-img");
  if (!media) return;

  const src = media.dataset.full || media.poster;
  if (!src) return;

  showPreview(e, src);
});

gallery.addEventListener("mousemove", (e) => {
  const img = e.target.closest("img[data-full]");
  if (!img) return;

  movePreview(e);
});

gallery.addEventListener("mouseout", (e) => {
  hidePreview();
});

function move(direction) {
  const all = [...gallery.querySelectorAll(".gallery-img")];

  if (direction === "next" && currentIndex < all.length - 1) {
    currentIndex++;
  }

  if (direction === "prev" && currentIndex > 0) {
    currentIndex--;
  }

  updateViewer();
}

document.addEventListener("keydown", (e) => {
  const viewer = document.getElementById("viewer");

  // only work when viewer is open
  if (viewer.style.display !== "flex") return;

  if (e.key === "ArrowRight") move("next");
  if (e.key === "ArrowLeft") move("prev");
  if (e.key === "Escape") closeViewer();
});
// Viewer controls
document.getElementById("close").onclick = closeViewer;
document.getElementById("next").onclick = () => move("next");
document.getElementById("prev").onclick = () => move("prev");

gallery.addEventListener("click", (e) => {
  const media = e.target.closest(".gallery-img");
  if (!media) return;

  const all = [...gallery.querySelectorAll(".gallery-img")];
  const index = all.indexOf(media);

  openViewer(index);
});

function openFolder(path) {
   currentFolder = path || "";
  offset = 0;
  hasMore = true;

  document.getElementById("currentPath").textContent =
    currentFolder ? "/" + currentFolder : "/";

  gallery.innerHTML = "";   // ✅ IMPORTANT
  loadImages();
}

document.getElementById("backBtn").onclick = () => {
   offset = 0;
   hasMore = true;
   gallery.innerHTML = "";

   if (currentFolder === "") {
    loadImages( ); // optional: reload root
    return;
  }

  const parts = currentFolder.split(/[\\/]/).filter(Boolean);
  parts.pop();

  currentFolder = parts.join("/");

  // update UI
  document.getElementById("currentPath").textContent =
    currentFolder ? "/" + currentFolder : "/";

  loadImages( );
};

const videoObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const video = entry.target;

      if (video.dataset.src) {
        video.src = video.dataset.src;
        video.load();

        videoObserver.unobserve(video);
      }
    }
  });
}, {
  rootMargin: "200px"
});

function loadImages() {
  if (isLoading || !hasMore) return;

  isLoading = true;

  const overlay = document.getElementById("loading-overlay");

  overlay.style.display = "flex";

  fetch(`/api/images?folder=${currentFolder}&offset=${offset}&mode=${mode}`)
    .then(res => res.json())
    .then(data => {

      data.images.forEach(img => {
      if (img['type'] === 'folder') {

    const folderDiv = document.createElement("div");
    folderDiv.classList.add("folder");

    folderDiv.onclick = () => openFolder(img['path']);

    const iconDiv = document.createElement("div");
    iconDiv.classList.add("folder-icon");
    iconDiv.textContent = "📁";

    const nameDiv = document.createElement("div");
    nameDiv.classList.add("folder-name");
    nameDiv.textContent = img['name'];

    folderDiv.appendChild(iconDiv);
    folderDiv.appendChild(nameDiv);

    gallery.appendChild(folderDiv);

  }
   else if (img['path'].toLowerCase().endsWith(".mp4")) {

          const video = document.createElement("video");

          video.classList.add("gallery-img");

          // lazy loading via data-src (important)
          video.dataset.src = `/video/${img['path']}`;

          // thumbnail (poster image)
          video.poster = `/thumb/${img['path']}`;  // ensure this exists

          video.dataset.name = img['name'];
          video.preload = "none";
          video.muted = true;

          gallery.appendChild(video);

          // observe for lazy loading
          videoObserver.observe(video);

        } else {

        const image = document.createElement("img");

        image.classList.add("gallery-img");
        image.src = `/thumb/${img['path']}`;
        image.dataset.full = `/images/${img['path']}`;
        image.dataset.name = img['name'];

        gallery.appendChild(image);
      }

    });
     if (data.images.length === 0) {
        hasMore = false;
      }
      offset = data.next_offset;
      }).finally(() => {
      isLoading = false;
      overlay.style.display = "none";
    });
}

window.addEventListener("scroll", () => {
  clearTimeout(scrollTimeout);

  scrollTimeout = setTimeout(() => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200) {
      loadImages();
    }
  }, 200); // delay
});

function applySort(type) {
  console.log("Selected sort:", type);

  currentFolder = "";
  offset = 0;
  hasMore = true;

  document.getElementById("currentPath").textContent =
    "/";

  gallery.innerHTML = "";   // ✅ IMPORTANT

  if (!type) {
    // reset view (default)
    mode = "";
    loadImages();
    return;
  }

  mode = type;
  loadImages( );
}

document.querySelectorAll(".sort-btn").forEach(btn => {
  btn.addEventListener("click", () => {

    // toggle instead of forcing active
    const isActive = btn.classList.contains("active");

    // remove all active first
    document.querySelectorAll(".sort-btn").forEach(b => b.classList.remove("active"));

    if (!isActive) {
      btn.classList.add("active");
      applySort(btn.dataset.sort);

    } else {
      // nothing selected
      applySort(null); // or default behavior
    }

  });
});

const modal = document.getElementById("folder-modal");
const openBtn = document.getElementById("change-folder-btn");
const closeBtn = document.getElementById("close-modal");
const setBtn = document.getElementById("set-folder-btn");

openBtn.onclick = () => modal.style.display = "flex";
closeBtn.onclick = () => modal.style.display = "none";

setBtn.onclick = () => {
  const path = document.getElementById("folder-path-input").value.trim();

  if (!path) return;

  fetch("/set-base-folder", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ path })
  })
  .then(() => {
    modal.style.display = "none";

     document.querySelectorAll(".sort-btn").forEach(btn => {
      btn.classList.remove("active");
    });

    // reset UI
    document.getElementById("currentPath").textContent = "/";

    currentFolder = "";
    offset = 0;
    hasMore = true;
    mode = "";
    gallery.innerHTML = "";   // ✅ IMPORTANT

    // reload gallery
    loadImages();
  });
};

openBtn.onclick = () => {
  modal.style.display = "flex";

  document.getElementById("folder-path-input").value = "";

  fetch("/get-base-folder")
    .then(res => res.json())
    .then(data => {
      const path = data.path || "Not set";

      document.getElementById("current-base-info").textContent =
        "Current: " + path;

    });
};