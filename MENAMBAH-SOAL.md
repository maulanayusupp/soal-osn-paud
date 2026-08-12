# Menambah soal

Ada tiga cara menambah atau memperbaiki soal di Kancil Pintar. Pilih sesuai
sumbernya:

| Situasi | Cara | Perlu berkas sumber? |
| ------- | ---- | -------------------- |
| Punya naskah OSN baru (`.docx`/`.pdf`) | [Jalur A](#jalur-a--naskah-osn-baru) | Ya |
| Ingin menulis soal sendiri | [Jalur B](#jalur-b--soal-tulisan-sendiri) | Tidak |
| Soal yang sudah ada keliru atau tidak lengkap | [Jalur C](#jalur-c--memperbaiki-soal-yang-sudah-ada) | Tidak |

Aturan yang berlaku untuk ketiganya: **jangan pernah menyunting berkas di
`content/generated/`**. Isinya ditimpa setiap kali impor dijalankan. Yang
disunting selalu berkas sumbernya — `content/manual/` atau `content/overrides/`.

---

## Jalur A — naskah OSN baru

Untuk naskah OSN season berikutnya, atau naskah lain yang formatnya sama
(nomor soal di margin kiri, pilihan `a.`/`b.`/`c.` menjorok, jawaban benar
distabilo).

### 1. Taruh berkasnya

Berkas sumber **tidak ikut disimpan di repositori ini** — itu materi pihak
ketiga, jadi hanya ada di komputer Anda. Susunan foldernya:

```
~/Downloads/Soal OSN Paud/
└── Soal OSN PAUD-TK Season 5/
    ├── Babak Penyisihan/
    │   ├── Soal OSN Matematika PAUD.docx
    │   └── Soal OSN Matematika PAUD.pdf     ← opsional, tapi sangat membantu
    └── Babak Final/
        └── ...
```

Nama berkas menentukan identitas soal, jadi ikuti pola ini:

- **musim** dari nama folder: `Season 5` → `s5`
- **babak** dari nama folder: `Babak Penyisihan` → `penyisihan`, `Babak Final` → `final`
- **mata pelajaran** dari nama berkas: mengandung `Matematika`, `Sains`/`IPA`, atau `Inggris`
- **kelompok usia** dari nama berkas: `PAUD`, `TK A`, atau `TK B`

Hasilnya jadi id seperti `s5-penyisihan-matematika-paud`.

> **Sertakan `.pdf` bila ada.** Kalau hanya ada `.docx`, LibreOffice yang
> mengubahnya, dan tata letaknya kadang bergeser sedikit. PDF asli selalu lebih
> tepat.

### 2. Jalankan impor

```bash
pnpm soal:scan     # perbarui daftar berkas sumber
pnpm soal:import   # baca ulang semuanya
pnpm soal:check    # empat pemeriksaan
```

`soal:scan` membaca `~/Downloads/Soal OSN Paud` secara bawaan. Kalau folder
sumbernya di tempat lain, berikan alamatnya — dan karena namanya mengandung
spasi, tulis begini supaya `~` tetap terbaca:

```bash
pnpm soal:scan ~/Documents/"Soal OSN Paud"
```

`soal:import` memakan waktu beberapa menit karena me-render tiap halaman.
Untuk satu naskah saja:

```bash
pnpm soal:import --only s5-penyisihan-matematika-paud
```

### 3. Baca hasilnya

Impor mencetak baris per naskah:

```
·	s5-penyisihan-matematika-paud	20/20 playable
⚠	s5-final-sains-tk-b	18/20 playable
  	  Q7: no answer highlight found
  	  Q13: option c is empty
```

`⚠` berarti ada soal yang **ditahan** (`status: "needs-review"`) dan tidak
ditampilkan ke anak. Itu disengaja: soal yang terbaca separuh lebih buruk
daripada soal yang tidak ada. Untuk memperbaikinya, lihat [Jalur C](#jalur-c--memperbaiki-soal-yang-sudah-ada).

Kalau ada yang perlu diperiksa mata sendiri:

```bash
pnpm soal:review --unreached      # soal yang tidak terjangkau pemeriksa kunci
pnpm soal:proof s5-penyisihan-matematika-paud   # lembar bukti satu naskah
```

Keduanya menulis gambar ke `.import-cache/review/`.

### Yang perlu diketahui soal Jalur A

Perlu **poppler** (`pdftohtml`, `pdftoppm`) dan **LibreOffice** terpasang. Kalau
naskahnya hanya `.docx`, LibreOffice wajib ada.

Rincian cara kerja pipeline — kenapa gambar ditentukan dari titik tengahnya,
kenapa stabilo dibaca dari piksel, dan seterusnya — ada di
[CLAUDE.md](./CLAUDE.md#the-import-pipeline-why-it-works-this-way).

---

## Jalur B — soal tulisan sendiri

Untuk soal yang Anda tulis sendiri: latihan berhitung buatan sendiri, kosakata
yang sedang dipelajari, apa pun. **Tidak perlu berkas Word, PDF, poppler, atau
LibreOffice.** Cukup satu berkas JSON.

### 1. Buat berkasnya

Satu berkas per paket soal, di `content/manual/`. **Nama berkas menjadi id dan
alamat halamannya**, jadi pakai huruf kecil dan tanda hubung:

`content/manual/berhitung-sampai-sepuluh.json` → `/latihan/berhitung-sampai-sepuluh`

```json
{
  "title": "Berhitung sampai 10",
  "subject": "matematika",
  "level": "tk-a",
  "questions": [
    {
      "prompt": "Berapa 2 + 3?",
      "answer": "b",
      "options": [
        { "text": "4" },
        { "text": "5" },
        { "text": "6" }
      ]
    },
    {
      "prompt": "Mana gambar yang jumlahnya lima?",
      "answer": "c",
      "options": [
        { "images": ["/soal/berhitung-sampai-sepuluh/tiga.webp"] },
        { "images": ["/soal/berhitung-sampai-sepuluh/empat.webp"] },
        { "images": ["/soal/berhitung-sampai-sepuluh/lima.webp"] }
      ]
    }
  ]
}
```

### 2. Jalankan

```bash
pnpm soal:manual
```

Selesai — soalnya langsung muncul di daftar latihan. Perintah ini hanya membaca
`content/manual/`, jadi berjalan dalam hitungan detik dan tidak menyentuh 60
naskah OSN sama sekali.

### Isi berkasnya

**Tingkat paket soal:**

| Kolom | Wajib | Isi |
| ----- | ----- | --- |
| `title` | ya | Nama paket soal, bebas. Ini yang tampil sebagai judul halaman. |
| `subject` | ya | `matematika`, `sains`, atau `bahasa-inggris` |
| `level` | ya | `paud`, `tk-a`, atau `tk-b` |
| `questions` | ya | Daftar soal, minimal satu |

**Tingkat soal:**

| Kolom | Wajib | Isi |
| ----- | ----- | --- |
| `prompt` | ya, kecuali ada `images` | Pertanyaannya |
| `images` | tidak | Gambar untuk soalnya, misal `["/soal/xxx/gambar.webp"]` |
| `options` | ya | Minimal dua pilihan |
| `answer` | ya | Huruf pilihan yang benar: `"a"`, `"b"`, `"c"`, atau `"d"` |
| `n` | tidak | Nomor soal. Kalau dikosongkan, dinomori urut dari urutan penulisan. |

**Tingkat pilihan:**

| Kolom | Wajib | Isi |
| ----- | ----- | --- |
| `text` | ya, kecuali ada `images` | Tulisan pilihannya |
| `images` | tidak | Gambar pilihannya |
| `key` | tidak | Huruf pilihan. Kalau dikosongkan, diberi `a`, `b`, `c` sesuai urutan. |

Sebuah pilihan boleh berupa tulisan, gambar, atau keduanya.

### Menambahkan gambar

Taruh berkas gambarnya sendiri di dalam `public/`, lalu tulis alamatnya dimulai
dengan `/`:

```
public/soal/berhitung-sampai-sepuluh/lima.webp
                ↓
"images": ["/soal/berhitung-sampai-sepuluh/lima.webp"]
```

Gunakan **folder tersendiri** dengan nama sama seperti id paket soalnya. Jangan
menaruh gambar di folder milik naskah OSN — `pnpm soal:import` menghapus isi
folder-folder itu setiap kali dijalankan, dan gambar Anda akan ikut terhapus.

WebP paling hemat, tapi PNG dan JPG juga bisa. Lebar sekitar 600–700 piksel
sudah lebih dari cukup.

### Kalau ada yang salah tulis

Berkas yang salah **ditolak seluruhnya** dan tidak pernah setengah masuk. Pesan
kesalahannya menyebut berkas dan nomor soalnya:

```
✗	content/manual/berhitung-sampai-sepuluh.json
    - subject: must be one of matematika, sains, bahasa-inggris (got "matematik")
    - question 2 option a: this letter is used twice
    - question 2: answer "d" matches no option (has a, b, c)
    - question 3: picture /soal/xxx/lima.webp is not in public/
```

Perbaiki, jalankan lagi. Paket soal lain tidak terpengaruh.

### Menghapus paket soal

Hapus berkasnya dari `content/manual/`, jalankan `pnpm soal:manual`. Baris
katalog dan berkas hasilnya ikut terhapus, jadi halamannya benar-benar hilang —
bukan sekadar tidak terdaftar.

### Yang perlu diketahui soal Jalur B

- Soal tulisan sendiri **tidak punya musim dan babak** — dua hal itu milik OSN.
  Di daftar latihan tampil bertanda "Latihan sendiri", dan akan hilang kalau
  saringan Musim atau Babak dipakai.
- **Selalu ditampilkan.** Tidak ada status `needs-review`: berkasnya diterima
  utuh atau ditolak utuh, tidak ada keadaan setengah terbaca.
- `pnpm soal:import` (impor penuh) **juga** membaca `content/manual/`, jadi
  paket soal Anda tidak akan hilang saat naskah OSN diimpor ulang.
  `pnpm soal:manual` hanya jalan pintas yang cepat.
- Empat pemeriksaan di `pnpm soal:check` **tidak** menyentuh paket soal tulisan
  sendiri. Tidak ada halaman cetak untuk dibandingkan; pemeriksaannya sudah
  dilakukan saat impor.

---

## Jalur C — memperbaiki soal yang sudah ada

Untuk soal OSN yang salah baca atau ditahan. Koreksi manusia **selalu menang**
atas hasil ekstraksi, dan bertahan meski impor diulang.

Buat `content/overrides/<id-naskah>.json`:

```json
{
  "verified": true,
  "questions": {
    "7": {
      "answer": "b"
    },
    "13": {
      "prompt": "Berapa jumlah apel di bawah ini?",
      "options": {
        "c": { "text": "Sepuluh" }
      }
    }
  }
}
```

- Kunci di `questions` adalah **nomor soal** sebagai teks (`"7"`, bukan `7`).
- Yang ditulis hanya bagian yang perlu diganti; sisanya tetap dari ekstraksi.
- Soal yang tadinya ditahan **otomatis ditampilkan lagi** begitu punya kunci
  jawaban, punya minimal tiga pilihan, dan setiap pilihannya terisi (tulisan
  atau gambar).
- `"verified": true` menandai bahwa naskah itu sudah diperiksa manusia.

Lalu:

```bash
pnpm soal:import --only <id-naskah>
```

Override **tidak bisa menambah soal baru** — hanya menambal soal yang sudah ada.
Untuk menambah soal, pakai Jalur A atau B.

---

## Setelah menambah soal

Angka di beranda dihitung dari data, jadi ikut berubah sendiri. Yang perlu
dijalankan sebelum commit:

```bash
pnpm typecheck
pnpm build
```

Kalau yang ditambah lewat Jalur A, jalankan juga `pnpm soal:check`.

Dan sesuai aturan proyek: **commit dan push setiap perubahan** (lihat
[CLAUDE.md](./CLAUDE.md#rules-do-not-break)).
