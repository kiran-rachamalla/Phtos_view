from tkinter import filedialog

import webview as wb
import os
import sys
from PIL import Image
from io import BytesIO
import subprocess
import re

from flask import Flask, render_template, request, send_from_directory, jsonify, send_file

def get_base_path():
    if hasattr(sys, '_MEIPASS'):
        return sys._MEIPASS   # when running as .exe
    return os.path.abspath(".")  # when running normally

BASE_PATH = get_base_path()

# PHOTO_FOLDER = r'C:\Users\racha\OneDrive\Desktop\Googlephotos'
PHOTO_FOLDER = os.path.join(BASE_PATH, "Default_Image_folder")
# PHOTO_FOLDER = ''
BATCH_SIZE = 80
THUMB_SIZE = (300, 300)
THUMB_FOLDER = os.path.join(
    os.path.expanduser("~"),
    "AppData",
    "Local",
    "MyPhotoViewer",
    "thumb_cache"
)
CACHE = {}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".heic", ".mp4"}


app = Flask(__name__, template_folder=os.path.join(BASE_PATH, "templates"),
                      static_folder=os.path.join(BASE_PATH, "static"))

# @app.route('/', methods=['GET', 'POST'])
# def fetch_ex():
#     images = get_images()[:BATCH_SIZE]
#     return render_template('main.html',
#                            The_title = 'Photo Gallery', images=images)

@app.route('/')
@app.route('/folder/<path:subpath>')
def gallery(subpath=""):
    items = get_files_and_folders(subpath)
    return render_template("main.html", The_title = 'Photo Gallery',items=items[:BATCH_SIZE], current_path=subpath)

@app.route('/api/images')
def api_images():
    folder = request.args.get("folder", "")
    offset = int(request.args.get("offset", 0))
    mode = request.args.get("mode", "")
    if mode == "":
        items = get_files_and_folders(folder)
    else:
        items = get_files_and_folders_by_time(folder,mode);

    slice = items[offset:offset+BATCH_SIZE]

    return {
        "images": slice,
        "next_offset": offset + len(slice)
    }

@app.route("/set-base-folder", methods=["POST"])
def set_base_folder():
    global PHOTO_FOLDER

    data = request.json
    path = data.get("path")

    if not os.path.isdir(path):
        return {"error": "Invalid path"}, 400

    PHOTO_FOLDER = path

    # clear cache (important)
    CACHE.clear()

    return {"status": "ok"}

def get_files_and_folders(subpath):
    base_path = os.path.join(PHOTO_FOLDER, subpath)

    folders = []
    images = []

    for name in os.listdir(base_path):
        full_path = os.path.join(base_path, name)

        if os.path.isdir(full_path):
            folders.append({
                "type": "folder",
                "name": name,
                "path": os.path.join(subpath, name)
            })
        else:
            images.append({
                "type": "image",
                "name": name,
                "path": os.path.join(subpath, name)
            })

    # sort individually (optional but recommended)
    folders.sort(key=lambda x: x["name"].lower())
    images.sort(key=lambda x: x["name"].lower())

    return folders + images

def get_images():
    all_files = os.listdir(PHOTO_FOLDER)
    images = [f for f in all_files if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.mp4'))]
    images.sort()
    return images

@app.route('/load_more')
def load_more():
    offset = int(request.args.get('offset', 0))
    images = get_images()
    next_images = images[offset:offset + BATCH_SIZE]
    return jsonify(next_images)

@app.route('/photo/<filename>')
def photo(filename):
    response = send_from_directory(PHOTO_FOLDER, filename)
    response.headers['Cache-Control'] = 'public, max-age=86400'
    return response

@app.route('/images/<path:filename>')
def images(filename):
    response = send_from_directory(PHOTO_FOLDER, filename)
    response.headers['Cache-Control'] = 'public, max-age=86400'
    return response

@app.route('/video/<path:filename>')
def video(filename):
    response = send_from_directory(PHOTO_FOLDER, filename)
    response.headers['Cache-Control'] = 'public, max-age=86400'
    return response

@app.route('/thumb/<path:filename>')
def thumbnail(filename):
    path = os.path.join(PHOTO_FOLDER, filename)

    if filename.lower().endswith(".mp4"):
        thumb_name = filename + ".jpg"
        thumb_path = os.path.join(THUMB_FOLDER, thumb_name)

        # generate only if not exists
        if not os.path.exists(thumb_path):
            generate_thumbnail(path, thumb_path)
        path = thumb_path
        # response = send_file(thumb_path, mimetype="image/jpeg")
        # response.headers['Cache-Control'] = 'public, max-age=86400'
        # return response

    img = Image.open(path)

    # Create thumbnail
    img.thumbnail(THUMB_SIZE, Image.LANCZOS)

    # Detect format
    format = (img.format or "JPEG").upper()  # 'JPEG', 'PNG', etc.

    buf = BytesIO()

    # Handle PNG transparency properly
    if format == "PNG":
        img.save(buf, format="PNG")
        mimetype = "image/png"
    else:
        # Convert to RGB for JPEG (avoids errors with RGBA)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")

        img.save(buf, format="JPEG", quality=85)
        mimetype = "image/jpeg"

    buf.seek(0)

    response = send_file(buf, mimetype=mimetype)
    response.headers['Cache-Control'] = 'public, max-age=86400'
    return response

def generate_all_thumbnails():
    for file in os.listdir(PHOTO_FOLDER):
        if file.lower().endswith(".mp4"):
            video_path = os.path.join(PHOTO_FOLDER, file)
            thumb_path = os.path.join(THUMB_FOLDER, file + ".jpg")

            generate_thumbnail(video_path, thumb_path)

def generate_thumbnail(video_path, thumb_path):
     os.makedirs(os.path.dirname(thumb_path), exist_ok=True)

     BASE_DIR = os.path.dirname(os.path.abspath(__file__))

     FFMPEG_PATH = os.path.join(BASE_PATH, "ffmpeg", "ffmpeg.exe")

     cmd = [
                FFMPEG_PATH,
                "-i", video_path,
                "-ss", "00:00:01",
                "-vframes", "1",
                "-q:v", "5",
                thumb_path
            ]

     subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                    creationflags=subprocess.CREATE_NO_WINDOW);

def extract_date(name):
    match = re.search(r'^IMG_(\d{4})(\d{2})(\d{2})', name, re.IGNORECASE)
    if match:
        return match.groups()
    return None, None, None

def is_valid_media(name):
    _, ext = os.path.splitext(name)
    return ext.lower() in ALLOWED_EXTENSIONS

def scan_and_group(root_folder, mode="year"):
    result = {}

    for root, dirs, files in os.walk(root_folder):
        for name in files:

            if not is_valid_media(name):
                continue

            full_path = os.path.join(root, name)
            rel_path = os.path.relpath(full_path, root_folder)

            year, month, day = extract_date(name)

            # ---------- NON-MATCH → OTHERS ----------
            if not year:
                if "Others" not in result:
                    result["Others"] = {
                        "type": "folder",
                        "name": "Others",
                        "children": []
                    }

                result["Others"]["children"].append({
                    "type": "image",
                    "name": name,
                    "path": rel_path
                })
                continue

            # ---------- YEAR MODE ----------
            if mode == "year":
                if year not in result:
                    result[year] = {
                        "type": "folder",
                        "name": year,
                        "children": []
                    }

                result[year]["children"].append({
                    "type": "image",
                    "name": name,
                    "path": rel_path
                })

            # ---------- MONTH MODE ----------
            elif mode == "month":
                if year not in result:
                    result[year] = {
                        "type": "folder",
                        "name": year,
                        "children": {}
                    }

                if month not in result[year]["children"]:
                    result[year]["children"][month] = {
                        "type": "folder",
                        "name": month,
                        "children": []
                    }

                result[year]["children"][month]["children"].append({
                    "type": "image",
                    "name": name,
                    "path": rel_path
                })

    # ---------- CONVERT TO LIST ----------
    output = []

    for key, data in result.items():
        if key == "Others":
            output.append(data)
            continue

        if mode == "year":
            output.append(data)

        elif mode == "month":
            data["children"] = list(data["children"].values())
            output.append(data)

    return output

# def scan_and_group(root_folder, mode="year"):
#     result = {}
#
#     for root, dirs, files in os.walk(root_folder):
#         for name in files:
#             full_path = os.path.join(root, name)
#
#             year, month, day = extract_date(name)
#             if not year:
#                 continue  # skip non-matching files
#
#             rel_path = os.path.relpath(full_path, root_folder)
#
#             # -------- YEAR MODE --------
#             if mode == "year":
#                 if year not in result:
#                     result[year] = {
#                         "type": "folder",
#                         "name": year,
#                         "children": []
#                     }
#
#                 result[year]["children"].append({
#                     "type": "image",
#                     "name": name,
#                     "path": rel_path
#                 })
#
#             # -------- MONTH MODE --------
#             elif mode == "month":
#                 if year not in result:
#                     result[year] = {
#                         "type": "folder",
#                         "name": year,
#                         "children": {}
#                     }
#
#                 if month not in result[year]["children"]:
#                     result[year]["children"][month] = {
#                         "type": "folder",
#                         "name": month,
#                         "children": []
#                     }
#
#                 result[year]["children"][month]["children"].append({
#                     "type": "image",
#                     "name": name,
#                     "path": rel_path
#                 })
#
#     # -------- Convert dict → list --------
#     output = []
#
#     for year_data in result.values():
#         if mode == "year":
#             output.append(year_data)
#
#         elif mode == "month":
#             months = list(year_data["children"].values())
#             year_data["children"] = months
#             output.append(year_data)
#
#     return output

# app.run(debug=True)

def find_node(data, name):
    return next((x for x in data if x["name"] == name), None)

def get_month_name(month):
    months = ["Jan","Feb","Mar","Apr","May","Jun",
              "Jul","Aug","Sep","Oct","Nov","Dec"]
    try:
        return months[int(month) - 1]
    except (ValueError, IndexError):
        return month

def clear_cache():
    CACHE.clear()

def get_files(mode):
    if mode in CACHE:
        return CACHE[mode]

    data = scan_and_group(PHOTO_FOLDER, mode=mode)

    CACHE[mode] = data  # store in cache
    return data

def get_files_and_folders_by_time(folder,mode):
    items = [];
    files_temp = get_files(mode)
    if folder == "":
        for data in files_temp:
            items.append({
                "type": data["type"],
                "name": data["name"],
                "path": data["name"],
                # "sort_key": int(data["name"])
            })

    # -------- DYNAMIC TRAVERSAL --------
    else:
        parts = folder.split("/")  # ["2024"] or ["2024","11"]

        current = files_temp

        for part in parts:
            node = find_node(current, part)
            if not node:
                current = []
                break
            current = node.get("children", [])

        # -------- FINAL LEVEL --------
        if mode == "year":
            # directly return children (your original logic)
            items = current

        elif mode == "month":
            if len(parts) == 1 and folder != 'Others' :
                # show months → build paths
                for m in current:
                    month_num = m["name"]
                    month_label = get_month_name(month_num)

                    items.append({
                        "type": m["type"],
                        "name": month_label,  # 👈 show "Nov"
                        "path": f"{parts[0]}/{month_num}",  # 👈 keep original for backend
                        "sort_key": int(month_num) if str(month_num).isdigit() else 1
                    })
            else:
                # already at month → return images
                items = current

    items.sort(key=lambda x: x.get("sort_key", x["name"]))
    # items.sort(key=lambda x: x["sort_key"])
    return items

@app.route("/get-base-folder", methods=["GET"])
def get_base_folder():
    global PHOTO_FOLDER
    return {"path": PHOTO_FOLDER}

class Api:
    def download_file(self, file_path, file_name):
        # relative_path = file_path.replace("/images/", "")
        fileUrl = file_path.lstrip("/")

        if fileUrl.startswith("images/"):
            relative_path = fileUrl.replace("images/", "", 1)
        elif fileUrl.startswith("video/"):
            relative_path = fileUrl.replace("video/", "", 1)
        else:
            relative_path = fileUrl
        # build real path
        file_path = os.path.join(PHOTO_FOLDER, relative_path)

        if not os.path.exists(file_path):
            return f"File not found: {file_path}"

        save_path = filedialog.asksaveasfilename(initialfile=file_name)
        if save_path:
            with open(file_path, 'rb') as fsrc, open(save_path, 'wb') as fdst:
                fdst.write(fsrc.read())
        return "done"

api = Api()


# if __name__ == '__main__':
#     app.run(host="0.0.0.0", port=5000)

if __name__ == '__main__':
    wb.create_window(title='My Photo Viewer', url=app, js_api=api)
    wb.start()
    # wb.start(debug=True)