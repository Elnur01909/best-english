import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Məxfilik Siyasəti — AZEN',
  description: 'AZEN platformasının məxfilik siyasəti və istifadəçi məlumatlarının qorunması',
}

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <Link href="/" className="text-blue-600 dark:text-blue-400 text-sm hover:underline">
        ← Ana səhifə
      </Link>

      <h1 className="text-3xl font-bold mt-4 mb-2 text-gray-900 dark:text-gray-100">
        Məxfilik Siyasəti
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
        Son yenilənmə: 11 iyun 2026
      </p>

      <div className="space-y-8 text-gray-700 dark:text-gray-300 leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
            1. Ümumi məlumat
          </h2>
          <p>
            AZEN (bundan sonra &quot;Platforma&quot;) — ingilis dili və TOLES sertifikat
            hazırlığı üçün öyrənmə platformasıdır. Bu siyasət hansı məlumatları topladığımızı,
            onları necə istifadə etdiyimizi və qoruduğumuzu izah edir. Platformadan istifadə
            etməklə bu siyasətlə razılaşmış olursunuz.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
            2. Topladığımız məlumatlar
          </h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Hesab məlumatları:</strong> qeydiyyat zamanı email ünvanınız və göstərmək
              istədiyiniz ad.
            </li>
            <li>
              <strong>Öyrənmə fəaliyyəti:</strong> dərs irəliləyişi, test nəticələri, lüğət
              təkrarı tarixçəsi, günlük seriya (streak) və xal statistikası — yalnız sizin
              irəliləyişinizi göstərmək üçün.
            </li>
            <li>
              <strong>Dostlar funksiyası:</strong> dost əlavə etmək üçün axtardığınız email
              ünvanları və yarış (battle) nəticələri.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
            3. Cihazınızda qalan məlumatlar
          </h2>
          <p>
            AI müəllim və tələffüz funksiyaları üçün daxil etdiyiniz şəxsi API açarları
            (Google Gemini, Azure Speech) <strong>yalnız sizin cihazınızda</strong> (brauzerin
            localStorage yaddaşında) saxlanılır, heç vaxt serverlərimizə göndərilmir və bizim
            tərəfimizdən görünmür.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
            4. Məlumatların saxlanması və qorunması
          </h2>
          <p>
            Hesab və irəliləyiş məlumatları Supabase (PostgreSQL) infrastrukturunda saxlanılır.
            Hər istifadəçi yalnız öz məlumatlarına çıxış edə bilər (Row Level Security).
            Bütün əlaqə HTTPS ilə şifrələnir.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
            5. Məlumatların paylaşılması
          </h2>
          <p>
            Məlumatlarınızı <strong>satmırıq, icarəyə vermirik və üçüncü tərəflərlə paylaşmırıq</strong>.
            Platformada reklam və izləmə (tracking) alətləri yoxdur.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
            6. Hesabın silinməsi
          </h2>
          <p>
            Hesabınızı və bütün bağlı məlumatlarınızı silmək istəsəniz, aşağıdakı email
            ünvanına müraciət edin — sorğunuz 30 gün ərzində icra olunacaq.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
            7. Uşaqların məxfiliyi
          </h2>
          <p>
            Platforma ümumi auditoriya üçün nəzərdə tutulub və bilərəkdən 13 yaşdan kiçik
            uşaqlardan məlumat toplamır.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
            8. Əlaqə
          </h2>
          <p>
            Suallarınız üçün:{' '}
            <a href="mailto:elnurmirzey@gmail.com" className="text-blue-600 dark:text-blue-400 hover:underline">
              elnurmirzey@gmail.com
            </a>
          </p>
        </section>

        <section className="border-t border-gray-200 dark:border-gray-800 pt-8">
          <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
            Privacy Policy (English summary)
          </h2>
          <p>
            AZEN collects your email address, display name, and learning progress
            (lesson completion, quiz results, vocabulary review history) solely to provide
            the learning experience. Data is stored securely on Supabase with row-level
            security and transmitted over HTTPS. Personal AI keys (Google Gemini, Azure
            Speech) are stored only on your device and never sent to our servers. We do not
            sell or share your data, and the app contains no ads or trackers. To delete your
            account and all associated data, contact{' '}
            <a href="mailto:elnurmirzey@gmail.com" className="text-blue-600 dark:text-blue-400 hover:underline">
              elnurmirzey@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  )
}
