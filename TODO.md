# TODO: Tüm Türkiye Eczane Haritası

## Plan
1. [x] Mevcut pharmacy sistemini analiz et
2. [ ] Türkiye iller verisi oluştur (turkishCities.js)
3. [ ] integrations.js güncelle - getAllDutyPharmacies fonksiyonu ekle
4. [ ] Pharmacy.jsx güncelle - "Tüm Türkiye" sekmesi ekle
5. [ ] Test et

## Yapılacak Değişiklikler

### 1. turkishCities.js (YENİ DOSYA)
- 81 ilin koordinatlarını içeren veri dosyası

### 2. src/api/integrations.js
- `getAllDutyPharmacies()` fonksiyonu eklenecek
- Tüm illerden nöbetçi eczane verilerini çekecek

### 3. src/pages/Pharmacy.jsx
- "Tüm Türkiye" sekmesi eklenecek
- Kullanıcı haritaya tüm Türkiye'deki eczaneleri görebilecek

