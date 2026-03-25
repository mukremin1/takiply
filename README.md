# Takiply

Bu proje mobil uygulama olarak hedeflenir. Arayuz, Capacitor icinde calisan
bir WebView ile Android ve iOS paketlerine donusturulur.

## Firebase Auth Kurulumu

1. Firebase Console'da bir proje acin.
2. `Authentication` altinda gerekli saglayicilari aktif edin.
3. `.env` dosyasi olusturun ve `.env.example` icindeki Firebase alanlarini doldurun.
4. Google girisi kullanacaksaniz Android icin `SHA-1` ve `SHA-256` bilgilerini Firebase'e ekleyin.

## AI Recete Tarama Ayarlari

`.env` dosyasina su alanlari ekleyin:

```bash
VITE_OPENAI_API_KEY=...
VITE_OPENAI_MODEL=gpt-4o-mini
VITE_OPENAI_BASE_URL=https://api.openai.com/v1
```

## Nobetci Eczane Ayarlari

`.env` dosyasinda su alanlari kullanin:

```bash
VITE_GOOGLE_MAPS_API_KEY=...
COLLECTAPI_KEY=...
VITE_SERVER_API_BASE_URL=
```

- `VITE_GOOGLE_MAPS_API_KEY` zorunludur. `src/pages/Pharmacy.jsx` haritayi Google Maps JavaScript API ile yukler.
- Gelistirmede Vite, `/api/duty-pharmacies` istegini lokal middleware ile proxy eder.
- Mobil uygulamada `VITE_SERVER_API_BASE_URL` bos birakilirsa `COLLECTAPI_KEY`
  native build icine dahil edilir ve istek dogrudan cihazdan yapilir.
- Bu yontem backend gerektirmez ama guvenli degildir; anahtar uygulamadan cikarilabilir.
- Guvenli kurulum isterseniz ayri bir backend endpoint kullanip
  `VITE_SERVER_API_BASE_URL` tanimlayin. Ornek handler `api/duty-pharmacies.js`
  altindadir.

## Android / iOS

Native projelere web degisikligini almak icin:

```bash
npm run mobile:sync
```

Android calistirma:

```bash
npm run mobile:android
```

Play Console icin AAB uretme:

```bash
npm run android:aab
```

AAB uretimi onkosulleri:

- JDK 21 onerilir.
- `dl.google.com` ve `repo.maven.apache.org` adreslerine erisim gerekli.
- Proxy kullaniliyorsa Gradle/Maven isteklerine 403 vermemelidir.

AAB cikti yolu:

```bash
android/app/build/outputs/bundle/release/app-release.aab
```

iOS calistirma:

```bash
npm run mobile:ios
```

## Komutlar

```bash
npm install
npm run dev
npm run build
```
