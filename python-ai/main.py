import os
import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import insightface
from insightface.app import FaceAnalysis

app = FastAPI(title="Production Face AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Initializing InsightFace (buffalo_l)...")
face_app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
face_app.prepare(ctx_id=0, det_size=(640, 640))
print("InsightFace initialized successfully!")


def bytes_to_cv2(image_bytes: bytes) -> np.ndarray:
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img


def check_liveness(face, img: np.ndarray) -> bool:
    if face is None or not hasattr(face, "kps") or face.kps is None:
        return False

    kps = face.kps
    if len(kps) < 5:
        return False

    left_eye, right_eye, nose, left_mouth, right_mouth = kps

    eye_dist = np.linalg.norm(left_eye - right_eye)
    if eye_dist < 10:
        return False

    mouth_width = np.linalg.norm(left_mouth - right_mouth)
    if mouth_width < 8:
        return False

    bbox = face.bbox.astype(int)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]

    if w < 40 or h < 40:
        return False

    aspect_ratio = float(w) / float(h)
    if aspect_ratio < 0.4 or aspect_ratio > 1.8:
        return False

    return True


@app.get("/")
def root():
    return {"status": "ok", "service": "InsightFace AI Service"}


@app.post("/extract-face")
async def extract_face(image: UploadFile = File(...)):
    if not image:
        raise HTTPException(status_code=400, detail="Rasm yuborilmadi")

    contents = await image.read()
    if not contents or len(contents) > 10 * 1024 * 1024:
        return {
            "success": False,
            "message": "Fayl hajmi 10 MB dan oshmasligi kerak",
            "faceDetected": False,
            "faceCount": 0
        }

    img = bytes_to_cv2(contents)
    if img is None:
        return {
            "success": False,
            "message": "Fayl formati noto'g'ri (Noma'lum rasm)",
            "faceDetected": False,
            "faceCount": 0
        }

    faces = face_app.get(img)
    face_count = len(faces)

    if face_count == 0:
        return {
            "success": False,
            "message": "Yuz topilmadi",
            "faceDetected": False,
            "faceCount": 0
        }

    if face_count > 1:
        return {
            "success": False,
            "message": "Faqat bitta yuz bo'lishi kerak",
            "faceDetected": True,
            "faceCount": face_count
        }

    target_face = faces[0]

    is_live = check_liveness(target_face, img)
    if not is_live:
        return {
            "success": False,
            "message": "Haqiqiy yuz tasdiqlanmadi",
            "faceDetected": True,
            "faceCount": 1,
            "liveness": False
        }

    embedding = target_face.embedding.tolist()

    return {
        "success": True,
        "message": "Yuz muvaffaqiyatli aniqlandi va embedding yaratildi",
        "faceDetected": True,
        "faceCount": 1,
        "liveness": True,
        "embedding": embedding,
        "det_score": float(target_face.det_score) if hasattr(target_face, "det_score") else 0.99
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 5000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
