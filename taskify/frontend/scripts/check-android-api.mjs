const apiUrl = process.env.NEXT_PUBLIC_API_URL;

if (!apiUrl) {
  console.error(
    "Set NEXT_PUBLIC_API_URL to the HTTPS URL of a backend reachable from the Android device before building."
  );
  process.exit(1);
}

let parsedUrl;
try {
  parsedUrl = new URL(apiUrl);
} catch {
  console.error("NEXT_PUBLIC_API_URL must be a valid absolute URL.");
  process.exit(1);
}

if (parsedUrl.protocol !== "https:" || parsedUrl.username || parsedUrl.password) {
  console.error(
    "NEXT_PUBLIC_API_URL must use HTTPS and must not contain credentials."
  );
  process.exit(1);
}
