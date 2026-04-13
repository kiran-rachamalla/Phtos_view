import json
import os
from PIL import Image
from io import BytesIO
import subprocess

from flask import Flask, render_template, request, send_from_directory, jsonify, send_file

# PHOTO_FOLDER = r'F:\Photos\chintu photos'
PHOTO_FOLDER = r'C:\Users\racha\OneDrive\Desktop\Googlephotos'
BATCH_SIZE = 80
THUMB_SIZE = (300, 300)
THUMB_FOLDER = "thumb_cache"

app = Flask(__name__, template_folder='Templates')

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
    items = get_files_and_folders(folder)
    slice = items[offset:offset+BATCH_SIZE]

    return {
        "images": slice,
        "next_offset": offset + len(slice)
    }

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

     FFMPEG_PATH = os.path.join(BASE_DIR, "ffmpeg", "ffmpeg.exe")

     cmd = [
                FFMPEG_PATH,
                "-i", video_path,
                "-ss", "00:00:01",
                "-vframes", "1",
                "-q:v", "5",
                thumb_path
            ]

     subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL);
     # result = subprocess.run(cmd, capture_output=True, text=True)
     #
     # print("STDOUT:", result.stdout)
     # print("STDERR:", result.stderr)

# app.run(debug=True)
if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000)
