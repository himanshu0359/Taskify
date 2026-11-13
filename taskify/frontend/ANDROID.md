# Build the Android APK

## Requirements

- Node.js and npm
- Android Studio with the Android SDK and a Java Development Kit
- A backend API reachable from the Android device over HTTPS

The app's API URL is compiled into the web assets. Set it before building:

```powershell
$env:NEXT_PUBLIC_API_URL = "https://your-api-host.example"
```

For local development in a browser, the API defaults to `http://127.0.0.1:8000`.
That default does not work inside an Android APK because `127.0.0.1` refers to
the phone. Use a deployed HTTPS API for a distributable APK.

## Create and build the Android project

From this directory, set the API URL and create the Android project once:

```powershell
npm install
$env:NEXT_PUBLIC_API_URL = "https://your-api-host.example"
npm run android:add
```

Then build and sync the Android assets:

```powershell
$env:NEXT_PUBLIC_API_URL = "https://your-api-host.example"
npm run android:sync
npm run android:open
```

`android:add` and `android:sync` reject missing or non-HTTPS API URLs, so the
generated app won't silently ship pointed at the phone's own localhost.

In Android Studio, allow Gradle sync to finish and use **Build > Build Bundle(s) /
APK(s) > Build APK(s)**. Android Studio reports the APK file location when the
build completes.
