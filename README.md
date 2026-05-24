# Secure Notes - Prototipe UTS Keamanan Aplikasi Mobile

Aplikasi catatan rahasia berbasis React Native (Expo) yang dirancang untuk mendemonstrasikan implementasi keamanan pada perangkat mobile, mulai dari proteksi aset fisik hingga simulasi keamanan jaringan.

## Fitur Keamanan Utama

Aplikasi ini mengimplementasikan beberapa lapisan keamanan sesuai dengan standar materi perkuliahan:

### 1. Otentikasi & Proteksi Akses
- **PIN 4-Digit**: Akses utama ke dashboard aplikasi.
- **Hashing Verification**: PIN tidak disimpan dalam bentuk teks biasa, melainkan diverifikasi menggunakan algoritma *hashing* sederhana (Simulasi Materi 2-3).
- **Brute Force Protection**: Aplikasi akan terkunci secara otomatis jika terjadi kesalahan input PIN sebanyak 3 kali berturut-turut.
- **Session Timeout**: Sesi aktif dibatasi selama 60 detik. Aplikasi akan otomatis logout jika mencapai batas waktu untuk mencegah akses tidak sah pada perangkat yang ditinggalkan.

### 2. Kriptografi Penyimpanan (Data-at-Rest)
Terdapat tiga mode penyimpanan yang menunjukkan perkembangan teknik kriptografi:
- **Plaintext**: Data disimpan tanpa enkripsi (Risiko Tinggi).
- **Classic (Shift Cipher)**: Menggunakan teknik pergeseran karakter (Caesar Cipher) sebagai demonstrasi metode klasik.
- **Modern (XOR Stream)**: Menggunakan operasi bitwise XOR yang lebih kuat, mengikuti prinsip *Confusion* dalam kriptografi modern.

### 3. Keamanan Transmisi & Jaringan
- **Device Identity**: Menampilkan simulasi identitas unik perangkat (IMEI/IMSI) sebagai bagian dari arsitektur GSM.
- **Connectivity Audit**: Simulasi deteksi keamanan jaringan WiFi (WPA3 vs Open WiFi).
- **Security Analysis**: Setiap catatan dilengkapi dengan analisis risiko transmisi berdasarkan jenis jaringan dan enkripsi yang dipilih.

## Cara Menjalankan
1. Pastikan Anda memiliki lingkungan **Expo** yang sudah terinstal.
2. Jalankan perintah `npx expo start`.
3. Gunakan PIN Default: **`1234`** untuk masuk ke aplikasi.

## Catatan Pengembang
Aplikasi ini dikembangkan sebagai tugas Ujian Tengah Semester (UTS) mata kuliah Keamanan Aplikasi Mobile. Seluruh data yang digunakan (IMEI, IMSI, Metadata) adalah **data dummy** untuk keperluan simulasi akademis.
