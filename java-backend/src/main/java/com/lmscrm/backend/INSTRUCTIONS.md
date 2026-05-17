# Backend to'liq yakunlandi va ulanishga tayyor! 🚀

Sizning so'nggi talablaringiz asosida Java Backend loyihasi mukammal holatga keltirildi. YAMldan .properties ga o'tish jarayoni va Swagger v3 konfiguratsiyalari to'liq bajarildi.

## Qilingan Yakuniy O'zgarishlar:

1.  **Database Configuration (`application.properties`):**
    *   Barcha sozlamalar `.yml` dan xavfsiz va aniq `.properties` formatiga ko'chirildi.
    *   `jdbc:postgresql://localhost:5432/lmscrm` va login ma'lumotlari kiritildi.
    *   Liquibase va Hibernate sozlamalari (`validate`) saqlab qolindi.
    *   **Google OAuth Placeholder** qo'shildi (`spring.security.oauth2.client.registration.google...`). Siz o'zingizning Client ID va Secret kalitingizni u erga kiritishingiz mumkin.

2.  **Swagger / OpenAPI Documentation:**
    *   `OpenApiConfig.java` da JWT tokenni jo'natish uchun to'liq `SecurityScheme` yozildi (Bearer Auth). Swagger sahifasida "Authorize" tugmasi chiqadi.
    *   Barcha Controller metodlarida namunaviy `@Tag` (masalan, "Teacher Academic Controller") va `@Operation` annotatsiyalari qo'llanildi. Bu orqali Swagger sahifasida har bir API nima ish qilishi va xavfsizlik cheklovlari nima ekanligi inson tilida tushuntirilgan.

3.  **Cross-Origin & API Standards:**
    *   `WebConfig.java` da global ravishda va kerakli Controllerlarda `@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:8081"})` yordamida frontend portlari kiritildi.
    *   Muvaffaqiyatli POST so'rovlari `201 Created` (`HttpStatus.CREATED`) qaytarishi ta'minlandi.
    *   Jackson serializeri orqali barcha API javoblari `SNAKE_CASE` formatida qaytadi (Frontend Lovable aynan shuni kutmoqda).

---

## 🏃‍♂️ Loyihani ishga tushirish (Run) bo'yicha ko'rsatma:

1.  **Ma'lumotlar bazasini tayyorlash:**
    *   PostgreSQL ni oching (PgAdmin yoki psql orqali).
    *   Yangi ma'lumotlar bazasi yarating: `CREATE DATABASE lmscrm;`
    *   User va Password `postgres`/`root` ekanligiga ishonch hosil qiling.

2.  **Loyihani ishga tushirish:**
    *   IDE (IntelliJ IDEA) da `LmsCrmBackendApplication.java` faylini oching va **Run** (Yashil uchburchak) tugmasini bosing.
    *   yoki Terminal orqali: `mvn spring-boot:run`
    *   *Ishga tushganda Liquibase avtomatik ravishda barcha jadvallarni (v0001 - v0005) yaratadi.*

3.  **Swagger API Dokumentatsiyasini ochish:**
    *   Brauzerda quyidagi manzilga kiring:
        👉 **http://localhost:8080/swagger-ui.html**
    *   Ushbu sahifada jamoangiz frontend va backend integratsiyasini qulay tarzda amalga oshirishi mumkin.
