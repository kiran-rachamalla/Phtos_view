const gallery = document.getElementById("gallery");
//const images = [];
let currentIndex = 0;
let scrollTimeout;
let isLoading = false;
let currentFolder = "";

//function collectImages() {
//  images.length = 0;
//
//  gallery.querySelectorAll(".gallery-img").forEach((img) => {
//    images.push(img.dataset.name);
//  });
//}

function openViewer(index) {
  const all = [...gallery.querySelectorAll(".gallery-img")];

//  collectImages();
  currentIndex = index;

//  const item = all[index];

  const viewer = document.getElementById("viewer");

  viewer.style.display = "flex";
  viewer.style.opacity = "1";
  updateViewer();
  document.body.style.overflow = "hidden"; // disable background scroll
//  const viewerContent = document.querySelector(".viewer-content");
//  const viewerImg = document.getElementById("viewer-img");
//
//// remove existing video if any
//    const oldVideo = viewerContent.querySelector("video");
//    if (oldVideo) oldVideo.remove();
//
//if (item.tagName === "VIDEO") {
//  viewerImg.style.display = "none";
//
//  const video = document.createElement("video");
//  video.src = item.dataset.src || item.src;
//  video.controls = true;
//  video.autoplay = true;
//
//  viewerContent.insertBefore(video, document.getElementById("next"));
//
//} else {
//  viewerImg.style.display = "block";
//  viewerImg.src = item.dataset.full || item.src;
//}

//
//  // 🎥 Video
//  if (item.tagName === "VIDEO") {
//    const video = document.createElement("video");
//
//    video.src = item.dataset.src || item.src;
//    video.controls = true;
//    video.autoplay = true;
//
//    viewer.appendChild(video);
//
//  } else {
//    // 📷 Image
//    const viewerImg = document.getElementById("viewer-img");
//    viewerImg.src = item.dataset.full || item.src;
//  }
//
//  viewer.style.display = "flex";
//  viewer.style.opacity = "1";
}
//function updateViewer() {
////  document.getElementById("viewer-img").src =
////    `/images/${images[currentIndex]}`;
//  const currentImage = images[currentIndex];
//  const fullPath = `/images/${currentImage}`;
//
//  document.getElementById("viewer-img").src = fullPath;
//
//  // ✅ Update download link
//  const downloadBtn = document.getElementById("download-btn");
//  downloadBtn.href = fullPath;
//  downloadBtn.download = currentImage;
//}
function updateButtons() {
  const all = [...gallery.querySelectorAll(".gallery-img")];

  document.getElementById("prev").disabled = currentIndex === 0;
  document.getElementById("next").disabled = currentIndex === all.length - 1;
}
function updateViewer() {
  const viewer = document.getElementById("viewer");
  const viewerContent = viewer.querySelector(".viewer-content");
  const viewerImg = document.getElementById("viewer-img");
  const downloadBtn = document.getElementById("download-btn");

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

  // 👁️ Show viewer
  viewer.style.display = "flex";
  viewer.style.opacity = "1";

  downloadBtn.href = fileUrl;
  downloadBtn.download = fileName;

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
  const img = e.target.closest("img[data-full]");
  if (!img) return;

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

// Keyboard support
//document.addEventListener("keydown", (e) => {
//  const viewer = document.getElementById("viewer");
////  if (viewer.style.display !== "flex") return;
//  if (!viewer || viewer.style.display === "none" || viewer.innerHTML === "") return;
//
//  if (e.key === "ArrowRight") {
//     next_or_prev();
////    currentIndex = (currentIndex + 1) % images.length;
////    updateViewer();
//  }
//
//  if (e.key === "ArrowLeft") {
//    next_or_prev(true);
////    currentIndex = (currentIndex - 1 + images.length) % images.length;
////    updateViewer();
//  }
//
//  if (e.key === "Escape") {
//    closeViewer();
//  }
//});

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

//document.getElementById("close").onclick = closeViewer;
//
//document.getElementById("next").onclick = () => {
//next_or_prev();
////  const all = [...gallery.querySelectorAll(".gallery-img")];
////
////  if (currentIndex < all.length - 1) {
////    currentIndex++;
////    updateViewer();
////  }
//
////  currentIndex = (currentIndex + 1) % all.length;
////  updateViewer();
//};
//
//document.getElementById("prev").onclick = () => {
//next_or_prev(true);
////  const all = [...gallery.querySelectorAll(".gallery-img")];
////if (currentIndex > 0) {
////    currentIndex--;
////    updateViewer();
////  }
////  currentIndex = (currentIndex - 1 + all.length) % all.length;
////  updateViewer();
//};

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

//function goBack(path) {
//  if (!path) {
//    window.location.href = "/";
//    return;
//  }
//
//  const parts = path.split("/");
//  parts.pop();  // remove current folder
//
//  const parent = parts.join("/");
//
//  if (parent) {
//    window.location.href = `/folder/${parent}`;
//  } else {
//    window.location.href = "/";
//  }
//}


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

  fetch(`/api/images?folder=${currentFolder}&offset=${offset}`)
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


/* =========================
   ✅ GLOBAL EVENTS (ONE PLACE)
========================= */

// Hover preview
//gallery.addEventListener("mouseover", (e) => {
//  const img = e.target.closest(".gallery-img");
//  if (!img) return;
//
//  showPreview(e, img.dataset.full);
//});
//
//gallery.addEventListener("mousemove", (e) => {
//  const img = e.target.closest(".gallery-img");
//  if (!img) return;
//
//  movePreview(e);
//});
//
//gallery.addEventListener("mouseout", (e) => {
//  const img = e.target.closest(".gallery-img");
//  if (!img) return;
//
//  hidePreview();
//});

// Click → open modal
//gallery.addEventListener("click", (e) => {
//  const img = e.target.closest(".gallery-img");
//  if (!img) return;
//
//  const all = [...gallery.querySelectorAll(".gallery-img")];
//  const index = all.indexOf(img);
//
//  openViewer(index);
//});
//function closeViewer() {
//  document.getElementById("viewer").style.display = "none";
//}
//function openViewer(index) {
//  collectImages();
//  currentIndex = index;
//
//  document.getElementById("viewer").style.display = "flex";
//  updateViewer();
//}


//function closeViewer() {
//  const viewer = document.getElementById("viewer");
//
//  // 🎥 Pause and reset any video inside viewer
//  const video = viewer.querySelector("video");
//  if (video) {
//    video.pause();
//    video.currentTime = 0;   // reset to start
//    video.src = "";          // release memory (important)
//  }
//
//  // 🧹 Optional: clear content (recommended)
//viewer.innerHTML = "";
//viewer.style.opacity = "0";
//
//  setTimeout(() => {
//    viewer.style.display = "none";
//    viewer.innerHTML = "";   // clean content after fade
//  }, 200);
//}
