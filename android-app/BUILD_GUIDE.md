# 📦 Android App - Build & APK Guide

## 📍 ตำแหน่งไฟล์ APK

หลังจาก build แอปแล้ว ไฟล์ `.apk` จะอยู่ที่:

### Debug APK (สำหรับ testing)
```
android-app/app/build/outputs/apk/debug/
└── app-debug.apk          ← ไฟล์นี้ใช้สำหรับทดสอบ
```

### Release APK (สำหรับ production)
```
android-app/app/build/outputs/apk/release/
└── app-release.apk        ← ไฟล์นี้ใช้อัพโหลด Play Store หรือแจกจ่าย
```

## 🔨 วิธี Build APK

### 1. Build Debug APK (ทดสอบ)
```bash
cd android-app
./gradlew assembleDebug
```
ไฟล์จะอยู่ที่: `app/build/outputs/apk/debug/app-debug.apk`

### 2. Build Release APK (production)
```bash
cd android-app
./gradlew assembleRelease
```
ไฟล์จะอยู่ที่: `app/build/outputs/apk/release/app-release.apk`

### 3. Build ผ่าน Android Studio
1. เปิด Android Studio → Open → เลือก `android-app/`
2. Menu: **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
3. รอจนเสร็จ → คลิก **locate** เพื่อเปิด folder ที่มี APK

## 📱 วิธีติดตั้ง APK

### ติดตั้งบนมือถือ
1. Copy ไฟล์ `.apk` ไปยังมือถือ
2. เปิด File Manager → คลิกที่ไฟล์ `.apk`
3. อนุญาต "Install from Unknown Sources" ถ้าถูกถาม
4. คลิก Install

### ติดตั้งผ่าน ADB (Android Debug Bridge)
```bash
adb install app/build/outputs/apk/debug/app-debug.apk
```

## 🔐 Signing (สำหรับ Release)

สำหรับ release APK ที่จะอัพ Play Store ต้อง sign ด้วย keystore:

```bash
./gradlew assembleRelease -Pandroid.injected.signing.store.file=/path/to/keystore.jks \
  -Pandroid.injected.signing.store.password=your_password \
  -Pandroid.injected.signing.key.alias=your_alias \
  -Pandroid.injected.signing.key.password=your_key_password
```

## 📂 Folder Structure หลัง Build

```
android-app/
└── app/
    └── build/
        └── outputs/
            ├── apk/
            │   ├── debug/
            │   │   └── app-debug.apk       ← Debug version
            │   └── release/
            │       └── app-release.apk     ← Release version
            └── bundle/                      (AAB for Play Store)
                └── release/
                    └── app-release.aab
```

## 🚀 Upload to Play Store

สำหรับ Google Play Store แนะนำใช้ **AAB** (Android App Bundle) แทน APK:

```bash
./gradlew bundleRelease
```

ไฟล์ AAB จะอยู่ที่: `app/build/outputs/bundle/release/app-release.aab`

---

💡 **หมายเหตุ**: ไฟล์ APK/AAB จะถูกสร้างเมื่อ build เท่านั้น ตอนนี้ folder ยังว่างอยู่จนกว่าจะ build project
