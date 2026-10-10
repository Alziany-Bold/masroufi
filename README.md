# مصروفي · Masroufi

دفتر مصاريف بالعربي، شخصي وتجاري، يتزامن بين الجوال واللابتوب.
An Arabic money notebook for personal and business use, synced between phone and laptop.

## كيف تستخدمه

- **الطريقة الأساسية:** افتح رابط التطبيق على Claude من جوالك ولابتوبك. بياناتك محفوظة في حسابك وتتزامن بين الجهازين.
- **على الشاشة الرئيسية:** من الإعدادات ← «على شاشتك الرئيسية»، فيها الخطوات للآيفون والأندرويد واللابتوب.
- **نسخة بدون إنترنت أو حساب:** افتح `dist/index.html` في المتصفح. تشتغل كاملة، لكن بياناتها تبقى في ذلك المتصفح فقط، وبدون مزامنة أو قراءة إيصالات.

## الميزات

| | |
|---|---|
| تسجيل سريع | اكتب «قهوة 15» واضغط Enter، والتصنيف والوقت يتحددان تلقائيًا |
| أزرار بضغطة | للأشياء اللي تشتريها كثير |
| رسائل البنك | الصق رسالة الشراء ونقرأ المبلغ والمتجر والوقت |
| صورة الإيصال | يقرأ المبلغ والمتجر والتاريخ |
| مدفوعات شهرية | الإيجار والفواتير والراتب تنضاف لحالها |
| دفاتر متعددة | شخصي (ميزانية ومصروف يومي) وتجاري (مبيعات ومصاريف وصافي ربح) |
| شهر من يوم الراتب | مثلًا من ٢٧ إلى ٢٦ |
| حدود وملخص | تنبيه عند ٨٠٪ من حد التصنيف، وملخص بكلام بسيط ورسم لآخر ستة أشهر |
| الصناديق | صدقة، كفالة، أضحية، زكاة الفطر، حج وعمرة، حاسبة الزكاة، سجل الديون |
| استيراد وتصدير | Excel وCSV وكشوف PDF، وتقرير PDF شهري |
| خصوصية | إخفاء المبالغ وقفل برمز |
| مظهر | فاتح وداكن، وأرقام عربية (123) أو هندية (١٢٣) |

## Project layout

```
src/masroufi.html   the whole app (HTML, CSS, JS in one file); this is what gets published to Claude
scripts/build.js    wraps src into dist/index.html, a complete page for any browser
dist/index.html     built standalone version (local storage only)
tests/              parsing, import, receipt and end-to-end tests (run in a simulated browser)
```

## Development

```bash
npm install     # test tools only: jsdom and xlsx
npm run build   # rebuild dist/index.html after changing src
npm test        # 4 suites: quick entry & SMS, Excel/PDF import, receipt photo, full app + two-device sync
```

How the app keeps data:

- **Inside Claude** it uses the artifact's private per-user store (`data/users/<id>/`). Each notebook is a set of documents: `<book>.meta` for settings, funds, debts and monthly items, and one `<book>.m-YYYY-MM` document per month, where every entry is its own key. Two devices adding entries at the same time therefore never overwrite each other. A weekly backup goes to `<book>.meta/backups`.
- **Outside Claude** (`dist/index.html`) everything lives in the browser's `localStorage`.
- Libraries load from cdnjs only when needed: SheetJS for Excel, pdf.js for PDF import, html2canvas and jsPDF for PDF reports. Icons come from Lucide.

## التطبيق على الجوال

الرابط: https://alziany-bold.github.io/masroufi/

- **iPhone:** افتح الرابط في Safari ← زر المشاركة ← «إضافة إلى الشاشة الرئيسية».
- **Android:** افتح الرابط في Chrome ← ⋮ ← «تثبيت التطبيق».

يعمل بلا إنترنت، وبياناتك تبقى على جهازك فقط. لنشر تحديث: `npm run publish`.
