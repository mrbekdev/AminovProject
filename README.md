# Production Face ID Attendance System (NestJS + Python InsightFace AI)

Ushbu loyiha **Senior Clean Architecture** tamoyillari asosida qurilgan **Production-Grade Face ID Davomat Moduli** hisoblanadi.

---

## 🚀 Texnologik Stak

* **Backend API**: NestJS (TypeScript, Multer, Prisma ORM)
* **AI Engine Service**: Python FastAPI + **InsightFace (`buffalo_l`)** + SCRFD Face Detector + ArcFace Embedder
* **Database**: PostgreSQL (`pgvector` support) + Prisma ORM
* **Caching**: Redis
* **Containerization**: Docker Compose

---

## 📁 Loyiha Strukturasi

```
AminovProject-main/
├── apps/
│   └── nest-api/                 # NestJS API Service
├── python-ai/                    # Python FastAPI InsightFace Service
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile
├── prisma/
│   └── schema.prisma             # PostgreSQL schema (FaceTemplate & AttendanceDay)
├── uploads/                      # Biometrik yuz rasmlari
├── docker-compose.yml            # Production Multi-container orchestration
└── Dockerfile                    # NestJS API Docker Image
```

---

## ⚡ Asosiy Imkoniyatlar & Xavfsizlik

1. **Background / Orqa Fon Tasir Qilmaydi**:
   - InsightFace `buffalo_l` va ArcFace neyron modellari orqa fon (devor, xona, kiyim, yoritish) piksellarini 100% inobatga olmaydi.
   - 512-o'lchamli biometrik embedding (`512 float vector`) va yuz landmarklari orqali qaror chiqaradi.

2. **Yuz Tekshiruvi Qoidalari**:
   - `0 yuz`: `HTTP 400` -> `{"success": false, "message": "Yuz topilmadi"}`
   - `>1 yuz`: `HTTP 400` -> `{"success": false, "message": "Faqat bitta yuz bo'lishi kerak"}`
   - Soxta yuz (Photo attack / Liveness check failed): `HTTP 400` -> `{"success": false, "message": "Haqiqiy yuz tasdiqlanmadi"}`
   - Noma'lum inson (Cosine Similarity < 0.65): `HTTP 400` -> `{"success": false, "message": "Bu odam tizimda mavjud emas"}`

3. **Davomat Mantiqi (Attendance Rules)**:
   - Bugun kelmagan bo'lsa -> Status: `"Keldi"`
   - Bugun kelgan lekin ketmagan bo me bo'lsa -> Status: `"Ketdi"`
   - Bugun kelgan va ketgan bo'lsa -> Yangi record ochilmaydi, status: `"Ketdi"`

---

## 🛠 O'rnatish va Ishga Tushirish (Docker Compose)

### 1. Docker Compose orqali barcha servislarni ishga tushirish:
```bash
docker-compose up --build -d
```

### 2. Mahalliy (Local) tartibda ishga tushirish:

#### Python AI Service:
```bash
cd python-ai
pip install -r requirements.txt
python main.py
```
*(Server http://localhost:5000 manzilida ishga tushadi)*

#### NestJS API Service:
```bash
npm install --legacy-peer-deps
npx prisma generate
npm run start:dev
```
*(Server http://localhost:4000 manzilida ishga tushadi)*

---

## 📡 REST API Hujjatlari & cURL Misollari

### 1. Employee FaceID Ro'yxatdan o'tkazish (`POST /face/register`)

Multi-part shaklda xodim uchun bir nechta rasm yuboriladi va 512-float vektorlar bazaga yoziladi:

```bash
curl -X POST "http://localhost:4000/face/register" \
  -F "employeeId=49" \
  -F "images=@/path/to/photo1.jpg" \
  -F "images=@/path/to/photo2.jpg"
```

**Javob:**
```json
{
  "success": true,
  "message": "FaceID muvaffaqiyatli ro'yxatdan o'tkazildi",
  "registered_count": 2
}
```

---

### 2. FaceID Verifikatsiya va Avto-Davomat (`POST /face/verify`)

```bash
curl -X POST "http://localhost:4000/face/verify" \
  -F "image=@/path/to/webcam_scan.jpg"
```

**Javob (Kelganda):**
```json
{
  "success": true,
  "employee": "AZIZ ATABEKOV",
  "status": "Keldi"
}
```

**Javob (Ketganda):**
```json
{
  "success": true,
  "employee": "AZIZ ATABEKOV",
  "status": "Ketdi"
}
```

**Xatolik Javoblari (Strict Requirement Standard):**

- *Yuz aniqlanmasa:*
  ```json
  {
    "success": false,
    "message": "Yuz topilmadi"
  }
  ```

- *Bir nechta yuz bo'lsa:*
  ```json
  {
    "success": false,
    "message": "Faqat bitta yuz bo'lishi kerak"
  }
  ```

- *Tizimda mavjud bo'lmagan shaxs (Similarity < 0.65):*
  ```json
  {
    "success": false,
    "message": "Bu odam tizimda mavjud emas"
  }
  ```

---

### 3. Bugungi Davomat (`GET /attendance/today`)

```bash
curl -s "http://localhost:4000/attendance/today"
```

---

### 4. Xodimning Davomat Tarixi (`GET /attendance/history/:employeeId`)

```bash
curl -s "http://localhost:4000/attendance/history/49"
```
