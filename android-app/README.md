# Planning Tool - Android App

## 📁 Folder Structure

```
android-app/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/planningtool/        # Java source files
│   │   │   ├── kotlin/com/planningtool/      # Kotlin source files
│   │   │   ├── res/                           # Resources
│   │   │   │   ├── layout/                   # XML layouts
│   │   │   │   ├── drawable/                 # Images, icons
│   │   │   │   ├── mipmap/                   # App icons
│   │   │   │   └── values/                   # Strings, colors, styles
│   │   │   ├── assets/                        # Raw assets
│   │   │   └── AndroidManifest.xml           # App manifest
│   │   ├── androidTest/                       # Instrumented tests
│   │   └── test/                              # Unit tests
│   └── build.gradle                           # App-level build config
├── gradle/                                     # Gradle wrapper
└── build.gradle                                # Project-level build config
```

## 🎯 Purpose

This folder contains the Android mobile application for the Planning Tool, completely separated from:
- Web app (root HTML files)
- React web app (`planning-tool-react/`)
- Backend API (`backend/`)
- Chrome extension (`chrome-extension/`)

## 🚀 Getting Started

1. Open this folder in Android Studio
2. Sync Gradle files
3. Run on emulator or physical device
